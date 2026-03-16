# Architectural Decision Records

This file tracks key architectural decisions for the Instance AI project.
Since this project is built entirely with AI tools, maintaining decision context
is critical for continuity across development sessions.

## Format

Each decision follows the format:

- **Status**: Accepted / Proposed / Superseded
- **Context**: What prompted the decision
- **Decision**: What was decided
- **Consequences**: What follows from the decision

---

## ADR-001: Use Mastra as the Agent Framework

**Status**: Accepted

**Context**: We needed an agent framework that supports tool calling, memory,
MCP integration, and multiple LLM providers. Options considered included
building from scratch, LangChain, Vercel AI SDK, and Mastra.

**Decision**: Use Mastra. It provides the right abstraction level — agent
creation, tool definition via Zod, built-in memory with working memory and
semantic recall, native MCP client support, and LLM-agnostic model selection.

**Consequences**:
- Agent core depends on `@mastra/core`, `@mastra/memory`, `@mastra/mcp`
- Tool schemas use Zod (compatible with Mastra's tool system)
- Memory tiers (working memory, semantic recall, observational memory) come
  from Mastra's memory layer
- Storage backends (PostgreSQL, LibSQL) use Mastra's storage adapters
- If Mastra is ever swapped, the tool definitions and service interfaces survive
  since they're framework-agnostic

---

## ADR-002: Clean Interface Boundary Between Agent Core and n8n

**Status**: Accepted

**Context**: The agent needs access to n8n's workflows, executions, credentials,
and nodes. It could either import n8n services directly or define its own
interfaces.

**Decision**: The `@n8n/instance-ai` package defines service interfaces
(`InstanceAiWorkflowService`, `InstanceAiExecutionService`, etc.) and the backend
adapter implements them against real n8n services.

**Consequences**:
- Agent core has zero n8n dependencies — fully testable in isolation
- Adapter layer handles permission checks, data transformation, error mapping
- Adding a new tool that needs n8n data requires: interface method → adapter
  implementation → tool definition
- The interface boundary acts as a contract — agent core and n8n can evolve
  independently

---

## ADR-003: Agent Created Per Request

**Status**: Accepted

**Context**: Should we create one agent instance per n8n instance (singleton) or
per request?

**Decision**: Create a new agent per `sendMessage` call.

**Consequences**:
- Each request gets fresh user context (permissions are request-scoped)
- MCP server configuration changes are picked up immediately
- No shared mutable state between requests
- Memory persistence is handled externally by the storage backend, not in-agent
- Minor overhead of agent creation per request (acceptable given LLM latency)

---

## ADR-004: Newline-Delimited JSON for Streaming

**Status**: Superseded by ADR-014

**Context**: Needed a streaming format for delivering agent responses. Options:
Server-Sent Events (SSE), WebSocket, NDJSON over HTTP.

**Decision**: Use newline-delimited JSON over a standard HTTP POST response.

**Consequences**:
- Simple to implement — just `JSON.stringify(chunk) + '\n'` per chunk
- Works with standard HTTP infrastructure (no WebSocket upgrade needed)
- Frontend parses line-by-line with a stream reader
- `X-Accel-Buffering: no` header prevents proxy buffering
- Abort support via `AbortController` on the fetch request
- No automatic reconnection (unlike SSE) — acceptable for request-scoped streams

> **Note**: This ADR is fully superseded by ADR-014. Streaming now uses SSE via
> a pub/sub event bus. The POST endpoint returns `{ runId }` and does not
> stream NDJSON.

---

## ADR-005: Memory Storage Follows n8n's Database Choice

**Status**: Accepted

**Context**: The memory system needs persistent storage. Should it use its own
database or share with n8n?

**Decision**: Use the same database type as n8n. If n8n uses PostgreSQL, memory
uses PostgreSQL (same instance). Otherwise, use a local LibSQL/SQLite file.

**Consequences**:
- Zero additional infrastructure for users — memory "just works"
- PostgreSQL users get vector search capability (via pgvector) for semantic recall
- SQLite users get LibSQL-based storage and vector search
- No separate database connection to configure
- Memory tables live alongside n8n tables in PostgreSQL (namespace isolation via
  Mastra's table naming)

---

## ADR-006: Tool Confirmation via Tool Metadata

**Status**: Accepted

**Context**: The autonomous execution loop needs to run without user intervention
for safe operations, but destructive operations must require confirmation. The
current approach relies on the system prompt telling the agent to "confirm before
deleting" — this is too fragile for destructive operations.

**Decision**: Tools declare their confirmation requirement in metadata,
not rely on the system prompt alone. The confirmation requirement is a
structural property of the tool, enforced by the frontend.

**Consequences**:
- Confirmation is enforced structurally, not just by LLM instruction-following
- The frontend can render confirmation UI before tool execution
- Safe tools (list, get, run) execute in the autonomous loop without pausing
- Destructive tools (delete, update-production) pause for user approval
- MCP tools need a default policy (confirm by default? or not?)
- Requires extending the tool definition schema and frontend chunk handling
- Implementation is pending — the decision is accepted, the code is not yet written

---

## ADR-007: Workflow Evaluations for Agent Feedback Loop

**Status**: Proposed

**Context**: The autonomous loop needs to know whether a workflow produced the
*right* result, not just whether it ran without errors. Simple success/error
checking is insufficient for quality assurance.

**Decision**: Integrate n8n's native workflow evaluation system (eval triggers
and metrics) into the agent's autonomous loop. A dynamically composed evaluator
sub-agent handles the full evaluation lifecycle — discovering existing eval
workflows, creating new ones when needed, running evaluations, and interpreting
metrics.

**Consequences**:
- Agent can run evaluations as part of the inspect → evaluate → debug cycle
- Evaluator sub-agent is self-contained: creates eval workflows if none exist
- The agent has quantitative signals (metrics) to decide whether to iterate
- Evaluation tools are scoped to the evaluator sub-agent, not the orchestrator
- Requires new service interface methods for eval triggers and metrics

---

## ADR-008: Capability Repository for Self-Created Tools (Proposed)

**Status**: Proposed

**Context**: The MCP self-augmentation loop means the agent creates workflows
and registers them as tools. Without governance, the tool surface area grows
unpredictably.

**Decision**: Implement a capability repository that tracks self-created tools
with metadata about quality, usage, and lifecycle.

**Consequences**:
- Agent can discover what custom tools already exist before creating new ones
- Quality tracking prevents the agent from reusing broken tools
- Cleanup mechanisms prevent tool sprawl
- Repository needs persistence (dedicated table or workflow metadata?)
- Need to define the interface between repository and MCP server registration

---

## ADR-009: DevTools MCP for Browser Automation MVP (Accepted)

**Status**: Accepted

**Context**: Browser automation is a planned capability but the scope is large
and under-specified. We need to validate the approach before building custom
infrastructure.

**Decision**: Use DevTools MCP as the MVP implementation. This provides browser
control via Chrome DevTools Protocol through an existing MCP server.

**Consequences**:
- Minimal implementation effort — just add DevTools MCP as a configured server
- Validates that the agent can effectively use browser tools in the autonomous loop
- Learnings inform the scope of future browser automation work
- Limited to Chrome DevTools Protocol capabilities
- Requires a running browser accessible to the n8n instance

---

## ADR-010: No Agent-Side Credential Secret Handling

**Status**: Accepted

**Context**: The `create-credential` and `update-credential` tools accepted raw
secret fields in their `data` parameter. The streaming protocol emits `tool-call`
args to the frontend, which would expose secrets in the chat UI, browser devtools,
network logs, and telemetry.

**Decision**: Remove `create-credential` and `update-credential` tools. Credential
creation and secret configuration must go through the existing n8n frontend UI.
In the future, the agent can use browser automation to set up credentials through
the UI programmatically. The agent retains `list-credentials`, `get-credential`,
`test-credential`, and `delete-credential` — none of which handle secret data.

**Consequences**:
- Eliminates the risk of credential secrets leaking through the stream
- Agent cannot fully automate credential setup (current limitation)
- Browser automation (DevTools MCP) becomes the future path for agent-driven
  credential creation — the agent fills in the UI form like a user would
- Reduces domain tool count from 18 to 16 (orchestration tools `plan` and
  `delegate` were added later, bringing the total back to 18)

---

## ADR-011: Persistent Memory for Instance Agent, Stateless Sub-Agents

**Status**: Accepted

**Context**: The instance agent needs to understand user needs, available skills,
and instance knowledge over time. However, the autonomous execution loop spawns
dynamically composed sub-agents for specific tasks. Should sub-agents share memory?

**Decision**: The instance agent (orchestrator) maintains persistent, user-scoped
working memory that carries across threads. Observational memory is thread-scoped
and tracks operational history for the current conversation only. Sub-agents
spawned via the `delegate` tool are stateless — they receive a briefing from the
orchestrator but do not read or write to the memory system.

**Consequences**:
- Instance agent builds long-term understanding of the user and instance
- Working memory is user-scoped (persists across threads)
- Messages and observational memory are thread-scoped (isolated per conversation)
- Sub-agents are lightweight and disposable — no memory overhead
- Orchestrator is responsible for composing sub-agent briefings with relevant context
- Clear separation: orchestrator = stateful deep agent, sub-agents = stateless workers

---

## ADR-012: Always Stream Reasoning Tokens

**Status**: Accepted

**Context**: Some models emit reasoning/thinking tokens. These could contain
internal chain-of-thought that might be confusing or expose internals. Should
we show them, hide them, or make it configurable?

**Decision**: Always stream `reasoning-delta` chunks to the frontend when the
model produces them. This gives users full visibility into the agent's
decision-making and supports faster iteration during development.

**Consequences**:
- Users see the agent's thought process in real-time
- Better debugging experience — users can understand why the agent made decisions
- No redaction or gating logic needed (simplicity)
- Models that don't emit reasoning tokens produce no `reasoning-delta` chunks;
  frontend handles absence gracefully
- May revisit if reasoning content becomes problematic in production, but for
  now transparency is prioritized

---

## ADR-013: Normalize Stream Chunk Schema

**Status**: Accepted

**Context**: The `error` chunk type used a top-level `content` field while all
other chunk types used a `payload` wrapper. This inconsistency increased parser
complexity.

**Decision**: Normalize all chunk types to use the `payload` wrapper:
`{"type":"error","payload":{"content":"..."}}` instead of
`{"type":"error","content":"..."}`.

**Consequences**:
- All chunks follow the same schema: `{ type, runId, agentId, payload? }`
- Frontend parsers can use a single code path for all chunk types
- Existing frontend code should handle both formats during migration period
- Backend controller needs to be updated to emit the new format

---

## ADR-014: Pub/Sub Event Bus for Multi-Agent Streaming

**Status**: Accepted

**Context**: The autonomous execution loop spawns dynamically composed sub-agents.
Sub-agent events (tool calls, reasoning, text) need to be visible to the frontend
in real-time. Two approaches were considered:

1. **Pipe-through**: Sub-agent streams piped through the orchestrator's tool
   execution via `context.emitChunk()` — requires extending Mastra's tool contract
2. **Pub/sub**: All agents publish to a shared event bus, frontend subscribes
   independently — decouples agent execution from event delivery

**Decision**: Use a pub/sub event bus. Each agent (orchestrator + sub-agents)
publishes events to a per-thread channel. The frontend subscribes via an SSE
endpoint and sees events from all agents. Events are persisted to thread storage
for replay on reconnect.

**Consequences**:
- No Mastra tool contract extension needed — sub-agents publish directly to the bus
- Frontend can connect/disconnect independently (SSE with `Last-Event-ID` replay)
- Each SSE event has a monotonically increasing integer `id` per thread channel
- Replay returns events where `event.id > Last-Event-ID` (no dedup needed)
- SSE endpoint supports both `Last-Event-ID` header (auto-reconnect) and
  `?lastEventId` query parameter (manual reconnect)
- All events carry `runId` (correlates to the triggering message) and `agentId`
- New lifecycle events: `run-start`, `run-finish`, `agent-spawned`, `agent-completed`
- POST endpoint returns `{ runId }` (no longer streams)
- New SSE endpoint: `GET /instance-ai/events/:threadId`
- Only one active run is allowed per thread; additional `POST /chat` requests
  for the same thread are rejected while a run is in progress
- Single-instance: in-process EventEmitter + thread storage for replay
- Multi-instance (queue mode): Redis Pub/Sub + thread storage for replay
- Events persisted regardless of transport — replay is always available
- Cancellation uses `POST /instance-ai/chat/:threadId/cancel` (idempotent) to
  stop the orchestrator and active sub-agents
- Retention/compaction policy is deferred to the Production Readiness milestone

---

## ADR-015: Deep Agent Architecture with Dynamic Sub-Agent Composition

**Status**: Accepted

**Context**: The autonomous execution loop requires sustained reasoning across
many steps, context management to prevent degradation, and sub-agent delegation
for focused subtasks. The "deep agent" pattern (as seen in Claude Code, Manus,
Deep Research) provides a proven architecture for this.

**Decision**: Adopt the deep agent architecture with four pillars:

1. **Explicit Planning** — a `plan` tool that forces the orchestrator to
   externalize its strategy and review it between phases
2. **Dynamic Sub-Agent Composition** — a `delegate` tool that spawns sub-agents
   with orchestrator-specified role, instructions, and tool subset (not a fixed
   taxonomy of agent types)
3. **Observational Memory** — Mastra's observational memory system to compress
   tool-heavy operational history and prevent context degradation over long loops
4. **Structured System Prompt** — detailed orchestrator instructions covering
   delegation patterns, planning discipline, and loop behavior

Sub-agents are composed dynamically: the orchestrator specifies the role (free-form),
instructions (task-specific prompt), and tools (subset of registered tools) for
each delegation. There is no fixed Builder/Debugger/Evaluator taxonomy — the
orchestrator reasons about what kind of agent it needs.

**Consequences**:
- LLM controls the loop — Build → Execute → Inspect → Evaluate → Debug cycle
  emerges from the system prompt and planning tool, not hardcoded transitions
- The orchestrator can skip steps, reorder, backtrack, or take unexpected paths
- Sub-agents get clean context windows (no accumulated noise from prior steps)
- Orchestrator's context stays small via observational memory compression
  (5–40x for tool-heavy workloads)
- `plan` tool stores plan in thread-scoped storage (not working memory)
- Sub-agents cannot spawn their own sub-agents (no recursive delegation)
- Sub-agents get low `maxSteps` (10–15) — bounded blast radius
- The `delegate` tool validates requested tools against registered native domain
  tool names (no MCP tools, no orchestration tools)
- Mastra's `.network()` is not used — direct delegation via the `delegate` tool
  gives more control over sub-agent context and tool selection

---

## ADR-016: Observational Memory for Context Budget

**Status**: Accepted

**Context**: The autonomous execution loop can run for 50+ steps. Tool results
(workflow definitions, execution data, node descriptions) are large — a single
execution result can be thousands of tokens. Without management, the context
window fills up and agent performance degrades.

**Decision**: Use Mastra's observational memory to automatically compress old
messages into dense observations. Two background agents (Observer, Reflector)
manage context size without explicit developer intervention.

**Consequences**:
- Observer triggers at configurable message token threshold (default: 30K)
- Reflector condenses observations when they exceed threshold (default: 40K)
- Tool-heavy workloads get 5–40x compression
- Observation block is append-only, enabling high prompt cache hit rates
- Async buffering pre-computes observations in the background — no user-visible pause
- Observational memory is thread-scoped (operational history for current task)
- Working memory remains separate and user-scoped (user preferences, instance knowledge)
- Requires a secondary LLM for Observer/Reflector (default: gemini-2.5-flash)
- Storage must be PostgreSQL, LibSQL, or MongoDB (Mastra limitation)

---

## ADR-017: Plan Storage in Thread Scope

**Status**: Accepted

**Context**: The `plan` tool needs persistent storage for the execution plan.
Options: working memory (user-scoped), thread storage (conversation-scoped),
or in-context only (lost on disconnect).

**Decision**: Store the plan in thread-scoped storage. Each conversation has
its own plan that persists across reconnects but is isolated from other threads.

**Consequences**:
- Plan survives frontend disconnects and reconnects
- Each conversation has an independent plan — no cross-thread contamination
- Plan lifecycle matches conversation lifecycle
- Working memory remains dedicated to user knowledge (not operational state)
- Plan tool reads/writes to thread storage on every create/update/review call

---

## ADR-018: Non-Blocking Background Sub-Agents

**Status**: Accepted

**Context**: Sub-agent tools (`build-workflow-with-agent`, `manage-data-tables-with-agent`)
blocked the orchestrator for the entire duration of the sub-agent stream (up to 20 LLM steps,
30–120 seconds). During this time the thread was locked — no new user messages, no other work.

Mastra's tool model is synchronous by contract (`execute()` must return before the agent loop
continues). The suspend/resume mechanism (HITL) also blocks the thread. Alternatives considered:

