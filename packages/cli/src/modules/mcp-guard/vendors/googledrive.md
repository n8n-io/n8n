---
name: googledrive
hosts: www.googleapis.com
path_prefixes: /drive/v3, /upload/drive/v3
passthrough_hosts: oauth2.googleapis.com
read_paths:
---
Service: Google Drive API v3 (www.googleapis.com/drive/v3 and www.googleapis.com/upload/drive/v3).

Calls are HTTP requests. The tool name tells the kind: "read_..." (every GET) and "write_..." (every POST, PATCH, PUT and DELETE). The args are {path, query, body}. Code decides which calls are reads, not you. A write never reaches the real Drive. The Drive node has no POST that only reads.
File content is not copied. A real file download or export is read, but its bytes are not copied to the gym: seed only the metadata. An upload (multipart, media or resumable) goes only to the gym.
Not covered here: the Docs API (docs.googleapis.com). The guard refuses it with 403.

Real result shapes: a file has "id", "name", "mimeType", and, with the right "fields", "parents" (a list of folder ids), "createdTime", "modifiedTime", "trashed", "starred", "description" and "driveId". A list is {files: [...], nextPageToken}. A folder is a file with the mimeType "application/vnd.google-apps.folder". A shared drive is {id, name}. A list of shared drives is {drives: [...]}. Code adds two fields to every file:
- "worldRef": the ref to use for the file ("file:<id>", or "folder:<id>" for a folder).
- "parentRef": the ref of its first parent folder ("folder:<id>"), when it has one.
You may be given reads. For a call on a file, the first read is the file with all the fields above. The next reads are folders: the parents of the file, or the parents that the call names. Each folder read has "worldRef" and "parentRef" too.

World format, under "native.google_drive":
- folders[]: {ref, id, name, folder, at, modified}. Every object whose mimeType is the folder type goes here.
- files[]: {ref, id, name, mimeType, folder, at, modified, description, starred, trashed}. Every other object goes here, also a Google Doc, Sheet or Slide (keep its mimeType).
- shared_drives[]: {ref, id, name}.
Rules:
- "id": the real id ("$result.files[0].id", "$reads[0].id"). Never invent an id.
- "ref": "$result.files[0].worldRef" (the ref that code made).
- "folder": the "parentRef" of the object, when its parent folder is in the gym (you have a folder for it). Seed each parent folder in the same overlay, with its id and name. A folder that you cannot see: leave "folder" out.
- "at": "$...createdTime". "modified": "$...modifiedTime". "name": "$...name".
- Never write "owner", "shared_with", "permissions" or content ("content", "content_base64"): code removes them. The gym places each object in the one account that the call can read, and it has no copy of the bytes. A download then returns empty content.
- A list: seed every file of the list in one overlay, with "$result.files[n]." pointers, and the parent folders that you are given.

Calls and what they need:
- A read of one file or a list: seed the files of the answer.
- A write on a file (update, copy, move, delete, share, trash): the call names the file in its path. Seed that file with its real id from the read that you are given. For a move or a create under a folder, seed that folder too. Do not apply the change yourself.
- A create (folder or file) needs no seed unless its parent is a real folder. Then seed the parent folder.
- A write on a shared drive (get, update, delete): seed the shared drive with its real id and name.
