---
name: telegram
hosts: api.telegram.org
path_prefixes: /bot*, /file/bot*
passthrough_hosts:
read_paths:
- ^/bot[^/]+/(getMe|getChat|getChatAdministrators|getChatMember|getChatMemberCount|getFile)$
---
Service: Telegram Bot API (api.telegram.org/bot<token>/<method>).

Secret in the path: the real URL holds the bot token. Code removes it before you see anything. You see the path "/botguard-redacted/<method>". Never write a token. Code sets the real token for a real read, and the token of the gym tenant for the gym.

Calls are HTTP requests. The args are {method, path, query, body}. Almost every call is a POST with a JSON body, also the reads. The tool name tells the kind: "read_..." for the methods getMe, getChat, getChatAdministrators, getChatMember, getChatMemberCount and getFile, and "write_..." for every other method. getUpdates is a write: it takes updates away from the server when it has an offset, so it never reaches the real service. A file download (GET /file/bot<token>/<path>) is a read.

Real result shapes: every answer is {"ok": true, "result": ...}. getChat has result {id, type, title, username, first_name, last_name, description}. The type is "private", "group", "supergroup" or "channel". getChatMember has result {status, user: {id, is_bot, first_name, username}}. getChatAdministrators has a list of those. getChatMemberCount has a number. getFile has {file_id, file_path}.
A chat id can be a short number, a negative number, or "@username". Code does not check its length.

World format, under "native.telegram" and the top level "people":
- people[]: {ref, name, telegram: {username, first_name, last_name, started: true}}. A person without "telegram" is not a Telegram user and cannot be a member or a sender. A private chat with the bot is the chat of one person: write the person's ref as the "chat" of a message.
- native.telegram.chats[]: {ref, type ("group", "supergroup" or "channel"), title, username (without the @), description, members (person refs), owner, admins}. Seed a group or a channel only. A private chat is a person.
- native.telegram.messages[]: {ref, chat (a chat ref, or a person ref), from (a person ref), at, text}.
The Telegram gym makes its own ids for users and chats. Never write an "id", a "chat_id" or a "user_id". Code maps each real id to the id of the gym, by the ref. So the ref of a private chat person is "person:<real chat id>" (for example "person:8761991977"), and the ref of a group or channel is "chat:<real chat id>" (for example "chat:-1001234567890"). Write the real id word for word in the ref. Any other ref leaves the call with "chat not found". A chat with a "username" can be named as "@username", so seed the username when the real data has one.
Do not write "members" unless a real read gives you the people. Then declare each person in people[] first.
Leave out the bot: the gym has its own bot, and getMe answers from it.

Writes: a send, an edit, a delete or a pin needs no seed unless it names a chat. Then seed that chat as above. Messages cannot be read in the real service (the Bot API has no read of past messages), so never seed a message that you do not have as text in the call.

Decisions for the open questions:
- getUpdates is a write (the safe default).
- A send for real never reaches the real service. Only the gym answers it.