| Alternative                 | Rejected because                                        |
| --------------------------- | ------------------------------------------------------- |
| Orchestrator-level suspend  | Thread locked — can't accept new user messages          |
| Parallel tool calls (model) | Can't control what the LLM decides to parallelize       |
| Restate-style durable exec  | Massive infrastructure change, overkill for the problem |

**Decision**: Fire-and-forget with a background task registry. The tool spawns the sub-agent
as a detached async task, returns immediately, and the orchestrator run completes normally.
The thread stays responsive.

Key components:
- **`BackgroundTask` registry** on `InstanceAiService` — a `Map<taskId, BackgroundTask>`
  alongside existing `activeRuns` / `suspendedRuns` / `pendingSubAgentConfirmations`
- **`spawnBackgroundTask`** callback on `OrchestrationContext` — same pattern as
  `waitForConfirmation`. Each background task gets its own `AbortController`
- **Result injection** — on each `executeRun()`, completed/running background tasks are
  collected and prepended to the user message as `<background-tasks>` context
- **Event streaming** — background tasks publish to the existing event bus (agent-spawned,
  text-delta, tool-call, agent-completed). No new event types needed

```
Orchestrator Run #1:
  → calls build-workflow-with-agent({ task: "..." })
      → spawns background task, returns immediately
  → LLM responds: "Building that now. Ask me anything else."
  → run-finish ✓  (thread is FREE)

[Builder runs in background]
  → events stream to frontend via existing SSE pipe
  → result stored in task registry

Orchestrator Run #2 (user sends new message):
  → drainCompletedTasks() injects builder result as context
  → LLM incorporates naturally: "Your workflow is ready!"
```

