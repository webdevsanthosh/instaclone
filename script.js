const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const starterPosts = [
  {id:1,user:"travel.with.avi",location:"Ooty, Tamil Nadu",avatar:"A",color:"#d6b8a0",image:"https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1000&q=85",caption:"A little fresh air, a little peace, and a view worth remembering 🌿",likes:1284,liked:false,comments:[{user:"meera.jpg",text:"Beautiful view!"},{user:"arjun_07",text:"Need a trip here 😍"}],time:"2 hours ago"},
  {id:2,user:"coffee.and.code",location:"Cozy corner ☕",avatar:"C",color:"#c49a79",image:"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=85",caption:"Debugging powered by coffee. What are you building today? 💻",likes:342,liked:false,comments:[{user:"pixel.pavi",text:"That looks so good ☕"}],time:"4 hours ago"},
  {id:3,user:"framebyframe",location:"Golden hour",avatar:"F",color:"#e8c77a",image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85",caption:"Collect moments, not things. ✨",likes:892,liked:false,comments:[],time:"1 day ago"}
];
const starterReels = [
  {id:"starter-flower",user:"nature.loop",caption:"A little color for your day 🌸",videoUrl:"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",likes:842,liked:false,comments:[]},
  {id:"starter-garden",user:"slow.moments",caption:"Take a breath and enjoy the moment 🌿",videoUrl:"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",likes:326,liked:false,comments:[]}
];
const starterStories = [
  ["Your story","S","#e8c0a4"],["avi.travels","A","#d6b8a0"],["meera.jpg","M","#d9a4bc"],["arjun_07","A","#9cc8bd"],["pixel.pavi","P","#c7b1e5"],["coffee.code","C","#c49a79"],["nithya.art","N","#e8c77a"]
];
const starterSuggestions = [
  {user:"meera.jpg",name:"Meera",letter:"M",color:"#d9a4bc"},
  {user:"pixel.pavi",name:"Suggested for you",letter:"P",color:"#c7b1e5"},
  {user:"arjun_07",name:"Follows you",letter:"A",color:"#9cc8bd"},
  {user:"nithya.art",name:"Suggested for you",letter:"N",color:"#e8c77a"}
];
function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error(`Unable to read ${key} from local storage.`, error);
    return fallback;
  }
}
let posts = readStorage("instalite_posts", starterPosts);
let reels = readStorage("instalite_reels", starterReels);
let profile = readStorage("instalite_profile", {username:"santhosh.dev",name:"Santhosh",bio:"Building ideas, one line of code at a time ✨"});
let savedPosts = readStorage("instalite_saved", []);
let following = readStorage("instalite_following", []);
let activity = readStorage("instalite_activity", []);
let messages = readStorage("instalite_messages", {});
let selectedConversation = "";
let selectedImage = "";
let activeStory = 0;
let toastTimer;
let currentView = "home";
let expandedComments = new Set();
let selectedReelFile = null;
let reelPreviewUrl = "";
let reelDatabasePromise;
const reelObjectUrls = new Map();

