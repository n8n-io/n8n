---
name: youtube
hosts: www.googleapis.com
path_prefixes: /youtube/v3, /upload/youtube/v3
passthrough_hosts: oauth2.googleapis.com
read_paths:
---
Service: YouTube Data API v3 (www.googleapis.com/youtube/v3). The upload paths are under /upload/youtube/v3.

Calls are HTTP requests. The tool name tells the kind: "read_list_search" (GET), "read_list_videos", "write_post_playlists" and so on. The args are {path, query, body}. Every real read is a GET, so read_paths is empty. A POST, PUT or DELETE is always a write, also "videos/rate".

Quota risk: every real read costs quota units of the Google project of the credential (a daily limit, 10000 units by default). A list, a get and a lookup cost 1 unit each. A search costs 100 units. A hydration can read more than once. This guard has no quota limit yet. Do not ask for a search in your own reads: use "videos", "playlists", "playlistItems" or "channels" reads, which cost 1 unit each. Never read for more objects than the call needs.

Real result shapes: a list is {kind, items: [...], nextPageToken, pageInfo}. A video has "id" (text), "snippet" {title, description, channelId, channelTitle, publishedAt, tags, categoryId}, "status" {privacyStatus} and "contentDetails". A search item has "id" {kind, videoId} (an object, not a text) and "snippet". A playlist has "id", "snippet" {title, description, channelId} and "status" {privacyStatus}. A playlist item has "id", "snippet" {playlistId, position, resourceId: {videoId}} and "contentDetails". A channel has "id", "snippet" {title, description} and "statistics".

World format, under "native.google_youtube" (the ids are the real ids):
- channels[]: {ref, id, title, description}
- videos[]: {ref, id, channel (channel ref), title, description, tags, categoryId, privacyStatus}
- playlists[]: {ref, id, channel (channel ref), title, description, privacyStatus}
- items[]: {ref, id, playlist (playlist ref), video (video ref), position}
The gym accepts the real id of a channel, a video, a playlist and a playlist item. Write it as the text of the real data, for example "$result.items[0].id" (a video or a playlist) or "$result.items[0].id.videoId" (a search item). Refs are names you choose, such as "video:<id>". Another object refers to a ref.
A search result shows only a few fields. Seed one video for each item, with its title, description and channel. Seed the channel of each video from "snippet.channelId", with the title from "snippet.channelTitle" when you have it. A list of playlist items gives a video id only: seed a video entry with that id and no other text, unless you have a read of the video.
Do not write "owner", "visibility" or "at": code sets the owner of every channel, video and playlist to the one account of the gym.

Writes: a playlist create, a playlist item add, a rating, a comment, a video update or a delete needs no seed unless it names an existing object (an "id" in the body or the query, a "playlistId" or a videoId in "snippet"). Then seed that object, and its parent, with the real id. For a playlist item add, seed the playlist and the video.

Open decisions (the safe default is written here):
- Video upload and banner upload are writes. The first request of an upload is a POST on /upload/youtube/v3/videos (a resumable upload). The bytes follow in a PUT to the address that the answer names. The gym only gets the first request, and the answer to the node has no upload address, so the upload fails in a preview chat. Nothing is sent to the real service.
- There is no quota limit in the guard. See "Quota risk" above.
