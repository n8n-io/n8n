---
title: Realtime and collaboration
audience: Backend engineers new to n8n
tier: 3
reading_time: 6 min
last_reviewed: 2026-09-02
owner: "@n8n-io/catalysts"
---

# Realtime and collaboration

Read this when you touch the push channel beyond execution events, collaborator presence and the write lock, the chat trigger's WebSocket, or the CRDT package.

## What it is

**Push** is the server-to-browser channel, one authenticated endpoint that carries execution progress, collaboration events, and module notifications to every open editor tab over WebSocket or Server-Sent Events. **Collaboration** sits on top of push and tracks which users have a workflow open and which tab holds the **write lock**, with state in the cache service. **Chat** is a separate WebSocket server on `/chat` that lets the Chat Trigger widget resume a waiting execution and receive replies. `@n8n/crdt` is a Yjs-based abstraction meant for future collaborative editing. Today it has no runtime consumer.

## How it works

**Push** is described in [Webhooks, push, and concurrency](webhooks-push-and-concurrency.md). Two facts matter here. Inbound client messages exist only on WebSocket. `Push.sendToUsers` does not relay over pubsub, only `Push.send` to a specific session does. Collaboration delivery is therefore best effort and per instance, and cross-main viewers heal by refetching on focus.

**Collaboration.** `CollaborationService.init()` subscribes to client messages and parses each with a zod union: workflow opened, workflow closed, write access requested, released, and a heartbeat. An access check gates every handler. `CollaborationState` stores collaborators in a cache hash per workflow with a 15 minute inactivity expiry, and the write lock under its own key with a two minute time to live that only the holder's heartbeat renews. Outbound events include collaborators changed, write access acquired and released, workflow updated, and review state changed. On the REST side, the workflow controller's update, delete, archive, unarchive, activate, and deactivate routes call `validateWriteLock` with the `push-ref` header, which throws 409 for the same user in another tab and 423 for another user. A route exposes the lock so that a refreshed tab can restore read-only mode. The server initializes collaboration only when push is bidirectional. With SSE it logs that collaboration features are disabled.

**Chat.** `ChatServer` attaches a WebSocket server to upgrade requests whose path starts with `/chat` and hands the request into Express so that `ChatService` can start a session. Sessions are keyed by session and execution id, checked against a resume token, and polled every three seconds. A waiting execution resumes through an execution manager that refuses nodes not driven by chat. A heartbeat with a timeout cancels abandoned executions. The chat server also runs on the webhook process.

**CRDT.** `@n8n/crdt` exports a provider factory, document types, a sync provider, transports for WebSocket, message port, broadcast channel, and worker, awareness, an undo manager, and a binary protocol. A configuration value, `N8N_COLLABORATION_CRDT`, reaches the frontend as a setting. No other package depends on the CRDT package, and nothing in the server imports it.

## Where to look

| Path | What |
|---|---|
| `packages/cli/src/push/index.ts`, `abstract.push.ts`, `websocket.push.ts`, `sse.push.ts` | The channel |
| `packages/@n8n/api-types/src/push/` | Message types, including collaboration |
| `packages/cli/src/collaboration/collaboration.service.ts`, `collaboration.state.ts`, `collaboration.message.ts` | Presence and the write lock |
| `packages/cli/src/workflows/workflows.controller.ts` | Write lock validation on mutating routes |
| `packages/cli/src/chat/chat-server.ts`, `chat-service.ts`, `chat-execution-manager.ts` | The chat WebSocket |
| `packages/@n8n/crdt/` | The CRDT abstraction |
| `packages/@n8n/config/src/configs/collaboration.config.ts`, `chat-trigger.config.ts` | Configuration |

## What it owns

No tables. Collaboration state lives in the cache under `collaboration:<workflowId>` and `collaboration:write-lock:<workflowId>`. Chat reads and updates executions through the executions domain.

## Flags

`N8N_PUSH_BACKEND` is `websocket` or `sse`. `N8N_COLLABORATION_CRDT` is `off`, `local`, or `server`, default `off`. `N8N_DISABLE_PUBLIC_CHAT_TRIGGER`. No license flags.

## Per mode

Collaboration requires WebSocket push. In multi-main, presence is per instance. The chat server runs on mains and webhook processes. No cloud branch in code.

## Was, is, goes

**Was.** Push was SSE only. Two-way traffic arrived with WebSocket, then avatars for users on the same workflow. Collaboration moved from per-user to per-tab state in 2026, and the state parser still discards the old format. **Is.** The write lock underpins autosave, MCP tools, settings broadcasts, and review state. **Goes.** The CRDT `server` mode promises a Yjs-backed sync server that does not exist in the repository yet. The package README lists text and counter types as not yet implemented.

## Terms

- **pushRef**: the browser tab's session id.
- **write lock**: the single tab allowed to save a workflow, renewed by heartbeat, expiring after two minutes.
- **collaborator**: a user with the workflow open, tracked per tab.
- **CRDT**: a conflict-free replicated data type, the basis for future live co-editing.

## Read more

- `packages/@n8n/crdt/README.md`
- [Webhooks, push, and concurrency](webhooks-push-and-concurrency.md)
- [Manual executions](manual-executions.md) for execution events on the same channel
