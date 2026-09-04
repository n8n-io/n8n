---
title: Webhooks, push, and concurrency
audience: Backend engineers new to n8n
tier: 3
reading_time: 8 min
last_reviewed: 2026-09-02
owner: "@n8n-io/catalysts"
---

# Webhooks, push, and concurrency

Read this when you touch HTTP ingress for triggers, the server-to-browser channel, or the limit on concurrent production executions.

## What it is

The **webhooks** subsystem is HTTP ingress for triggers: production webhooks for published workflows, test webhooks for a builder listening in the editor, waiting webhooks and forms that resume a paused execution, fixed-URL handlers for Slack and Telegram interactions, and MCP endpoints. **Push** streams execution progress and other server events to editor sessions over WebSocket, the default, or Server-Sent Events, keyed by a push reference per browser tab. **Concurrency control** caps how many production or evaluation executions run at once on a main in regular mode, and queues the rest in memory.

## How it works

**Routing.** `AbstractServer` mounts one Express catch-all per endpoint before the body parser, so that nodes can read raw bodies. Each route wraps a manager that implements `IWebhookManager`: `LiveWebhooks`, `TestWebhooks`, `WaitingWebhooks`, or `WaitingForms`, plus the Slack and Telegram interaction handlers and the MCP route. `WebhookRequestHandler` checks the method, answers CORS preflight from the node's allowed origins, calls `executeWebhook`, and writes either the typed `WebhookResponse` or the legacy response object. [Life of a webhook execution](../life-of-a-webhook-execution.md) walks the production path.

**Lookup.** A static path hits the cache, then `webhook_entity` by path and method. A dynamic path with parameters is keyed by the node's webhook id as first segment plus the segment count. Registration is serialized by the table's primary key on path and method, which also works across processes.

**Response modes.** `onReceived` answers at once. `lastNode` waits for the execution and returns the last node's items. `responseNode` waits for a Respond to Webhook node. `streaming` writes chunks as nodes run. `formPage` and `hostedChat` render pages. `ActiveExecutions.setResponseMode` records the choice so that the runner knows whether to read full data back in queue mode.

**Push.** `Push` picks `WebSocketPush` or `SSEPush` from `N8N_PUSH_BACKEND`. The route `/rest/push` sits behind the auth middleware, and the client identifies its tab with a `pushRef` query parameter. `AbstractPush` keeps connections by push reference and users by push reference, pings every 60 seconds, and offers `sendToOne`, `sendToUsers`, and `sendToAll`. Execution hooks send node and execution events to the push reference that started the run. On a worker, or on a main that does not hold the session, `Push.send` relays over the `relay-execution-lifecycle-event` pubsub command, and the receiving main forwards only if it holds the session. Payloads above five megabytes of node data are dropped on the relay, and the editor fetches the data at the end instead. Inbound client messages exist only on WebSocket, which is why collaboration features require it.

**Concurrency.** `ConcurrencyControlService` builds one `ConcurrencyQueue` per type, production and evaluation, from `N8N_CONCURRENCY_PRODUCTION_LIMIT` and `N8N_CONCURRENCY_EVALUATION_LIMIT`. Minus one means unlimited for production. For evaluation, minus one defers to the license tier. `ActiveExecutions.add` reserves capacity after the execution row exists and releases it when the run ends. A throttled execution stays at status `new` with no start time, and its HTTP request stays open. The production queue applies to the `webhook`, `trigger`, and `chat` modes. Manual, retry, error, sub-workflow, internal, and CLI runs are never throttled. In queue mode the service is off, and the worker's own concurrency takes over.

## Where to look

| Path | What |
|---|---|
| `packages/cli/src/abstract-server.ts` | Route mounting order |
| `packages/cli/src/webhooks/webhook-request-handler.ts` | Method check, CORS, response writing |
| `packages/cli/src/webhooks/webhook.service.ts` | Lookup, cache, `storeWebhook` |
| `packages/cli/src/webhooks/live-webhooks.ts`, `test-webhooks.ts`, `waiting-webhooks.ts`, `waiting-forms.ts` | The four managers |
| `packages/cli/src/webhooks/webhook-helpers.ts` | `executeWebhook` and the response modes |
| `packages/cli/src/webhooks/webhook-server.ts` | The dedicated webhook process |
| `packages/cli/src/push/index.ts`, `abstract.push.ts`, `websocket.push.ts`, `sse.push.ts` | The push channel |
| `packages/@n8n/api-types/src/push/` | Every push message type |
| `packages/cli/src/concurrency/` | The control service, the queue, the capacity reservation |

## What it owns

`webhook_entity`, entity `packages/@n8n/db/src/entities/webhook-entity.ts`, keyed by path and method, with the workflow id, the node name, and for dynamic paths the webhook id and path length. Cache keys `webhook:<METHOD>-<path>` per static webhook and the hash `test-webhooks` for test registrations, in Redis in queue mode. Concurrency state is in memory only. Push owns no persistence.

## Flags

The endpoint names `N8N_ENDPOINT_WEBHOOK`, `N8N_ENDPOINT_WEBHOOK_TEST`, `N8N_ENDPOINT_WEBHOOK_WAIT`, and the form and MCP siblings. `N8N_DISABLE_PRODUCTION_MAIN_PROCESS` removes production routes from the main when webhook processes exist. `N8N_PAYLOAD_SIZE_MAX` (16 megabytes) and `N8N_FORMDATA_FILE_SIZE_MAX`. `N8N_PUSH_BACKEND` is `websocket` or `sse`. `N8N_CONCURRENCY_PRODUCTION_LIMIT` and `N8N_CONCURRENCY_EVALUATION_LIMIT`. Webhook and form metrics have their own `N8N_METRICS_INCLUDE_*` toggles. No license flags here. Multi-main relays depend on the multi-main license indirectly.

## Per mode

Only the main serves test webhooks. A webhook process serves production, waiting, and MCP routes, and its command in `commands/webhook.ts` refuses to start outside queue mode. Concurrency control is off in queue mode. Push relays through pubsub on workers and in multi-main. In multi-main, a main that receives a test webhook but does not hold the session tells the creator main to clean up through the `clear-test-webhooks` command.

## Was, is, goes

**Was.** Webhook code was spread across `cli` until 2024 moved it under `src/webhooks`. Push was SSE only until WebSocket arrived and became the default. Concurrency control arrived in 2024. **Is.** Two response shapes coexist, and the legacy one is marked deprecated. Recent work resolves webhook description fields without the expression isolate when they are static, and adds Slack and Telegram fixed-URL handlers. **Goes.** The remaining code paths move to the typed `WebhookResponse`. A `TODO` asks for CORS support on waiting webhooks. Cloud-specific reporting thresholds remain in the concurrency service.

## Terms

- **live webhook**: a production webhook of a published workflow, under `/webhook/`.
- **test webhook**: a temporary registration for a manual run, under `/webhook-test/`, expiring after two minutes.
- **waiting webhook and form**: the resume URLs for a paused execution.
- **static and dynamic path**: without or with `:param` segments. A dynamic path starts with the node's webhook id.
- **response mode**: when and by whom the HTTP response is written.
- **pushRef**: the browser tab's session id on the push channel.
- **relay**: the pubsub hop from the process that produced a push message to the main that holds the session.
- **capacity reservation**: a wrapper around throttle and release so that a slot is released exactly once.

## Read more

- [Life of a webhook execution](../life-of-a-webhook-execution.md)
- [Manual executions](manual-executions.md) for test webhooks and push
- [Realtime and collaboration](realtime.md) for what sits on top of push
- docs.n8n.io: webhook node, wait node, and concurrency control pages