HITL inside background tasks (e.g., data-table destructive operations) still works because
`waitForConfirmation` promises live on the service instance, not tied to the orchestrator run.

**Consequences**:
- Thread stays responsive while builders/data-table agents run (30–120s unblocked)
- Multiple builds can run in parallel — each gets its own taskId and AbortController
- No new event types, API endpoints, or external infrastructure
- Background tasks are in-memory only — lost on server restart (acceptable for MVP)
- Frontend reducer already handles `agent-completed` events arriving after `run-finish`
- Same pattern extends to any future long-running sub-agent

---

## ADR-019: Robust Workflow Execution with Timeout and Structured Debugging

**Status**: Accepted

**Context**: The autonomous loop requires Build → Execute → Inspect → Evaluate → Debug.
The execution tools exist but have critical gaps compared to the MCP execute-workflow tool:
the adapter's `run()` blocks indefinitely with no timeout, trigger detection uses naive
string matching, pin data is not trigger-type-aware, `debug-execution` returns raw data
identical to `get-execution`, and there's no way to cancel a running execution. These
gaps make the execution phase of the autonomous loop unreliable for production use.

**Decision**: Redesign workflow execution to match MCP's robustness while preserving
the instance AI's tool-per-concern separation:

1. **`run-workflow` blocks with timeout, returns full results** — single tool call for
   the common case. Default 5-minute timeout with configurable override. On timeout,
   the execution is cancelled via `activeExecutions.stopExecution()`.
