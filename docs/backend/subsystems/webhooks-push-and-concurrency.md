---
title: Webhooks, push, and concurrency
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
---

# Webhooks, push, and concurrency

Read this when you touch HTTP ingress for triggers, the server-to-browser channel, or the limit on concurrent production executions.

## What it is

The **webhooks** subsystem is HTTP ingress for triggers. It serves production webhooks for published workflows and test webhooks for a builder who listens in the editor. It also serves waiting webhooks and forms that resume a paused execution, fixed URLs for Slack and Telegram interactions, and MCP endpoints.

**Push** streams execution progress and other server events to editor sessions. It uses WebSocket by default, or Server-Sent Events. Each browser tab has its own push reference.

**Concurrency control** limits how many production or evaluation executions run at once on a main in regular mode. It queues the rest in memory.

## Why it has this shape

**Webhook routes come before the body parser.** `AbstractServer` mounts one Express catch-all for each endpoint before `bodyParser`. The Webhook node can then read raw and binary request bodies.

**One handler, several managers.** Each route wraps a manager that implements `IWebhookManager`: `LiveWebhooks`, `TestWebhooks`, `WaitingWebhooks`, or `WaitingForms`. `WebhookRequestHandler` checks the method, answers CORS preflight, calls `executeWebhook`, and writes the response. [Life of a webhook execution](../life-of-a-webhook-execution.md) walks the production path.

**Registration uses the database as a lock.** The `webhook_entity` primary key is path plus method. A second registration of the same path fails, also across processes. A dynamic path with `:param` segments starts with the node's webhook id, so that the lookup can find it by id and segment count.

**Response modes decide who answers.** `onReceived` answers at once. `lastNode` and `responseNode` wait for the execution. `streaming` writes chunks as nodes run. `ActiveExecutions.setResponseMode` records the choice so that the runner knows whether to read full data back in queue mode.

**Push relays through pubsub.** Only one main holds a given browser connection. A worker, or a main that does not hold it, relays the message with the `relay-execution-lifecycle-event` command. The main that holds the session forwards it. A `nodeExecuteAfterData` message larger than `MAX_PUBSUB_PAYLOAD_BYTES` is dropped on the relay.

**Only WebSocket carries client messages.** SSE is one-way. Features that need messages from the browser, such as collaboration, need WebSocket.

**Concurrency control is for regular mode only.** In queue mode the service is off, and worker concurrency limits the work. A throttled execution stays at status `new`, and its HTTP request stays open. The production limit applies to the `webhook`, `trigger`, and `chat` modes. Manual runs and sub-workflows are never throttled.

## Where it lives

| Part | File | Symbol |
|---|---|---|
| Route mounting | `packages/cli/src/abstract-server.ts` | `AbstractServer` |
| Request handling | `packages/cli/src/webhooks/webhook-request-handler.ts` | `WebhookRequestHandler` |
| Lookup and storage | `packages/cli/src/webhooks/webhook.service.ts` | `WebhookService.findWebhook` |
| Production webhooks | `packages/cli/src/webhooks/live-webhooks.ts` | `LiveWebhooks` |
| Running the workflow | `packages/cli/src/webhooks/webhook-helpers.ts` | `executeWebhook` |
| Webhook process server | `packages/cli/src/webhooks/webhook-server.ts` | `WebhookServer` |
| Push entry and relay | `packages/cli/src/push/index.ts` | `Push.send` |
| Push connections | `packages/cli/src/push/abstract.push.ts` | `AbstractPush.sendToOne` |
| Concurrency control | `packages/cli/src/concurrency/concurrency-control.service.ts` | `ConcurrencyControlService` |
| Capacity reservation | `packages/cli/src/active-executions.ts` | `ActiveExecutions.add` |

## What is moving

Two response shapes coexist. Code moves to the typed `WebhookResponse` in `packages/cli/src/webhooks/webhook-response.ts`. The legacy path, `WebhookRequestHandler.sendLegacyResponse`, is deprecated.

## Read more

- [Life of a webhook execution](../life-of-a-webhook-execution.md)
- [Manual executions](manual-executions.md) for test webhooks and push
- [Realtime and collaboration](realtime.md) for what sits on top of push
- [Scaling and multi-main](scaling-and-multi-main.md) for pubsub
- docs.n8n.io: webhook node, wait node, and concurrency control pages
