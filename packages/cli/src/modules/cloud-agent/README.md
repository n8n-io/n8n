# cloud-agent module

The cloud-agent module proxies the n8n instance to the AI-SDK-based
workflow agent hosted in `ai-assistant-service`. This is the **n8n side**
of the cloud agent feature; for the cloud service side (the actual agent
loop, Daytona sandbox, skills), see
`ai-assistant-service/docs/architecture.md` in that repo.

## Disabled by default

```
N8N_CLOUD_AGENT_ENABLED=true        # required to activate the module
N8N_CLOUD_AGENT_BASE_URL=https://…  # optional; falls back to N8N_AI_ASSISTANT_BASE_URL
```

When disabled, the module's `init()` returns early, the controller never
registers, and `/rest/cloud-agent/*` 404s. The frontend nav entry also
checks `moduleSettings['cloud-agent']?.enabled` and hides itself.

## Endpoints

| Method | Path | Scope | What it does |
|---|---|---|---|
| `POST` | `/rest/cloud-agent/chat` | `cloudAgent:message` | Body `{ threadId, message }` → forwards to upstream `POST /v1/agent/chat`, kicks off the tool-router subscription, returns `{ runId }`. |
| `GET` | `/rest/cloud-agent/events/:threadId` | `cloudAgent:message` | Server-sent events. Pure byte pipe of the upstream SSE stream — content-encoding forced to identity to avoid Brotli memory bloat in long-lived streams. Supports `?lastEventId=` for replay. |
| `POST` | `/rest/cloud-agent/runs/:runId/tool-result` | `cloudAgent:message` | Forwards `{ toolCallId, output, isError }` upstream. Used by the frontend for `ask_user` replies and (in future) by other client-side handlers. |
| `POST` | `/rest/cloud-agent/runs/:runId/cancel` | `cloudAgent:message` | Stops the local tool-router subscription, forwards cancel upstream. |

## Files

```
modules/cloud-agent/
├── cloud-agent.module.ts             BackendModule lifecycle (init/settings/shutdown), feature-flag gate
├── cloud-agent.controller.ts         REST routes (decorators above) + SSE byte pipe
├── cloud-agent.service.ts            startRun/openEventStream/postToolResult/cancelRun facade
├── cloud-agent-client.service.ts     HTTP client to ai-assistant-service /v1/agent/*; license-cert JWT
├── cloud-agent-tool-router.service.ts  per-run SSE consumer that dispatches family=n8n tool-calls
├── cloud-agent.adapter.service.ts    wires tool-calls to WorkflowService / CredentialsService / etc.
```

## Tool execution flow

When the user sends a message, two parallel things happen against the
upstream cloud agent:

1. **Browser ↔ events pipe** — frontend opens `EventSource` →
   controller's `events()` handler opens the upstream SSE stream and
   pipes bytes to the response. The frontend store applies each event
   to the message list via the reducer; this is what renders chat in
   the UI.

2. **Server-side tool router** — `AgentService.startRun()` also calls
   `CloudAgentToolRouter.start(runId, threadId, user)`. The router opens
   *its own* SSE subscription against the same upstream stream so it
   can parse JSON and dispatch in the background, with the user's
   `@n8n/db` `User` for RBAC.

Two subscriptions for the same thread is wasteful but keeps the
browser path as a pure byte pipe — n8n doesn't have to re-encode or
re-time events to forward them. The cost is paying for one extra
upstream connection per active run.

Inside the tool router:

```
for each SSE frame:
  if type=='tool-call' and family=='n8n':
    result = adapter.dispatch{Workflows|Credentials|Nodes}(args, user)
    client.postToolResult(runId, { toolCallId, output, isError })
  if type=='ask_user':
    no-op; the browser renders the question and the user's answer
    travels back through the existing POST /tool-result endpoint
```

## Adapter (RBAC enforcement)

`CloudAgentAdapter` is the only place that touches n8n services. Each
method takes a `User` (from `@n8n/db`) and uses it for RBAC.