2. **`get-execution` becomes non-blocking** — calls `getStatus()` instead of `getResult()`,
   enabling polling when needed without blocking the agent.
3. **New `stop-execution` tool** — cancels a running execution by ID.
4. **`debug-execution` returns structured diagnostics** — failing node name/type, the error
   message, the input data that caused the failure, and a per-node execution trace.
5. **Proper trigger detection and type-aware pin data** — reuse trigger type constants
   from `n8n-workflow` and adapt the MCP tool's `getPinDataForTrigger()` helper. Fall back
   to generic `{ json: inputData }` for unknown triggers so the agent can test any workflow.

**Consequences**:
- `run-workflow` becomes the primary execution tool — run and get results in one call
- Agent can never hang indefinitely on a stuck workflow
- `get-execution` is still useful for checking already-running executions (non-blocking)
- `debug-execution` gives the LLM structured context to reason about failures
- `stop-execution` closes the last gap — the agent can cancel stuck/unwanted executions
- The `InstanceAiExecutionService` interface grows by two methods: `stop()`, `getDebugInfo()`
- `run()` return type changes from `{ executionId }` to `ExecutionResult`

---

## ADR-020: Web Content Extraction via Local Pipeline

**Status**: Accepted

**Context**: The instance agent needs to read API docs, integration guides, and
reference pages while building workflows. Options considered:

