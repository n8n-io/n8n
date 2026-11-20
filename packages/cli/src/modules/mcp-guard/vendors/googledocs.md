---
name: googledocs
hosts: docs.googleapis.com
path_prefixes: /v1/documents
passthrough_hosts: oauth2.googleapis.com
read_paths:
---
Service: Google Docs API v1 (docs.googleapis.com/v1/documents). The Docs node also calls Google Drive on www.googleapis.com (a new document, the folder lists). The Drive vendor owns those paths, so they are not part of this vendor.

Scope of this vendor: plain text. The model of the gym is a document with text. Styles, tables, lists, headers, footers, images and named ranges are out of scope. See "Known gaps" below.

Calls are HTTP requests. The tool name tells the kind: "read_get_documents" (GET one document), "write_post_documents" (POST ":batchUpdate"). The args are {path, query, body}. Every real read is a GET. A POST is always a write. All reads of the node are GET, so read_paths is empty.

Real result shape: a document is {documentId, title, revisionId, body: {content: [...]}, ...}. The "body.content" is a tree of structural elements with indexes (paragraph, elements, textRun, table, sectionBreak). The model cannot copy it. Code adds one field to every real document, so that you can point at it:
- "plainText": the text of all paragraphs, tables included, without the last line break. It is cut at 20000 characters.
A Drive file has "id", "name" and "mimeType". Use "$result.plainText" for the text. Never rebuild the text from "body.content".

World format, under "native.google_drive" (a Google Doc is a Drive file in the gym):
- files[]: {ref, id, name, mimeType, content}
For one real document, seed one file:
{"ref": "doc:<id>", "id": "$result.documentId", "name": "$result.title", "mimeType": "application/vnd.google-apps.document", "content": "$result.plainText"}
The gym accepts the real document id. Write it with the pointer above, as the text of the real data. A ref is a name you choose: use "doc:<real id>", so the same document keeps one ref.
Write only these five fields. Do not write "folder", "parents", "owner", "permissions", "shared_drives" or "folders": code removes them, and the one account of the gym owns every file.

Writes: a ":batchUpdate" needs the document in the gym. Code reads the real document first, with a lookup that you are given ("$reads[0]"). Seed it as above. Do not apply the change of the write. A POST to /drive/v3/files (a new document) needs no seed. The gym makes its own id for a new document.

Known gaps (the safe default is written here):
- The gym holds the plain text of a document. A real document with styles, tables or images shows as text only, and the "body.content" of the gym answer has simple paragraphs. A request on a style, a table or an image can fail in the gym.
- A document that is longer than 20000 characters is cut. An insert at an index after the cut fails in the gym.
- All real ":batchUpdate" requests go only to the gym. Nothing reaches the real service.