function savePosts(){ localStorage.setItem("instalite_posts", JSON.stringify(posts)); }
function saveReels(){ localStorage.setItem("instalite_reels", JSON.stringify(reels)); }
function openReelDatabase(){
  if(!window.indexedDB)return Promise.reject(new Error("This browser does not support local video storage."));
  if(!reelDatabasePromise){
    reelDatabasePromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open("instalite-media",1);
      request.onupgradeneeded=()=>request.result.createObjectStore("reels");
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error("Could not open video storage."));
    });
  }
  return reelDatabasePromise;
}
async function storeReelVideo(key,file){
  const database=await openReelDatabase();
  return new Promise((resolve,reject)=>{
    const transaction=database.transaction("reels","readwrite");
    transaction.objectStore("reels").put(file,key);
    transaction.oncomplete=resolve;
    transaction.onerror=()=>reject(transaction.error||new Error("Could not save this video."));
    transaction.onabort=()=>reject(transaction.error||new Error("Video storage was cancelled."));
  });
}
async function readReelVideo(key){
  const database=await openReelDatabase();
  return new Promise((resolve,reject)=>{
    const request=database.transaction("reels","readonly").objectStore("reels").get(key);
    request.onsuccess=()=>resolve(request.result||null);
    request.onerror=()=>reject(request.error||new Error("Could not load a saved video."));
  });
}
async function deleteReelVideo(key){
  const database=await openReelDatabase();
  return new Promise((resolve,reject)=>{
    const transaction=database.transaction("reels","readwrite");
    transaction.objectStore("reels").delete(key);
    transaction.oncomplete=resolve;
    transaction.onerror=()=>reject(transaction.error||new Error("Could not remove the saved video."));
  });
}
function escapeHTML(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function avatar(letter,color,image){return `<span class="avatar" style="background:${escapeHTML(color||"#ead2c1")}">${image?`<img src="${escapeHTML(image)}" alt="">`:escapeHTML(letter||"?")}</span>`;}
function addActivity(text) {
  activity.unshift({id:Date.now()+Math.random(),text,time:"just now"});
  activity=activity.slice(0,30);
  localStorage.setItem("instalite_activity",JSON.stringify(activity));
}
function renderStories(){
  $("#stories").innerHTML = starterStories.map((story,i)=>`<button class="story" data-story="${i}" aria-label="View ${escapeHTML(story[0])}'s story"><span class="story-ring ${i===0?"seen":""}"><span class="story-letter" style="background:${story[2]}">${story[1]}</span></span>${escapeHTML(story[0])}</button>`).join("");
}
function renderSuggestions(){
  $("#suggestions").innerHTML = starterSuggestions.map(s=>`<div class="suggestion">${avatar(s.letter,s.color)}<div class="suggestion-info"><strong>${escapeHTML(s.user)}</strong><small>${escapeHTML(s.name)}</small></div><button class="text-button follow-btn" data-user="${escapeHTML(s.user)}">${following.includes(s.user)?"Following":"Follow"}</button></div>`).join("");
}
function renderProfile(){
  $("#sideUsername").textContent=profile.username;
  $("#sideName").textContent=`${profile.name} · Your profile`;
  $("#myAvatar").textContent=(profile.name||"S").charAt(0).toUpperCase();
  $("#sideName").title=profile.bio;
  $("#profilePageAvatar").textContent=(profile.name||"S").charAt(0).toUpperCase();
  $("#profilePageUsername").textContent=profile.username;
  $("#profilePageName").textContent=profile.name;
  $("#profilePageBio").textContent=profile.bio;
  renderGrid("#profileGrid",posts.filter(p=>p.user===profile.username));
}
function renderFeed(){
  $("#feed").innerHTML = posts.map(p=>`
    <article class="post" id="post-${p.id}" data-post="${p.id}">
      <header class="post-head">${avatar(p.avatar,p.color,p.userAvatar)}<div class="post-user"><strong>${escapeHTML(p.user)}</strong><small>${escapeHTML(p.location||"")}</small></div><button class="dots" aria-label="Post options" data-more="${p.id}">···</button></header>
      <img class="post-image" src="${escapeHTML(p.image)}" alt="Post by ${escapeHTML(p.user)}" loading="lazy" onerror="this.style.objectFit='contain';this.alt='Image could not be loaded'">
      <div class="post-actions"><button class="action like-action ${p.liked?"liked":""}" data-like="${p.id}" aria-label="${p.liked?"Unlike":"Like"} post">${p.liked?"♥":"♡"}</button><button class="action comment-focus" data-comment="${p.id}" aria-label="Comment">♧</button><button class="action share-action" data-share="${p.id}" aria-label="Share">➤</button><button class="action save-action ${savedPosts.includes(p.id)?"saved":""}" data-save="${p.id}" aria-label="${savedPosts.includes(p.id)?"Unsave":"Save"} post">${savedPosts.includes(p.id)?"▣":"♧"}</button></div>
      <div class="likes">${Number(p.likes).toLocaleString()} likes</div>
      <div class="caption"><strong>${escapeHTML(p.user)}</strong>${escapeHTML(p.caption||"")}</div>
      ${p.comments.length?`<div class="comments-list">${(expandedComments.has(p.id)?p.comments:p.comments.slice(-2)).map(c=>`<div class="comment-line"><strong>${escapeHTML(c.user)}</strong>${escapeHTML(c.text)}</div>`).join("")}</div>`:""}
      ${p.comments.length>2?`<button class="view-comments" data-show-comments="${p.id}">${expandedComments.has(p.id)?"Show fewer comments":`View all ${p.comments.length} comments`}</button>`:""}
      <button class="view-comments" data-comment="${p.id}">Add a comment...</button>
      <form class="comment-form" data-form="${p.id}"><input name="comment" placeholder="Add a comment..." maxlength="220" aria-label="Write a comment"><button type="submit">Post</button></form>
    </article>`).join("");
}
function renderReels(){
  reelObjectUrls.forEach(url=>URL.revokeObjectURL(url));
  reelObjectUrls.clear();
  $("#reelsFeed").innerHTML=reels.map(reel=>`
    <article class="reel-card" data-reel="${escapeHTML(reel.id)}">
      <div class="reel-video-wrap">
        <video class="reel-video" controls loop muted playsinline preload="metadata" ${reel.videoUrl?`src="${escapeHTML(reel.videoUrl)}"`:""} ${reel.videoKey?`data-video-key="${escapeHTML(reel.videoKey)}"`:""} aria-label="Reel by ${escapeHTML(reel.user)}"></video>
        <div class="reel-overlay"><strong>${escapeHTML(reel.user)}</strong><p>${escapeHTML(reel.caption||"")}</p></div>
      </div>
      <div class="reel-details">
        <button class="action reel-like ${reel.liked?"liked":""}" data-reel-like="${escapeHTML(reel.id)}" aria-label="${reel.liked?"Unlike":"Like"} reel">${reel.liked?"♥":"♡"}</button>
        <strong>${Number(reel.likes).toLocaleString()} likes</strong>
        ${reel.comments.length?`<div class="reel-comments">${reel.comments.slice(-2).map(comment=>`<p><strong>${escapeHTML(comment.user)}</strong> ${escapeHTML(comment.text)}</p>`).join("")}</div>`:""}
        <form class="reel-comment-form" data-reel-form="${escapeHTML(reel.id)}"><input name="comment" maxlength="220" placeholder="Add a comment..." aria-label="Comment on reel" required><button type="submit">Post</button></form>
      </div>
    </article>`).join("")||'<p class="empty-state">No reels yet. Create one to share a short video.</p>';
  reels.filter(reel=>reel.videoKey).forEach(async reel=>{
    try {
      const file=await readReelVideo(reel.videoKey);
      if(!file){console.error(`Saved reel video ${reel.id} was not found in browser storage.`);return;}
      const video=[...$$(".reel-video")].find(element=>element.dataset.videoKey===reel.videoKey);
      if(video){const url=URL.createObjectURL(file);reelObjectUrls.set(reel.id,url);video.src=url;video.load();}
    } catch(error) {
      console.error("Could not load a saved reel video.",error);
    }
  });
}
function renderGrid(selector,items){
  $(selector).innerHTML=items.map(p=>`<button class="grid-post" data-open-post="${p.id}" aria-label="Open post by ${escapeHTML(p.user)}"><img src="${escapeHTML(p.image)}" alt=""><span>♡ ${Number(p.likes).toLocaleString()} · ${p.comments.length} comments</span></button>`).join("")||'<p class="empty-state">Nothing to show yet.</p>';
}
function renderSearch(query=""){
  const term=query.trim().toLowerCase();
  const matches=term?posts.filter(p=>(p.user+" "+p.caption+" "+(p.location||"")).toLowerCase().includes(term)):[];
  $("#searchResults").innerHTML=term?(matches.length?matches.map(p=>`<button class="search-result" data-open-post="${p.id}">${avatar(p.avatar,p.color,p.userAvatar)}<span><strong>${escapeHTML(p.user)}</strong><small>${escapeHTML(p.caption)}</small></span></button>`).join(""):'<p class="empty-state">No posts found. Try another search.</p>'):'<p class="empty-state">Search usernames, captions, or locations.</p>';
}
function renderExplore(){renderGrid("#exploreGrid",[...posts].sort((a,b)=>b.id-a.id));}
function renderSaved(){renderGrid("#savedGrid",posts.filter(p=>savedPosts.includes(p.id)));}
function renderNotifications(){
  $("#notificationsList").innerHTML=activity.length?activity.map(a=>`<div class="activity-item"><span class="activity-icon">♡</span><span>${escapeHTML(a.text)}<small>${escapeHTML(a.time)}</small></span></div>`).join(""):'<p class="empty-state">You’re all caught up. Your likes and comments will appear here.</p>';
}
function renderConversationList(){
  $("#conversationList").innerHTML=starterSuggestions.map(s=>`<button class="conversation-contact ${selectedConversation===s.user?"selected":""}" data-conversation="${escapeHTML(s.user)}">${avatar(s.letter,s.color)}<span><strong>${escapeHTML(s.user)}</strong><small>${(messages[s.user]||[]).length?escapeHTML(messages[s.user].slice(-1)[0].text):"Start a conversation"}</small></span></button>`).join("");
}
function renderConversation(){
  if(!selectedConversation){$("#conversation").innerHTML='<div class="empty-state">Choose a conversation to start chatting.</div>';return;}
  const suggestion=starterSuggestions.find(s=>s.user===selectedConversation);
  const conversationMessages=messages[selectedConversation]||[];
  $("#conversation").innerHTML=`<div class="conversation-head">${avatar(suggestion.letter,suggestion.color)}<strong>${escapeHTML(selectedConversation)}</strong></div><div class="message-list">${conversationMessages.length?conversationMessages.map(m=>`<div class="message-bubble">${escapeHTML(m.text)}</div>`).join(""):'<p class="empty-state">Say hello to start the conversation.</p>'}</div><form id="messageForm" class="message-form"><input name="message" maxlength="300" placeholder="Write a message..." aria-label="Write a message" required><button type="submit">Send</button></form>`;
  const list=$("#conversation .message-list");list.scrollTop=list.scrollHeight;
}
function renderMessages(){renderConversationList();renderConversation();}
function toast(message){
  const el=$("#toast"); el.textContent=message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2200);
}
function showView(view){
  currentView=view;
  const home=view==="home";
  $("#stories").parentElement.classList.toggle("hidden",!home);
  $("#feed").classList.toggle("hidden",!home);
  $(".end-note").classList.toggle("hidden",!home);
  $$(".page-view").forEach(section=>section.classList.toggle("hidden",section.id!==`${view}View`));
  $$("[data-view]").forEach(button=>button.classList.toggle("active",button.dataset.view===view));
  if(view==="explore")renderExplore();
  if(view==="reels")renderReels();
  if(view==="saved")renderSaved();
  if(view==="profile")renderProfile();
  if(view==="messages")renderMessages();
  if(view==="notifications")renderNotifications();
  if(view==="search"){$("#searchInput").focus();renderSearch($("#searchInput").value);}
  window.scrollTo({top:0,behavior:"smooth"});
}
function openCreate(){ $("#createModal").classList.remove("hidden"); }
function closeCreate(){ $("#createModal").classList.add("hidden"); $("#captionInput").value=""; $("#imageUrlInput").value=""; $("#imageInput").value=""; $("#imagePreview").classList.add("hidden"); selectedImage=""; }
function openProfile(){ $("#usernameInput").value=profile.username; $("#displayNameInput").value=profile.name; $("#bioInput").value=profile.bio; $("#profileModal").classList.remove("hidden"); }
function closeProfile(){ $("#profileModal").classList.add("hidden"); }
function openStory(index){
  activeStory=index;
  const story=starterStories[activeStory];
  const storyPost=posts.find(p=>p.user===story[0]||p.user.startsWith(story[0].split(".")[0]));
  $("#storyContent").innerHTML=`<div class="story-viewer" style="background:${story[2]}">${storyPost?`<img src="${escapeHTML(storyPost.image)}" alt="Story by ${escapeHTML(story[0])}">`:`<div class="story-placeholder">${escapeHTML(story[0])}<small>Story preview</small></div>`}<strong>${escapeHTML(story[0])}</strong></div>`;
  $("#storyModal").classList.remove("hidden");
}
function clearReelPreview(){
  if(reelPreviewUrl)URL.revokeObjectURL(reelPreviewUrl);
  reelPreviewUrl="";
  selectedReelFile=null;
  $("#reelPreview").removeAttribute("src");
  $("#reelPreview").classList.add("hidden");
}
function closeReelCreate(){
  $("#reelModal").classList.add("hidden");
  $("#reelInput").value="";
  $("#reelUrlInput").value="";
  $("#reelCaptionInput").value="";
  clearReelPreview();
}