| Option                    | Rejected because                                              |
| ------------------------- | ------------------------------------------------------------- |
| External API (Jina, etc.) | External dependency — breaks air-gapped / self-hosted deploys |
| Headless browser          | Heavy infrastructure, slow, resource-hungry                   |
| No web access             | Agent can't verify docs or read linked references             |

**Decision**: Implement a local content extraction pipeline:
HTTP fetch → Readability → Turndown → Markdown. No external API dependency.

Key design choices:
1. **SSRF protection** — `assertPublicUrl()` blocks non-HTTP(S) schemes and private
   IP ranges (RFC-1918, loopback, link-local). Post-redirect check catches SSRF via
   open redirects.
2. **Content routing by type** — HTML → Readability + Turndown + GFM tables,
   PDF → `pdf-parse`, plain text / markdown → passthrough.
3. **Safety flags** — heuristic detection of JS-rendered pages and login walls so the
   agent knows when content may be degraded.
4. **LRU cache** — 15-minute TTL, 100 entries. Prevents redundant fetches when the
   agent references the same page multiple times.
5. **Optional summarization** — pages over 15K chars can be compressed by a lightweight
   model via an injected `generateFn`. Falls back to truncation when no model is available.
6. **Optional service** — `webResearchService` is optional on `InstanceAiContext`. The
   tool returns a graceful error message when the service is not configured.

**Consequences**:
- Works everywhere: Cloud, self-hosted, air-gapped (no external API calls)
- Readability handles most documentation sites well; JS-rendered SPAs are flagged
- SSRF protection prevents the agent from scanning internal infrastructure
- Cache reduces latency for repeated references to the same URL
- New `InstanceAiWebResearchService` interface in types.ts, adapter in CLI package
- Dependencies added: `@mozilla/readability`, `turndown`, `@joplin/turndown-plugin-gfm`,
  `linkedom`, `pdf-parse`

---

## ADR-021: SearXNG as Keyless Search Provider

**Status**: Accepted

