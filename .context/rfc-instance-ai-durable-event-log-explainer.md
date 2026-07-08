# The durable event log, explained simply

The non-technical companion to [rfc-instance-ai-durable-event-log.md](./rfc-instance-ai-durable-event-log.md).

## The 30-second version

**Today, the assistant does its work on a whiteboard.** While it works (thinking, running tools, building workflows), everything it does is noted in the server's short-term memory. When that whiteboard fills up, old notes get erased to make room. And when a response finishes, we take a *photo* of the whiteboard and file it away. That mostly works, but you can see the cracks: if the work was long, parts were already erased before the photo was taken; if the server restarts mid-task, the whiteboard is just wiped and work in progress vanishes; and refreshing your browser sometimes shows an incomplete picture.

**The proposal is to write in a notebook instead.** Every meaningful thing the assistant does (each completed thought, each action, each question it asks you) gets written down permanently, in ink, the moment it happens. Nothing is ever erased or rewritten; the screen simply re-reads the notebook. The photo becomes unnecessary.

## What changes for users

- Nothing the assistant did can silently disappear anymore.
- Reloading the page always shows the complete, true history.
- If a server restarts mid-task, work continues from the last written line, or honestly says "this was interrupted", instead of vanishing.
- It's the foundation for things like sharing a conversation with teammates: everyone reads the same notebook.

## What doesn't change

The assistant feels exactly as fast. The word-by-word typing you see is live performance; we don't archive every keystroke, just each finished sentence and action.

## The one-liner

> Right now the assistant's work lives in short-term memory and we photograph it at the end. We're moving it to a permanent journal written as it happens, so nothing gets lost when conversations run long, servers restart, or you reload the page.