$("#feed").addEventListener("click",async e=>{
  const like=e.target.closest("[data-like]");
  if(like){const p=posts.find(x=>x.id===Number(like.dataset.like));if(p){p.liked=!p.liked;p.likes=Math.max(0,p.likes+(p.liked?1:-1));if(p.liked)addActivity(`You liked ${p.user}’s post.`);savePosts();renderFeed();}return;}
  const comment=e.target.closest("[data-comment]");
  if(comment){$(`[data-form="${comment.dataset.comment}"] input`).focus();return;}
  const showComments=e.target.closest("[data-show-comments]");
  if(showComments){const id=Number(showComments.dataset.showComments);expandedComments.has(id)?expandedComments.delete(id):expandedComments.add(id);renderFeed();return;}
  const share=e.target.closest("[data-share]");
  if(share){
    const p=posts.find(x=>x.id===Number(share.dataset.share));
    try { if(navigator.share) await navigator.share({title:`Post by ${p.user}`,text:p.caption,url:location.href}); else { await navigator.clipboard.writeText(location.href);toast("Link copied to clipboard."); } }
    catch(error){if(error.name!=="AbortError")toast("Could not share this post from this browser.");}
    return;
  }
  const save=e.target.closest("[data-save]");
  if(save){const id=Number(save.dataset.save);savedPosts=savedPosts.includes(id)?savedPosts.filter(savedId=>savedId!==id):[...savedPosts,id];localStorage.setItem("instalite_saved",JSON.stringify(savedPosts));renderFeed();toast(savedPosts.includes(id)?"Post saved.":"Post removed from saved.");return;}
  const more=e.target.closest("[data-more]");
  if(more){const p=posts.find(x=>x.id===Number(more.dataset.more));if(p&&p.user===profile.username){if(confirm("Delete this post?")){posts=posts.filter(item=>item.id!==p.id);savePosts();renderFeed();renderProfile();toast("Post deleted.");}}else toast("You can only delete your own posts.");}
});
$("#feed").addEventListener("submit",e=>{
  const form=e.target.closest(".comment-form");if(!form)return;e.preventDefault();
  const text=form.elements.comment.value.trim();if(!text)return;
  const p=posts.find(x=>x.id===Number(form.dataset.form));
  if(p){p.comments.push({user:profile.username,text});addActivity(`You commented on ${p.user}’s post.`);savePosts();renderFeed();toast("Comment added!");}
});
$("#feed").addEventListener("dblclick",e=>{if(!e.target.matches(".post-image"))return;const post=e.target.closest("[data-post]");const like=posts.find(p=>p.id===Number(post.dataset.post));if(like&&!like.liked){like.liked=true;like.likes++;addActivity(`You liked ${like.user}’s post.`);savePosts();renderFeed();}});
$("#stories").addEventListener("click",e=>{const story=e.target.closest("[data-story]");if(story)openStory(Number(story.dataset.story));});
$("#closeStory").addEventListener("click",()=>$("#storyModal").classList.add("hidden"));
$("#nextStory").addEventListener("click",()=>openStory((activeStory+1)%starterStories.length));
$("#storyModal").addEventListener("click",e=>{if(e.target.id==="storyModal")$("#storyModal").classList.add("hidden");});
$("#reelsFeed").addEventListener("click",e=>{
  const button=e.target.closest("[data-reel-like]");
  if(!button)return;
  const reel=reels.find(item=>item.id===button.dataset.reelLike);
  if(!reel)return;
  reel.liked=!reel.liked;
  reel.likes=Math.max(0,reel.likes+(reel.liked?1:-1));
  try{saveReels();}catch(error){console.error("Could not save reel likes.",error);toast("Could not save this change in browser storage.");return;}
  renderReels();
});
$("#reelsFeed").addEventListener("submit",e=>{
  const form=e.target.closest("[data-reel-form]");
  if(!form)return;
  e.preventDefault();
  const text=form.elements.comment.value.trim();
  if(!text)return;
  const reel=reels.find(item=>item.id===form.dataset.reelForm);
  if(!reel)return;
  reel.comments.push({user:profile.username,text});
  try{saveReels();}catch(error){reel.comments.pop();console.error("Could not save the reel comment.",error);toast("Could not save your comment.");return;}
  renderReels();
});
$("#openReelCreate").addEventListener("click",()=>$("#reelModal").classList.remove("hidden"));
$("#closeReelCreate").addEventListener("click",closeReelCreate);
$("#reelModal").addEventListener("click",e=>{if(e.target.id==="reelModal")closeReelCreate();});
$("#reelInput").addEventListener("change",e=>{
  const file=e.target.files[0];
  if(!file)return;
  if(!file.type.startsWith("video/")){toast("Please choose a video file.");e.target.value="";return;}
  if(file.size>100*1024*1024){toast("Please choose a video smaller than 100 MB.");e.target.value="";return;}
  clearReelPreview();
  selectedReelFile=file;
  $("#reelUrlInput").value="";
  reelPreviewUrl=URL.createObjectURL(file);
  $("#reelPreview").src=reelPreviewUrl;
  $("#reelPreview").classList.remove("hidden");
});
$("#reelUrlInput").addEventListener("input",()=>{
  if(selectedReelFile){$("#reelInput").value="";clearReelPreview();}
});
$("#publishReel").addEventListener("click",async()=>{
  const videoUrl=$("#reelUrlInput").value.trim();
  if(!selectedReelFile&&!videoUrl){toast("Choose a video or paste a video URL first.");return;}
  if(!selectedReelFile){
    try{const parsedUrl=new URL(videoUrl);if(!["http:","https:"].includes(parsedUrl.protocol))throw new Error();}
    catch{toast("Please enter a valid HTTP or HTTPS video URL.");return;}
  }
  const id=`reel-${Date.now()}`;
  let videoKey="";
  try{
    if(selectedReelFile){videoKey=id;await storeReelVideo(videoKey,selectedReelFile);}
    const previousReels=reels;
    reels=[{id,user:profile.username,caption:$("#reelCaptionInput").value.trim(),videoUrl:selectedReelFile?"":videoUrl,videoKey,likes:0,liked:false,comments:[]},...reels];
    try{saveReels();}
    catch(error){reels=previousReels;if(videoKey)await deleteReelVideo(videoKey);throw error;}
    closeReelCreate();
    showView("reels");
    toast("Your reel was shared!");
  }catch(error){
    console.error("Could not publish reel.",error);
    toast(error.message||"Could not save this reel. Check browser storage and try again.");
  }
});
$("#suggestions").addEventListener("click",e=>{const button=e.target.closest(".follow-btn");if(!button)return;const user=button.dataset.user;following=following.includes(user)?following.filter(item=>item!==user):[...following,user];localStorage.setItem("instalite_following",JSON.stringify(following));renderSuggestions();});
$("#openCreate").addEventListener("click",openCreate);$("#mobileCreate").addEventListener("click",openCreate);$("#mobileCreateBottom").addEventListener("click",openCreate);
$("#closeCreate").addEventListener("click",closeCreate);
$("#createModal").addEventListener("click",e=>{if(e.target.id==="createModal")closeCreate();});
$("#imageInput").addEventListener("change",e=>{const file=e.target.files[0];if(!file)return;if(!file.type.startsWith("image/")){toast("Please choose an image file.");return;}const reader=new FileReader();reader.onload=()=>{selectedImage=reader.result;$("#imagePreview").src=selectedImage;$("#imagePreview").classList.remove("hidden");};reader.onerror=()=>toast("Could not read the selected image.");reader.readAsDataURL(file);});
$("#publishPost").addEventListener("click",()=>{
  const url=$("#imageUrlInput").value.trim();const image=selectedImage||url;
  if(!image){toast("Choose a photo or paste an image URL first.");return;}
  if(url&&!selectedImage&&!/^https?:\/\//i.test(url)){toast("Please enter a valid image URL.");return;}
  const post={id:Date.now(),user:profile.username,location:"Shared just now",avatar:(profile.name||"S")[0].toUpperCase(),color:"#e8c0a4",image,caption:$("#captionInput").value.trim(),likes:0,liked:false,comments:[],time:"just now"};
  posts.unshift(post);
  try{savePosts();}catch(error){posts.shift();toast("Could not save this post. Try a smaller image or clear browser storage.");return;}
  addActivity("You shared a new post.");renderFeed();closeCreate();showView("home");toast("Your post was shared!");
});
$("#editProfile").addEventListener("click",openProfile);$("#myAvatar").addEventListener("click",openProfile);$("#profilePageEdit").addEventListener("click",openProfile);
$("#closeProfile").addEventListener("click",closeProfile);
$("#profileModal").addEventListener("click",e=>{if(e.target.id==="profileModal")closeProfile();});
$("#saveProfile").addEventListener("click",()=>{
  const username=$("#usernameInput").value.trim().replace(/\s+/g,"").replace(/^@/,"");const name=$("#displayNameInput").value.trim();
  if(!username||!name){toast("Username and display name are required.");return;}
  const previousUsername=profile.username;
  profile={username,name,bio:$("#bioInput").value.trim()};
  localStorage.setItem("instalite_profile",JSON.stringify(profile));
  posts.forEach(p=>{if(p.user===previousUsername)p.user=profile.username;});
  savePosts();renderProfile();renderFeed();closeProfile();toast("Profile updated!");
});
$("#refreshSuggestions").addEventListener("click",()=>{renderSuggestions();toast("Suggestions refreshed.");});
$("#aboutBtn").addEventListener("click",()=>toast("InstaLite is a local-only demo. Your content stays in this browser."));
$("#searchInput").addEventListener("input",e=>renderSearch(e.target.value));
$("#searchResults").addEventListener("click",e=>{const result=e.target.closest("[data-open-post]");if(result)openPost(Number(result.dataset.openPost));});
$("#exploreGrid").addEventListener("click",e=>{const result=e.target.closest("[data-open-post]");if(result)openPost(Number(result.dataset.openPost));});
$("#savedGrid").addEventListener("click",e=>{const result=e.target.closest("[data-open-post]");if(result)openPost(Number(result.dataset.openPost));});
$("#profileGrid").addEventListener("click",e=>{const result=e.target.closest("[data-open-post]");if(result)openPost(Number(result.dataset.openPost));});
function openPost(id){showView("home");requestAnimationFrame(()=>$(`#post-${id}`)?.scrollIntoView({behavior:"smooth",block:"center"}));}
$("#conversationList").addEventListener("click",e=>{const contact=e.target.closest("[data-conversation]");if(!contact)return;selectedConversation=contact.dataset.conversation;renderMessages();});
$("#conversation").addEventListener("submit",e=>{if(e.target.id!=="messageForm")return;e.preventDefault();const text=e.target.elements.message.value.trim();if(!text)return;messages[selectedConversation]=messages[selectedConversation]||[];messages[selectedConversation].push({text,time:Date.now()});localStorage.setItem("instalite_messages",JSON.stringify(messages));renderMessages();});
$$("[data-view]").forEach(button=>button.addEventListener("click",()=>showView(button.dataset.view)));
renderStories();renderSuggestions();renderProfile();renderFeed();renderNotifications();renderSearch();renderReels();
