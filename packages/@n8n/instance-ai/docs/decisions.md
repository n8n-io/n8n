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
- Memory tiers (working memory, semantic recall) come from Mastra's memory layer
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

**Status**: Accepted

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

## ADR-006: Tool Confirmation via Tool Metadata (Proposed)

**Status**: Proposed

**Context**: The autonomous execution loop needs to run without user intervention
for safe operations, but destructive operations must require confirmation. The
current approach relies on the system prompt telling the agent to "confirm before
deleting."

**Decision**: Tools should declare their confirmation requirement in metadata,
not rely on the system prompt alone.

**Consequences**:
- Confirmation is enforced structurally, not just by LLM instruction-following
- The frontend can render confirmation UI before tool execution
- Safe tools (list, get, run) execute in the autonomous loop without pausing
- Destructive tools (delete, update-production) pause for user approval
- MCP tools need a default policy (confirm by default? or not?)
- Requires extending the tool definition schema and frontend chunk handling

---

## ADR-007: Workflow Evaluations for Agent Feedback Loop (Proposed)

**Status**: Proposed

**Context**: The autonomous loop needs to know whether a workflow produced the
*right* result, not just whether it ran without errors. Simple success/error
checking is insufficient for quality assurance.

**Decision**: Integrate n8n's native workflow evaluation system (eval triggers
and metrics) into the agent's autonomous loop.

**Consequences**:
- Agent can run evaluations as part of the inspect → evaluate → debug cycle
- Requires new tools: `run-evaluation`, `get-evaluation-results`
- Evaluation workflows must be createable by the agent (or pre-configured)
- The agent has quantitative signals (metrics) to decide whether to iterate
- Complex to bootstrap — who writes the first evaluation workflow?

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