**Context**: The `web-search` tool required a paid Brave Search API key
(`INSTANCE_AI_BRAVE_SEARCH_API_KEY`). Self-hosters who don't want external API
dependencies — or run in air-gapped environments — could not use web search or
the `research-with-agent` tool. SearXNG is a self-hosted metasearch engine that
aggregates results from Google, Bing, DuckDuckGo, and others without requiring
an API key. Many n8n self-hosters already run it.

**Decision**: Add SearXNG as an alternative search provider with a priority
chain: Brave (if API key set) > SearXNG (if URL set) > disabled.

Key design choices:
1. **Default URL** — `http://searxng:8080` (standard Docker Compose service name
   and port). Works out of the box when SearXNG runs alongside n8n in Docker Compose.
2. **Same interface** — `searxngSearch()` returns `WebSearchResponse`, same as
   `braveSearch()`. The adapter selects the provider; the agent core is unaware.
3. **Domain filtering** — same `site:` / `-site:` query syntax as Brave. SearXNG
   passes these through to underlying search engines.
4. **Client-side result limiting** — SearXNG has no server-side `count` parameter,
   so results are sliced client-side via `.slice(0, maxResults)`.
5. **No SSRF guard on SearXNG URL** — the URL is operator-configured via env var,
   intentionally allowed to be a private IP (it's a self-hosted service).
6. **No new dependencies** — uses native `fetch`, no additional packages.

**Consequences**:
- Self-hosters get web search with zero external API costs
- Docker Compose users need only add a `searxng` service — no config needed
- Brave Search remains the preferred provider when an API key is configured
- The adapter pattern (ADR-002) keeps the change contained to the CLI package
- SearXNG requires JSON format enabled in `settings.yml` (default in most images)
- No changes to `@n8n/instance-ai` package — the interface boundary is preserved

---

## ADR-022: Sandboxed Code Execution for Workflow Builder

**Status**: Accepted

**Context**: The `build-workflow` tool accepts TypeScript code as a string parameter,
validates it in-process, and saves the result. This works but has limitations:
the agent cannot iterate on files, run `tsc` for type checking, or use standard
development workflows. The string-based approach also means the agent gets no
IDE-like feedback — errors are reported after submission, not during editing.

Alternatives considered:

| Alternative | Rejected because |
|-------------|------------------|
| In-process `tsc` | Would need to ship the TypeScript compiler in the agent package. Heavy, slow, and tsc is designed for files not strings. |
| WASM sandbox | Limited filesystem, no network, can't run `npm install` or real `tsc`. |
| Direct host execution | No isolation — agent code runs with full host permissions. Unacceptable for production. |

**Decision**: Add optional sandboxed code execution via Mastra's Workspace abstraction.
Two providers:

1. **Daytona** (production) — isolated Docker containers provisioned via the Daytona API.
   Each thread gets its own container with a workspace pre-loaded with `@n8n/workflow-sdk`,
   `tsconfig.json`, a node type catalog, and existing workflow JSONs.
2. **Local** (development) — direct host execution via Mastra's `LocalSandbox`. No isolation,
   but enables rapid iteration without Daytona infrastructure.

The builder agent operates in dual mode:
- **Sandbox mode** (when workspace is available): agent writes TypeScript files, runs `tsc`,
  and uses `submit-workflow` to validate and save. Gets `search-nodes`, `get-workflow-as-code`,
  `get-node-type-definition`, `submit-workflow`, plus filesystem and `execute_command`.
- **Tool mode** (fallback): original `build-workflow` tool with string-based code. No change
  from pre-sandbox behavior.

Key design choices:
1. **Per-thread workspace lifecycle** — sandboxes are created on first use and persist across
   messages within a conversation. Destroyed on server shutdown.
2. **Lazy, idempotent setup** — workspace initialization checks a marker file before running.
   Bundles all config files into a single shell script to minimize API round-trips.
3. **Credential resolution at save time** — `submit-workflow` resolves `newCredential()` calls
   against the credential map (from `list-credentials`) and existing workflow credentials.
   Unresolved credentials are stripped — the user adds them in the UI.
4. **Path-traversal protection** — `write-file` tool normalizes paths and rejects writes
   outside the workspace root.
5. **Shell injection prevention** — all paths interpolated into shell commands are quoted.

**Consequences**:
- Builder agent gets real `tsc` validation — catches type errors before saving
- Agent can iterate on files naturally (read → edit → compile → fix → submit)
- Sandbox is optional — disabled by default, zero impact when off
- New workspace module: `create-workspace.ts`, `sandbox-setup.ts`, `daytona-filesystem.ts`, `sandbox-fs.ts`
- New sandbox-only tools: `submit-workflow`, `materialize-node-type`, `write-file`
- `OrchestrationContext` extended with `workspace`, `nodeDefinitionDirs`, `domainContext`
- `InstanceAiService` manages sandbox lifecycle (create, persist per thread, destroy on shutdown)
- 6 new config env vars for sandbox control
- Depends on `@mastra/daytona` package (optional — only loaded when Daytona provider is selected)

---

## ADR-024: Server-Side Local Filesystem Provider

**Status**: Superseded by ADR-026 (boolean flag removed; auto-detection instead)

**Context**: The browser-mediated filesystem bridge (ADR-022, ADR-023) requires a
Chromium browser to be open, adds 100-500ms latency per file read (SSE round-trip),
and doesn't work for headless/API-triggered scenarios. For self-hosted users running
n8n on the same machine as their project files, the agent should be able to read
files directly from disk without any user interaction.

**Decision**: Add a `LocalFilesystemProvider` that implements `InstanceAiFilesystemService`
using Node.js `fs/promises`. Auto-detected based on runtime environment (see ADR-026).

- **No basePath** (default): the agent reads any path the n8n process can access
- **With basePath** (`N8N_INSTANCE_AI_FILESYSTEM_PATH`): `path.resolve()` + `fs.realpath()`
  containment check prevents directory traversal and symlink escape
- Entry count cap (10,000) in tree walks to prevent runaway scans
- Binary detection via null byte check in first 8KB; 512KB file size cap

**Consequences**:
- Self-hosted bare-metal users get filesystem access out of the box — zero configuration
- A "Files connected" indicator is shown in the UI when any filesystem provider is active
- Container/cloud environments automatically use the gateway (ADR-025) instead

---

## ADR-025: Unified Filesystem Gateway for Remote Daemon

**Status**: Accepted

**Context**: The `LocalFilesystemProvider` (ADR-024) requires files on the same machine
as n8n. For the common case of n8n running on a remote server/Docker while project
files live on the user's laptop, we need a lightweight CLI daemon that runs on the
user's machine and tunnels filesystem requests from the remote n8n instance.

**Decision**: Introduce a `LocalGateway` singleton and a separate
`@n8n/fs-proxy` CLI daemon package.

Key design choices:

1. **SSE + HTTP POST protocol**: The gateway uses a client-agnostic pattern
   (publish SSE event → await POST response). Any client that speaks SSE +
   HTTP POST can answer filesystem requests.

2. **Singleton gateway**: The `LocalGateway` is a singleton serving ALL
   threads from one daemon connection. This avoids requiring the daemon to
   connect per-thread.

3. **Dedicated SSE endpoint**: `GET /instance-ai/gateway/events` streams only
   `filesystem-request` events (no agent events mixed in). This keeps the daemon
   simple and avoids filtering.

4. **API key authentication**: The gateway endpoints use a shared API key
   (`N8N_INSTANCE_AI_GATEWAY_API_KEY`) with timing-safe comparison. SSE uses
   `?apiKey=` query param (EventSource can't set headers); POST endpoints use
   `X-Gateway-Key` header.

5. **2-tier priority**: When selecting a filesystem provider for a run:
   `Gateway > Local > None` (gateway takes priority so the daemon's project
   directory is used when both are available)

6. **Separate CLI package**: `@n8n/fs-proxy` is independently installable
   (`npx @n8n/fs-proxy`) so users don't need the full n8n installation. It
   reimplements core file-reading logic rather than importing from `packages/cli`
   to keep the daemon lightweight and decoupled.

7. **Auto-connect UX** (ADR-027): The frontend auto-detects the daemon and
   connects without any button clicks. See ADR-027 for details.

**Consequences**:
- Remote n8n instances can access local project files via the daemon
- Users run `npx @n8n/fs-proxy` — auto-connect handles the rest (no URL/token args)
- The daemon auto-reconnects with exponential backoff on disconnect
- The gateway protocol is the extensibility point — any app (Mac app, Electron,
  mobile companion) can implement the same SSE + HTTP POST protocol

---

## ADR-026: Auto-Detect Filesystem Mode (Local vs Gateway)

**Status**: Accepted (supersedes the `N8N_INSTANCE_AI_FILESYSTEM` boolean from ADR-024)

**Context**: `N8N_INSTANCE_AI_FILESYSTEM=true` (the default) hardcodes "use local
filesystem" regardless of whether there are useful files on disk:

- **Docker without volume mount**: Local FS is enabled but useless (only n8n's own
  files). Gateway is never tried.
- **Cloud/managed**: Same — config must be manually set to `false`.
- **Self-hosted bare metal**: Works by accident (default happens to be correct).

The boolean flag shifts a platform concern onto the user. The system has enough
information to decide automatically.

**Decision**: Remove the `N8N_INSTANCE_AI_FILESYSTEM` boolean. Auto-detect whether
local filesystem is useful using a simple heuristic:

1. `N8N_INSTANCE_AI_FILESYSTEM_PATH` explicitly set → local FS (restricted to that path)
2. Container detected → gateway only (no useful local files)
3. Bare metal (default) → local FS (unrestricted)

Container detection: `/.dockerenv` exists, `KUBERNETES_SERVICE_HOST` env var, or
`container` env var (systemd-nspawn/podman).

The `isLocalFilesystemAvailable()` method on `InstanceAiService` encapsulates this
logic and is used both for provider selection in `executeRun` and for reporting to
the frontend via module settings.

**Consequences**:
- One fewer env var for users to configure
- Docker users automatically get gateway mode without manual config
- Self-hosted bare-metal users keep zero-config local filesystem
- Explicit `FILESYSTEM_PATH` overrides container detection (volume-mount scenario)
- The `moduleSettings['instance-ai'].filesystem` boolean stays — semantics shift
  from "config flag" to "auto-detected availability" but the type and all consumers
  remain unchanged
- Container detection is a heuristic — edge cases (e.g., rootless containers without
  `/.dockerenv`) may need additional signals in the future

---

## ADR-027: Auto-Connect Proxy — Zero-Click Daemon UX

**Status**: Accepted

**Context**: The original gateway UX required 6 UI states and multiple clicks:
click terminal icon → panel opens → copy command with URL+token → run in terminal
→ wait → back to n8n. This friction undermined the "just works" goal.

For bare metal, auto-detection (ADR-026) already gives zero-click filesystem access.
The cloud/Docker path should match that simplicity.

**Decision**: When the fs-proxy daemon is running, n8n auto-detects and auto-connects.
No button clicks needed.

**Auto-connect flow**:
1. Component mounts → `startDaemonProbing()` pings `localhost:7655/health`
2. Daemon found → auto-call `connectDaemon()` (gets token from backend, tells daemon
   to connect, polls until gateway confirmed)
3. Daemon not found → show setup instructions with `npx @n8n/fs-proxy` command,
   keep probing every 5 seconds
4. When daemon starts later, probing picks it up within 5s and auto-connects

**Simplified UI (3 states instead of 6)**:
1. **Connected** (`isGatewayConnected || isLocalFilesystemEnabled`) → green indicator
2. **Auto-connecting** (`isDaemonConnecting`) → spinner
3. **Setup needed** (default) → `npx @n8n/fs-proxy` command + copy button + waiting spinner

**Provider priority**: `Gateway > Local > None` — when both are available, gateway
wins so the daemon's targeted project directory is preferred over unrestricted local FS.

**Consequences**:
- Users run `npx @n8n/fs-proxy` once and forget about it — no URL/token/flags needed
- The UI command is just `npx @n8n/fs-proxy` (the daemon discovers n8n automatically
  or the frontend sends connection details via the `/connect` endpoint)
- Periodic probing (5s interval) handles daemon starting after page load
- Removed: `isDaemonAvailable`, `probeDaemon`, `requestGatewayLink`, `gatewayCommand`,
  `showGatewayPanel`, "Connect" button, terminal icon trigger
- i18n keys simplified: removed 4 keys, updated 2, added 1

---

## ADR-028: Artifacts Panel Replaces Plan Panel

**Status**: Accepted

**Context**: Generated plans and workflows were scattered across the chat
message stream. The Plan side panel only showed the current plan. There was no
single place to see all generated artifacts (plans, workflows) at a glance.
Users want a shared workspace where they can see what the agent has produced
and quickly navigate to or edit those artifacts.

**Decision**: Replace `InstanceAiPlanPanel` with a unified `InstanceAiArtifactsPanel`
that presents all agent-produced artifacts as a flat list of collapsible cards.

**Design**:
- Flat card list — no tabs or sections, just cards in order: plan first, then
  workflows
- Each card is collapsible (click to expand/collapse inline)
- Plan card: shows goal (collapsed), expands to phase/iteration/steps
- Workflow cards: show name + "Open" link (collapsed), expand to show a
  `WorkflowMiniCanvas` preview (120px)
- Workflow data sourced from `resourceRegistry` (existing composable that scans
  tool-call results for workflow/credential/data-table entries)
- Full workflow objects fetched lazily via `workflowsListStore.fetchWorkflow()`
  for canvas preview
- Auto-opens when a plan or resource first appears (same trigger as old plan
  panel, extended to include `resourceRegistry.size > 0`)
- Toolbar button changed from `list-checks` icon to `layers` icon

**Consequences**:
- `InstanceAiPlanPanel.vue` deleted — single consumer was `InstanceAiView.vue`
- All plan-detail styles (metaRow, phaseBadge, stepList, etc.) moved into the
  new component
- New i18n keys: `instanceAi.artifactsPanel.*` (title, noArtifacts, plan,
  openWorkflow)
- Workflow cards link to `/workflow/:id` (opens in new tab) for editing
- Canvas preview reuses existing `WorkflowMiniCanvas` component
- Future artifact types (credentials, data tables) can be added as new card
  variants without structural changes
