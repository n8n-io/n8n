---
name: outlook
hosts: graph.microsoft.com
path_prefixes: /v1.0
passthrough_hosts: login.microsoftonline.com
read_paths:
---
Service: Microsoft Graph v1.0 (graph.microsoft.com/v1.0), for mail, calendar and contacts. The sign-in host is login.microsoftonline.com. The node reaches the mailbox as "/me/..." or as "/users/<address>/...".

Policy. Code enforces it. You do not decide it.
- GET is a read: the real service answers first, then you copy the answer into the gym.
- Every POST, PATCH, PUT and DELETE goes only to the gym. This includes "$batch" (it can mix reads and writes), "sendMail", a draft, "send", "move", "reply", an update and a delete. No POST is a read.
- A token request on the sign-in host is not seen by the gym.
- A Graph host other than graph.microsoft.com (a national cloud) is refused.

Calls are HTTP requests. The tool name tells the kind: "read_list_messages" (GET a list), "read_get_messages" (GET one message), "write_post_sendMail", "write_post_messages_move", and so on. The args are {path, query, body}. A path has the "/v1.0/me" part and then the resource.

Real result shapes: a list is {"value": [...], "@odata.nextLink"}. A list of messages holds full messages, with the body, unless "$select" removes it. A message has "id", "subject", "bodyPreview", "body" ({contentType, content}), "from", "toRecipients", "ccRecipients", "receivedDateTime", "isRead", "isDraft", "parentFolderId", "categories", "importance", "flag", "conversationId". An id is a long text with "=", "-" and "_". Copy an id as it is.

Code adds these fields to every real message and event that has a body, so that you can point at them:
- "decodedBody": the plain text of the body, also when the real body is HTML.
- "fromAddress": the sender address as text. "toAddresses", "ccAddresses": lists of address text.
- "isoDate": the received time (message) or the start time (event) as an ISO 8601 text. An event also gets "duration" (such as "45m").
A "$select" that removes a field also removes the field that code adds from it.

World format, under "native.outlook":
- messages[]: {ref, from, to, cc, subject, html or text, at, read, folder, importance, flagged, categories}
- folders[]: {ref, name, parent}. Declare a folder that the user made here before a message uses it. The gym has the system folders (Inbox, Sent Items, Drafts, Deleted Items, Junk Email, Archive).
- contacts[]: {ref, name, email, company, phone, title}
- events[]: {ref, subject, at, duration, organizer, attendees, location, body}. Do not use the top-level "entities" list for an event: Google Calendar reads it too. Set "organizer" to "person:me", "at" to "$result.isoDate", "duration" to "$result.duration", "body" to "$result.decodedBody", and "attendees" to the addresses of the attendees. Use "event:<real id>" as the ref.
The Outlook gym makes its own ids. Never write an "id". Refs are names you choose: use "message:<real id>", "folder:<real id>", "contact:<real id>", so the same object keeps one ref.
Do not write "account": code places every object in the one mailbox that the call can read. The people in "from", "to" and "cc" need no entry elsewhere: write their address as it is.
The mailbox of the user is the persona "person:me". When "from" is the address of the user (a draft, a message in Sent Items, "isDraft" true), write "person:me" as "from". A mail dated after now is an error. Use "$result.isoDate" or "$result.receivedDateTime" as "at".

For one real message, seed one entry, with pointers:
{"ref": "message:<id>", "from": "$result.fromAddress", "to": "$result.toAddresses", "cc": "$result.ccAddresses", "subject": "$result.subject", "text": "$result.decodedBody", "at": "$result.isoDate", "read": "$result.isRead", "categories": "$result.categories"}
When the real body is HTML ("body.contentType" is "html"), write "html": "$result.body.content" in place of "text". Leave out "cc" and "categories" when they are empty. For a list, seed one entry for each message in "value", with "$result.value[n]." in place of "$result.". A message in a folder that the user made: seed the folder first, and set "folder" to its ref. You know the folder only by its id ("parentFolderId"). Put the message in a folder only when a read of the folders gives you its name. Otherwise leave "folder" out.

Writes: a send, a draft, a reply, a move or a delete needs no seed unless its path names an existing object (a path with an id). Then seed that object, as above, with its real id as the ref. For a move, seed the destination folder too, when a read gives you its name. Attachments: the gym has no copy of the bytes of a real attachment. Seed the attachment name only when you know it.
The gym has the default calendar ("isDefaultCalendar" true). Never seed it as a calendar: events with no "calendar" go into it. Seed a calendar only when "isDefaultCalendar" is false, and write its "name".
