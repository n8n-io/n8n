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