| Tool action | n8n call | Scope |
|---|---|---|
| `workflows.list` | `WorkflowService.getMany(user, { take })` | — (service-level filter) |
| `workflows.get` | `WorkflowFinderService.findWorkflowForUser(id, user, ['workflow:read'])` | `workflow:read` |
| `workflows.create` | `WorkflowCreationService.createWorkflow(user, entity, {})` | enforced inside the creation service (project membership, etc.) |
| `workflows.update` | `WorkflowService.update(user, entity, id, {})` | enforced inside `update` |
| `workflows.deploy` | `WorkflowService.activateWorkflow(user, id)` | enforced inside `activateWorkflow` |
| `credentials.list` | `CredentialsService.getMany(user, { listQueryOptions })` | — (service-level filter) |
| `credentials.get` | `CredentialsService.getMany(user, { listQueryOptions: { filter: { id } } })` | — (filtered by id; returns metadata only) |
| `nodes.search` | `LoadNodesAndCredentials.loadedNodes` scan | — (catalog is public to the instance) |
| `nodes.get-type-definition` | direct lookup | — |

Credential output never includes decrypted values — only `{ id, name, type }`.

## SSE parsing

The tool router buffers chunks from `Readable.fromWeb(upstreamBody)` and
extracts complete `data: <json>\n\n` frames. Each frame is parsed as
`AgentEvent`:

```ts
async *takeFrames(buffer: string): { events: AgentEvent[]; remainder: string }
```

Malformed frames are dropped silently — the buffer survives so
multi-chunk frames join correctly.

## Auth

`AgentClient` mirrors `AiService`'s license-cert → `/auth/token` →
bearer dance:

- Stores the active token in memory; refreshes on first use and on 401
- Headers: `authorization: Bearer …`, `x-consumer-id`, `x-user-id`,
  `x-n8n-version`, `x-instance-id`
- License-cert is read fresh on each token refresh, so license rotation
  is picked up after the next 401

This client is **temporary scaffolding** — once
`@n8n_io/ai-assistant-sdk@1.22.0` lands in the workspace catalog, replace
it with `AiAssistantClient.startAgentRun / postAgentToolResult / cancelAgentRun /
getAgentEventsUrl`.

## Frontend (sibling)

Frontend code lives in `packages/frontend/editor-ui/src/features/ai/cloudAgent/`:

```
cloudAgent.api.ts         postChat/postCancel/postToolResult/eventsUrl
cloudAgent.types.ts       canonical CloudAgentEvent + message shapes
cloudAgent.reducer.ts     pure reducer: event → message[] mutation
cloudAgent.store.ts       Pinia store: thread/messages/activeRun/sendMessage/cancel/answerQuestion
useCloudAgentEventSource.ts  Vue composable wrapping EventSource w/ Last-Event-ID reconnect
CloudAgentView.vue        page mount
components/CloudAgentChat.vue  chat UI: message list + ask_user inline form + cancel button
module.descriptor.ts      FrontendModuleDescription registering /cloud-agent route gated on cloudAgent:message
constants.ts              CLOUD_AGENT_VIEW = 'CloudAgent'
```

## Configuration

Backend module `settings()` returns:

```ts
{ enabled: boolean, baseUrl: string }
```

Exposed via the standard module-settings API; the frontend reads it from
`useSettingsStore().moduleSettings['cloud-agent']` to gate the nav
entry.

## Scope

The `cloudAgent` resource is registered in `@n8n/permissions`:

- `cloudAgent:message` — send chat messages, view events, post tool
  results, cancel runs. Granted to global owners and members.
- `cloudAgent:manage` — reserved for admin / settings operations
  (not yet wired). Granted to global owners only.

## What this module does NOT do

- **Persist threads locally.** Thread/message state lives in
  ai-assistant-service Redis. n8n caches nothing across reloads. A page
  refresh starts a new thread.
- **Render the n8n family tool results.** Those go back to the cloud
  agent, which decides what to show — the frontend's reducer just stores
  the raw result for inspection.
- **Handle MCP tools** — there's no MCP support on either side yet.
- **Track background tasks.** All work is inline within one run.

For the full plan past the current state (memory, more skills,
Playwright e2e, telemetry, etc.) see
`docs/plans/create-full-plan-to-unified-gadget.md` in the
ai-assistant-service repo.
