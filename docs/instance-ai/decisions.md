# Decision Log

Architectural and design decisions for Instance AI, with rationale and
trade-offs.

---

## 1. Mastra as Agent Framework

**Status**: Accepted

**Context**: Instance AI needs an agent framework that supports tool execution,
memory management, streaming responses, and MCP integration. Building these
from scratch would be significant effort.

**Decision**: Use [Mastra](https://mastra.ai/) as the agent orchestration
framework (`@mastra/core`, `@mastra/memory`, `@mastra/mcp`).

**Rationale**: Mastra provides all required primitives out of the box — agent
loop, tool execution with Zod schemas, multi-tier memory (recent messages,
working memory, semantic recall), storage backends (PostgreSQL, LibSQL), and
MCP client support. It has a clean TypeScript API that aligns with the n8n
codebase.

**Trade-offs**:
- (+) Rapid development — memory, MCP, and tool execution work immediately
- (+) Storage flexibility — PostgreSQL for production, LibSQL for development
- (-) External dependency — tied to Mastra's release cycle and API stability
- (-) Abstraction cost — debugging agent behavior requires understanding Mastra internals

**Alternatives considered**:
- **LangChain**: More established but heavier, Python-first design, less TypeScript-native
- **Custom implementation**: Full control but weeks of additional work for memory and MCP
- **Vercel AI SDK**: Good streaming support but less complete agent/memory primitives

---

## 2. Dependency Inversion for n8n API Access

**Status**: Accepted

**Context**: The agent needs to interact with workflows, credentials,
executions, and nodes. These are managed by services in the `packages/cli`
package. The agent package (`@n8n/instance-ai`) should not depend directly on
CLI internals.

**Decision**: Define service interfaces in `@n8n/instance-ai/src/types.ts`
(`InstanceAiWorkflowService`, `InstanceAiExecutionService`, etc.) and
implement them in the CLI adapter service.

**Rationale**: Clean separation of concerns. The agent package is a
self-contained library that knows nothing about TypeORM, Express, or n8n's
internal service layer. The CLI module provides concrete implementations via
`InstanceAiAdapterService.createContext(user)`.

**Trade-offs**:
- (+) Agent package is independently testable with mock services
- (+) Could be reused outside n8n (e.g. in a standalone agent)
- (+) Clear API contracts between packages
- (-) Interface duplication — changes to n8n services require updating both the interface and the adapter
- (-) Adapter layer adds indirection

**Alternatives considered**:
- **Direct service imports**: Simpler but creates tight coupling between packages
- **Event-based communication**: Too indirect for synchronous tool operations

---

## 3. Stateless Agent Per Request

**Status**: Accepted

**Context**: The agent needs to handle concurrent users and maintain per-user
context. Should the agent be a long-lived singleton or created fresh per
request?

**Decision**: Create a new Mastra `Agent` instance for every chat request in
`InstanceAiService.sendMessage()`.

**Rationale**: Eliminates shared state between requests. Each request gets its
own agent with user-scoped context, clean tool bindings, and isolated memory
parameters. No risk of cross-user data leakage.

**Trade-offs**:
- (+) No shared mutable state — inherently safe for concurrent requests
- (+) User-scoped context is naturally isolated
- (+) Simple error recovery — a failed request doesn't corrupt agent state
- (-) Agent creation overhead per request (mitigated by fast Mastra initialization)
- (-) MCP tool discovery happens per request (could be cached in future)

**Alternatives considered**:
- **Singleton agent with user context switching**: Risk of state leaks, complex concurrency management
- **Agent pool**: Over-engineered for current scale, adds complexity

---

## 4. Server-Sent Events (SSE) Streaming

**Status**: Accepted (supersedes NDJSON streaming)

**Context**: The frontend needs real-time updates as the agent generates text,
calls tools, and produces results. The original implementation used
newline-delimited JSON (NDJSON) over `application/octet-stream`. In 2026 every
major AI provider (OpenAI, Anthropic, Google) and framework (Vercel AI SDK,
Mastra) uses SSE as the standard streaming wire format. The NDJSON approach was
an accidental protocol choice — it reused the existing `streamRequest()` utility
with `'\n'` as the separator.

**Decision**: Stream responses as **Server-Sent Events** (`text/event-stream`).
Each chunk is written as:

```
event: <chunk.type>
data: <JSON>

```

The stream terminates with `data: [DONE]\n\n` (matching the OpenAI/Vercel
convention). Keep-alive comments (`: ping`) are sent every 15 seconds to prevent
proxy timeouts during long tool calls.

The frontend uses a new `sseStreamRequest()` utility — separate from the
existing `streamRequest()` used by the AI Assistant.

**Rationale**:
- **Industry alignment** — SSE is the 2026 standard for AI streaming. OpenAI,
  Anthropic, Google Gemini, Vercel AI SDK 6, and Mastra all use it. Using the
  same protocol means n8n speaks the same language as the ecosystem.
- **Free protocol features** — typed `event:` names enable selective listening,
  comment lines (`: ping`) serve as keep-alive, and the `[DONE]` sentinel is a
  well-understood termination signal.
- **DevTools debuggability** — Chrome and Firefox DevTools have built-in SSE
  viewers in the Network tab. With NDJSON, streams appeared as opaque binary
  data under `application/octet-stream`. With SSE, each event is parsed and
  displayed with its type and data, making development and debugging much easier.
- **Keep-alive for long tool calls** — NDJSON had no mechanism for signaling
  liveness during silent periods (e.g., when the agent is waiting for a tool to
  return). SSE comments solve this natively.
- **Client disconnect detection** — the controller now listens for `res.on('close')`
  to detect when the client disconnects, avoiding wasted computation on
  abandoned requests.

**Benefits over the previous NDJSON approach**:
1. SSE events are self-describing (typed via `event:` field) vs opaque JSON lines
2. Built-in keep-alive via SSE comments prevents proxy/CDN timeouts
3. DevTools render SSE as structured events, not raw binary
4. `[DONE]` sentinel is an ecosystem convention — no custom `{ type: 'done' }` needed
5. Error events use `event: error` — a standard SSE pattern
6. Client disconnect handling prevents the backend from streaming into the void

**Trade-offs**:
- (+) Matches every major AI provider's streaming format
- (+) DevTools show structured SSE events instead of opaque binary
- (+) Keep-alive comments prevent proxy timeouts
- (+) Clean separation — `sseStreamRequest()` doesn't touch the AI Assistant's `streamRequest()`
- (-) No `EventSource` reconnection (we use `fetch` + manual parsing for POST support)
- (-) Slightly more bytes per chunk (`event: ...\ndata: ...\n\n` vs `json\n`)

**Alternatives considered**:
- **Keep NDJSON**: Works but non-standard, no keep-alive, poor DevTools support
- **WebSocket**: Bidirectional but overkill for request-response streaming
- **Vercel AI SDK streaming format**: Would add a dependency for the protocol layer
- **Native `EventSource` API**: Only supports GET requests — we need POST with a body

---

## 5. Three-Tier Memory Architecture

**Status**: Accepted

**Context**: The agent needs to remember conversation history, learn about the
user over time, and optionally recall relevant past conversations.

**Decision**: Use Mastra's memory system with three tiers:
1. **Recent messages** — sliding window of last N messages (default 20)
2. **Working memory** — structured markdown template updated by the agent
3. **Semantic recall** — optional vector-based retrieval of similar past messages

**Rationale**: Each tier serves a different purpose. Recent messages provide
immediate context. Working memory captures long-term user preferences and
instance knowledge. Semantic recall surfaces relevant past interactions that
may be outside the recent window.

**Trade-offs**:
- (+) Graceful degradation — semantic recall is optional, core experience works without it
- (+) Working memory evolves organically as the agent interacts with users
- (+) Recent message window is configurable for cost/context trade-offs
- (-) Working memory quality depends on the model's ability to maintain the template
- (-) Semantic recall requires an embedder model (additional cost and setup)

**Alternatives considered**:
- **Full conversation history**: Expensive context, slow for long conversations
- **Summary-based memory**: Lossy compression, hard to query for specifics
- **No memory**: Each conversation starts from scratch (poor user experience)

---

## 6. Module System Registration

**Status**: Accepted

**Context**: How should Instance AI integrate with the n8n backend? As a
hardcoded feature or as a pluggable module?

**Decision**: Register as an n8n backend module via the `ModuleRegistry`,
listed in `defaultModules`. The module implements `ModuleInterface` with
`init()`, `settings()`, and `shutdown()` lifecycle methods.

**Rationale**: The module system is n8n's standard pattern for optional
features. It provides lifecycle management, enable/disable via
`N8N_DISABLED_MODULES`, instance type filtering (`main` only), and settings
exposure to the frontend via `isModuleActive()`.

**Trade-offs**:
- (+) Follows established n8n patterns — consistent with other modules
- (+) Can be disabled without code changes via environment variable
- (+) Instance type filtering ensures it only runs on the main instance
- (+) Settings propagate to the frontend for conditional UI rendering
- (-) Module system has its own complexity (dynamic imports, lifecycle ordering)

**Alternatives considered**:
- **Feature flag only**: Less structured, no lifecycle management
- **Always-on feature**: No way to disable in deployments where AI is not wanted

---

## 7. Client-Side Thread Management

**Status**: Accepted

**Context**: Users need conversation threads to organize different topics.
Should threads be managed on the backend with a CRUD API, or on the frontend?

**Decision**: Threads are managed client-side in the Pinia store. The backend
has no thread API — thread identity is simply a UUID passed to the memory
system as the `thread` parameter.

**Rationale**: Minimal backend complexity. The backend already stores message
history keyed by `{ resource: userId, thread: threadId }` via Mastra memory.
The frontend generates UUIDs and maintains the thread list in local state.

**Trade-offs**:
- (+) No backend CRUD API needed — simpler implementation
- (+) Thread list is fast to render (no API calls)
- (+) Thread identity is just a UUID — trivial to create
- (-) Thread list doesn't persist across browser sessions (could add localStorage)
- (-) No server-side thread metadata (titles, timestamps from DB)
- (-) Can't share threads between users

**Alternatives considered**:
- **Backend thread API**: Full persistence but adds API endpoints, database tables, and frontend API calls
- **localStorage persistence**: Middle ground, would survive page reloads but not device switches

---

## 8. Credential Secrets Never Exposed to Agent

**Status**: Accepted

**Context**: The agent can manage credentials (create, update, test). Should it
be able to see decrypted credential data?

**Decision**: The credential adapter never returns decrypted secrets to the
agent. `get-credential` passes `false` to the decrypt parameter. `test-credential`
decrypts server-side for testing but only returns `{ success, message }`.

**Rationale**: Defense in depth. Even though the LLM's responses are scoped to
the user, credential secrets should have the smallest possible exposure surface.
The agent can create and test credentials without ever seeing the raw values.

**Trade-offs**:
- (+) Secrets never appear in LLM context, tool results, or streaming responses
- (+) Aligns with the system prompt instruction to never expose secrets
- (+) Reduces risk from prompt injection or model misbehavior
- (-) Agent can't help debug credential values (e.g. "your API key starts with sk-...")
- (-) Agent can't suggest fixes for malformed credential data

**Alternatives considered**:
- **Full access**: Agent could help debug credential values but creates security risk
- **Masked access**: Show partial secrets (e.g. `sk-...xyz`) — adds complexity with limited benefit

---

## 9. Pin Data Injection for Workflow Execution

**Status**: Accepted

**Context**: The agent needs to run workflows with test data. Workflows
typically start from triggers (webhooks, schedules, etc.) that expect specific
input. How should the agent provide input data?

**Decision**: When `inputData` is provided to `run-workflow`, the execution
adapter finds the first trigger node and injects the data as **pin data**:

```typescript
pinData = { [triggerNode.name]: [{ json: inputData }] }
```

The workflow runs in `manual` execution mode with the pin data overriding the
trigger's output.

**Rationale**: Pin data is n8n's existing mechanism for testing workflows with
predetermined data. It bypasses the trigger node's actual execution and injects
the provided data as if the trigger produced it. This works with any trigger
type without special handling.

**Trade-offs**:
- (+) Uses existing n8n mechanism — well-tested and understood
- (+) Works with any trigger type (webhook, schedule, polling, etc.)
- (+) No need to simulate actual trigger events
- (-) Only injects into the first trigger node found
- (-) Detection heuristic (checking for 'Trigger', 'trigger', 'webhook' in type) may miss custom triggers
- (-) Pin data shape (`[{ json: data }]`) assumes single-item output

**Alternatives considered**:
- **Simulating webhook calls**: Only works for webhook triggers, complex to implement generically
- **Direct node execution**: Would skip the trigger entirely, missing workflow-level settings
- **Test webhook endpoint**: Exists but requires the workflow to be active with a webhook trigger

## Related Docs

- [Architecture](./architecture.md) — system design and package map
- [Configuration](./configuration.md) — environment variables and setup
- [Backend Module](./internals/backend-module.md) — implementation details
