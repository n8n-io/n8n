---
name: gmail
hosts: www.googleapis.com, gmail.googleapis.com
path_prefixes: /gmail/v1
passthrough_hosts: oauth2.googleapis.com
read_paths:
---
Service: Gmail API v1 (www.googleapis.com/gmail/v1/users/me, and gmail.googleapis.com).

Calls are HTTP requests. The tool name tells the kind: "read_list_messages" (GET a list), "read_get_messages" (GET one message), "write_post_messages_send", and so on. The args are {path, query, body}. A GET list returns only ids ({messages: [{id, threadId}]}). A GET of one message returns headers, labels and the body.

Real result shapes: a message has "id", "threadId", "labelIds", "snippet", "internalDate" and "payload" (headers and body parts). Code adds these fields to every real message, so that you can point at them:
- "hdr": {from, to, cc, subject, messageId, inReplyTo, references}. Each is the text of that header.
- "decodedBody": the plain text of the body (the real body is base64 and cannot be copied).
- "isoDate": the date as an ISO 8601 text. "isRead": true or false.
A list result has no such fields. Use the reads that you are given for the messages ("$reads[n]").

World format, under "native.gmail":
- messages[]: {ref, from, to, cc, subject, body, at, labels, read, message_id, in_reply_to, references}
- labels[]: {name}. Declare a user label (type "user" in the real data) here before a message uses it.
The Gmail gym makes its own ids. Never write an "id" or "threadId". Refs are names you choose: use "message:<real id>", so the same message keeps one ref.
Do not write "account": code places every message in the one mailbox that the call can read. The people in "from" and "to" need no entry elsewhere: write their address as it is in the header.

For one real message, seed one entry, with pointers:
{"ref": "message:<id>", "from": "$result.hdr.from", "to": ["$result.hdr.to"], "subject": "$result.hdr.subject", "body": "$result.decodedBody", "at": "$result.isoDate", "labels": "$result.labelIds", "read": "$result.isRead", "message_id": "$result.hdr.messageId"}
A user label shows in "labelIds" as an id such as "Label_1", and the gym wants its name. System labels (INBOX, UNREAD, STARRED, SENT) are used as they are. For a message with a user label, write "labels" as a list: the system ids as text, and for each user label its name only when a read of the labels gives you that name, and declare the name in labels[]. When you have no name, leave that label out.
Leave out "cc", "in_reply_to" and "references" when the header is empty. For a list, seed one entry for each message that you have a read for, with "$reads[n]." in place of "$result.". A message in a thread: seed all messages of the thread you can see, and set "in_reply_to" and "references" from the headers, so the gym joins them.

Writes: a send, a draft, or a change of labels needs no seed unless it names an existing message or thread (a path with an id). Then seed that message, as above, with its real id as the ref.
