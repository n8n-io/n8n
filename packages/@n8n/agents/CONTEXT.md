# Agent Workspace Files

The remote Workspace that Product Agents and Instance AI use to read, write, and run code, and the files a user can retrieve from a Session.

## Language

**Product Agent**:
A first-class n8n agent a user chats with.
_Avoid_: AI Agent node, Chat Hub agent, workflow agent

**Instance AI**:
The in-editor assistant. User-facing name: AI Assistant.
_Avoid_: AI Assistant (in code and specs), builder agent

**Session**:
The durable conversation a user shares with a Product Agent or with Instance AI. Attachments and Output Files belong to a Session.
_Avoid_: thread (legacy table and route name), conversation

**Run**:
One agent pass over a Session, from a user message until success, error, or cancel. Durable Output File copies happen when a file is written. A reconcile runs when the Run ends.
_Avoid_: turn, execution

**Session Files**:
The Attachments and Output Files that belong to a Session. The user sees them in a Session Files panel and as chips on the messages that introduced them.
_Avoid_: artifacts, knowledge files, gallery

**Workspace**:
The remote filesystem and command environment an agent uses for a Session.
_Avoid_: sandbox (the provider under the Workspace), Computer Use filesystem, Code node task runner, isolated-vm

**Attachment**:
A file the user uploaded onto a chat message.
_Avoid_: Output File, Knowledge File, artifact

**Upload Directory**:
The well-known Session-private directory in the Workspace that holds this Session's Attachment Working Set. Runtimes read Attachments from here. This is the only code-input path for Attachments.
_Avoid_: Output Directory, knowledge mirror

**Working Set**:
The Attachments currently materialized in the Upload Directory. It can be smaller than all Attachments on the Session. Newer files win when the Workspace cap is hit.
_Avoid_: hydration set (that cap is for the model, not the Workspace)

**Output Directory**:
The well-known Session-private directory in the Workspace that holds Output Files. Sub-agents write here too. Created files outside it are not user-retrievable.
_Avoid_: artifacts folder, attachments folder, knowledge mirror, Upload Directory

**Output File**:
A file in the Output Directory. The user can see it and retrieve it on the Session. Type does not restrict retrievability.
_Avoid_: artifact, Attachment, Knowledge File, generated file, created file

**File Preview**:
An inline view of an Attachment or Output File. Only images, text, and PDF. Every other type is download-only.
_Avoid_: artifact viewer, inline HTML preview

**Scratch File**:
A Workspace file outside the Output Directory. The user never sees it.
_Avoid_: temp file (too narrow — scratch includes intermediate work, caches, and installs)

**Knowledge File**:
A file in a Product Agent's knowledge corpus. It is not a Session file.
_Avoid_: Attachment, Output File

**Runtime**:
A language environment the Workspace supports. This context has Shell, Python, and JavaScript.
_Avoid_: Code node sandbox, task runner, isolated-vm
