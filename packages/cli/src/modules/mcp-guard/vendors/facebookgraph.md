---
name: facebookgraph
hosts: graph.facebook.com, graph-video.facebook.com
path_prefixes: /v*
passthrough_hosts:
read_paths:
---
Service: Facebook Graph API (graph.facebook.com/v<version>, and graph-video.facebook.com for video uploads). The node sends an access token in the query ("access_token"). Code removes the token and the "appsecret_proof" before you see anything. Never write a token.

Policy. Code enforces it. You do not decide it.
- GET is a read: the real service answers first, then you copy the answer into the gym.
- Every POST and DELETE goes only to the gym. This includes a publish ("/<page>/feed"), a comment, a delete, and a batch (a POST to the root with a "batch" list that can mix reads and writes). No POST is a read.
- The same host serves the WhatsApp Cloud API. Paths such as "/<id>/messages" and "/<id>/message_templates" go to the WhatsApp vendor, not to this one.

Calls are HTTP requests. The tool name tells the kind: "read_get_me", "read_list_feed", "write_post_feed", and so on. The args are {method, path, query, body}. A path starts with a version ("/v23.0") and then the object or the edge.

Real result shapes: an object is {id, name, ...} with the fields that "fields" asked for. An edge is {data: [...], paging: {cursors, next}}. A page post has "id" ("<page id>_<post id>"), "message", "created_time", "from" and "permalink_url". "me" is the user of the token, or the Page for a Page token.

World format, under "native.facebook":
- pages[]: {ref, id, name, category, about, username, owner, fan_count, followers_count}
- posts[]: {ref, id, page, message, from, created_time}
- comments[]: {ref, id, parent, from, message, created_time}
- reactions[]: {ref, id, object, user, type}
- photos[]: {ref, id, page, post, name, created_time}
- videos[]: {ref, id, page, title, description, created_time}
The ids of Graph are long numbers. Write the real id as it is in "id", and use "page:<real id>", "post:<real id>", "comment:<real id>" as the ref. A post id has the page id before the underscore: seed the page first. "owner", "from" and "user" are person refs. The user of the token is the persona "person:me".
Never write an "access_token" or a "token". Do not invent posts, comments or counts that the real answer lacks. Set "created_time" from the real "created_time" (an ISO 8601 text). Leave out a field that the real answer does not show.

Writes: a publish, a comment, a like or a delete needs no seed unless its path names an existing object. Then seed that object (a page for "/<page>/feed", a post for "/<post>/comments"), as above, with its real id. A delete or an edit of an object that the gym made needs no seed.
