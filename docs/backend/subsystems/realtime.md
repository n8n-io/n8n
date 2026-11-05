---
title: Realtime and collaboration
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
---

# Realtime and collaboration

Read this when you touch the push channel beyond execution events, collaborator presence, or the write lock. Also read it for the chat WebSocket or the CRDT package.

## What it is

- **Push** is the channel from the server to the browser. One authenticated endpoint carries execution progress, collaboration events, and module notifications to every open editor tab, over WebSocket or Server-Sent Events (SSE).
- **Collaboration** sits on top of push. It tracks which users have a workflow or an agent open, and which tab holds the **write lock**. Its state is in the cache service.
- **Chat** is a separate WebSocket server on `/chat`. It lets the Chat Trigger widget resume a waiting execution and receive replies.
- `@n8n/crdt` is a Yjs-based package for future collaborative editing. No other package imports it.

## Why it has this shape

- **Collaboration needs WebSocket.** Only WebSocket carries messages from the client. With SSE, the server logs that collaboration features are disabled and does not start them.
- **Presence is per instance.** `Push.sendToUsers` sends only to the connections on the current main and does not relay over pubsub. In multi-main, collaboration delivery is therefore best effort. Viewers on other mains catch up when they refetch on focus.
- **A lock with a short life.** The write lock has a time to live of two minutes, and only the holder's heartbeat renews it. A tab that closes without a release therefore cannot block a workflow for long. Collaborators expire after 15 minutes without activity.
- **The REST side checks the lock.** The mutating workflow routes call `validateWriteLock` with the tab's push reference. The check fails with 409 for the same user in another tab, and with 423 for another user.
- **Chat also runs on webhook processes.** `ChatServer` attaches to the webhook server as well as to the main server. Sessions use a resume token, and a heartbeat cancels abandoned executions.

## Where it lives

| Part | File | Symbol |
|---|---|---|
| Push entry point | `packages/cli/src/push/index.ts` | `Push.sendToUsers` |
| WebSocket backend | `packages/cli/src/push/websocket.push.ts` | `WebSocketPush` |
| Push message types | `packages/@n8n/api-types/src/push/index.ts` | `PushMessage` |
| Collaboration start and lock check | `packages/cli/src/collaboration/collaboration.service.ts` | `CollaborationService.validateWriteLock` |
| Presence and lock state | `packages/cli/src/collaboration/collaboration.state.ts` | `writeLockTtl` |
| Client messages | `packages/cli/src/collaboration/collaboration.message.ts` | `agentOpenedMessageSchema` |
| Lock checks on routes | `packages/cli/src/workflows/workflows.controller.ts` | `validateWriteLock` |
| Collaboration wiring | `packages/cli/src/server.ts` | `isBidirectional` |
| Chat WebSocket | `packages/cli/src/chat/chat-server.ts` | `ChatServer` |
| Configuration | `packages/@n8n/config/src/configs/collaboration.config.ts` | `N8N_COLLABORATION_CRDT` |

`N8N_PUSH_BACKEND` selects `websocket` or `sse`.

## What is moving

Collaboration covers agents as well as workflows. The CRDT `server` mode in the configuration names a server-backed sync service that does not exist in the repository yet.

## Read more

- `packages/@n8n/crdt/README.md`
- [Webhooks, push, and concurrency](webhooks-push-and-concurrency.md) for the push channel itself
- [Manual executions](manual-executions.md) for execution events on the same channel
