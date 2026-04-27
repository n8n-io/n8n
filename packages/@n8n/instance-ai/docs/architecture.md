# Architecture

## Overview

Instance AI is an autonomous agent embedded in every n8n instance. It provides a
natural language interface to workflows, executions, credentials, and nodes — with
the goal that most users never need to interact with workflows directly.

The system follows the **deep agent architecture** — an orchestrator with explicit
planning, dynamic sub-agent delegation, observational memory, and structured
prompts. The LLM controls the execution loop; the architecture provides the
primitives.

The system is LLM-agnostic and designed to work with any capable language model.

## System Diagram

```mermaid
graph TB
    subgraph Frontend ["Frontend (Vue 3)"]
        UI[Chat UI] --> Store[Pinia Store]
        Store --> SSE[SSE Event Client]
        Store --> API[Stream API Client]
    end

    subgraph Backend ["Backend (Express)"]
        API -->|POST /instance-ai/chat/:threadId| Controller
        SSE -->|GET /instance-ai/events/:threadId| EventEndpoint[SSE Endpoint]
        Controller --> Service[InstanceAiService]
        EventEndpoint --> EventBus[Event Bus]
    end

    subgraph Orchestrator ["Orchestrator Agent"]
        Service --> Factory[Agent Factory]
        Factory --> OrcAgent[Orchestrator]
        OrcAgent --> PlanTool[Plan Tool]
        OrcAgent --> DelegateTool[Delegate Tool]
        OrcAgent --> DirectTools[Domain Tools]
        OrcAgent --> MCPTools[MCP Tools]
        OrcAgent --> Memory[Memory System]
    end

    subgraph SubAgents ["Dynamic Sub-Agents"]
        DelegateTool -->|spawns| SubAgent1[Sub-Agent A]
        DelegateTool -->|spawns| SubAgent2[Sub-Agent B]
        SubAgent1 --> ToolSubset1[Tool Subset]
        SubAgent2 --> ToolSubset2[Tool Subset]
    end

    subgraph EventSystem ["Event System"]
        OrcAgent -->|publishes| EventBus
        SubAgent1 -->|publishes| EventBus
        SubAgent2 -->|publishes| EventBus
        EventBus --> ThreadStorage[Thread Event Storage]
    end

    subgraph Filesystem ["Filesystem Access"]
        Service --> Gateway[LocalGateway]
        Gateway -->|SSE + HTTP POST| Daemon["@n8n/computer-use daemon"]
    end

    subgraph n8n ["n8n Services"]
        Service --> Adapter[AdapterService]
        Adapter --> WorkflowService
        Adapter --> ExecutionService
        Adapter --> CredentialsService
        Adapter --> NodeLoader[LoadNodesAndCredentials]
    end

    subgraph Storage ["Storage"]
        Memory --> PostgreSQL
        Memory --> SQLite[LibSQL / SQLite]
        ThreadStorage --> PostgreSQL
        ThreadStorage --> SQLite
    end

    subgraph Sandbox ["Sandbox (Optional)"]
        Service -->|per-thread| WorkspaceManager[Workspace Manager]
        WorkspaceManager --> DaytonaSandbox[Daytona Container]
        WorkspaceManager --> LocalSandbox[Local Sandbox]
        DaytonaSandbox --> SandboxFS[Filesystem + execute_command]
        LocalSandbox --> SandboxFS
    end


    subgraph MCP ["MCP Servers"]
        MCPTools --> ExternalServer1[External MCP Server]
        MCPTools --> ExternalServer2[External MCP Server]
    end
```

## Deep Agent Architecture

The system implements the four pillars of the deep agent pattern:

### 1. Explicit Planning

The orchestrator uses a `plan` tool to externalize its execution strategy.
Between phases of the autonomous loop, the orchestrator reviews and updates the
plan. This serves as a context engineering mechanism — writing the plan forces
structured reasoning, and reading it back prevents goal drift over long loops.

Plans are stored in thread-scoped storage (see ADR-017).

### 2. Dynamic Sub-Agent Composition

The orchestrator composes sub-agents on the fly via the `delegate` tool. Instead
of a fixed taxonomy (Builder, Debugger, Evaluator), the orchestrator specifies:

- **Role** — free-form description ("workflow builder", "credential validator")
- **Instructions** — task-specific system prompt
- **Tools** — subset of registered tools the sub-agent needs

Sub-agents are stateless (ADR-011), get clean context windows, and publish events
directly to the event bus (ADR-014). They cannot spawn their own sub-agents.

### 3. Observational Memory

Mastra's observational memory compresses old messages into dense observations via
background Observer and Reflector agents. Tool-heavy workloads (workflow
definitions, execution results) get 5–40x compression. This prevents context
degradation over 50+ step autonomous loops (see ADR-016).

### 4. Structured System Prompt

The orchestrator's system prompt covers delegation patterns, planning discipline,
loop behavior, and tool usage guidelines. Sub-agents get focused, task-specific
prompts written by the orchestrator.

## Agent Hierarchy

```mermaid
graph TD
    O[Orchestrator Agent] -->|delegate| S1[Sub-Agent: role A]
    O -->|build-workflow-with-agent| S2[Builder Agent]
    O -->|plan| S3[Planned Tasks]
    O -->|direct| T1[list-workflows]
    O -->|direct| T2[run-workflow]
    O -->|direct| T3[get-execution]
    O -->|direct| T4[plan]

    S3 -->|kind: build-workflow| S4[Builder Agent]
    S3 -->|kind: manage-data-tables| S5[Data Table Agent]
    S3 -->|kind: research| S6[Research Agent]
    S3 -->|kind: delegate| S7[Custom Sub-Agent]

    S1 -->|tools| T5[get-execution]
    S1 -->|tools| T6[get-workflow]
    S2 -->|tools| T7[search-nodes]
    S2 -->|tools| T8[build-workflow]

    style O fill:#f9f,stroke:#333
    style S1 fill:#bbf,stroke:#333
    style S2 fill:#bbf,stroke:#333
    style S3 fill:#ffa,stroke:#333
    style S4 fill:#bbf,stroke:#333
    style S5 fill:#bbf,stroke:#333
    style S6 fill:#bbf,stroke:#333
    style S7 fill:#bbf,stroke:#333
```

**Orchestrator** handles directly:
- Read-only queries (list-workflows, get-execution, list-credentials)
- Execution triggers (run-workflow)
- Planning (plan tool — always direct)
- Verification and credential application (verify-built-workflow, apply-workflow-credentials)

**Single-task delegation** (`delegate`, `build-workflow-with-agent`):
- Complex multi-step operations (building workflows, debugging failures)
- Tasks that benefit from clean context (no accumulated noise)
- Builder agent runs as a background task — returns immediately

**Multi-task plans** (`plan` tool):
- Dependency-aware task graphs with parallel execution
- Each task dispatched to a preconfigured agent (builder, data-table, research, or delegate)
- User approves the plan before execution starts

The orchestrator decides what to delegate based on complexity — simple reads
stay direct, complex operations go to focused sub-agents.

## Package Responsibilities

### `@n8n/instance-ai` (Core)

The agent package — framework-agnostic business logic.

- **Agent factory** (`agent/`) — creates orchestrator instances with tools, memory, MCP, and tool search
- **Sub-agent factory** (`agent/`) — creates stateless sub-agents with mandatory protocol and tool subsets
- **Orchestration tools** (`tools/orchestration/`) — `plan`, `delegate`, `build-workflow-with-agent`, `update-tasks`, `cancel-background-task`, `correct-background-task`, `verify-built-workflow`, `report-verification-verdict`, `apply-workflow-credentials`, `browser-credential-setup`
- **Domain tools** (`tools/`) — native tools across workflows, executions, credentials, nodes, data tables, workspace, web research, filesystem, templates, and best practices
- **Runtime** (`runtime/`) — stream execution engine, resumable streams with HITL suspension, background task manager, run state registry
- **Planned tasks** (`planned-tasks/`) — task graph coordination, dependency resolution, scheduled execution
- **Workflow loop** (`workflow-loop/`) — deterministic build→verify→debug state machine for workflow builder agents
- **Workflow builder** (`workflow-builder/`) — TypeScript SDK code parsing, validation, patching, and prompt sections
- **Workspace** (`workspace/`) — sandbox provisioning (Daytona / local), filesystem abstraction, snapshot management
- **Memory** (`memory/`) — title generation, memory configuration
- **Compaction** (`compaction/`) — LLM-based message history summarization for long conversations
- **Storage** (`storage/`) — iteration logs, task storage, planned task storage, workflow loop storage, agent tree snapshots
- **MCP client** (`mcp/`) — manages connections to external MCP servers, schema sanitization for Anthropic compatibility
- **Domain access** (`domain-access/`) — domain gating and access tracking for external URL approval
- **Stream mapping** (`stream/`) — Mastra chunk → canonical event translation, HITL consumption
- **Event bus interface** (`event-bus/`) — publishing agent events to the thread channel
- **Tracing** (`tracing/`) — LangSmith integration for step-level observability
- **System prompt** (`agent/`) — dynamic context-aware prompt based on instance configuration
- **Types** (`types.ts`) — all shared interfaces, service contracts, and data models

This package has **no dependency on n8n internals**. It defines service interfaces
(`InstanceAiWorkflowService`, etc.) that the backend adapter implements.

### `packages/cli/src/modules/instance-ai/` (Backend)

The n8n integration layer.

- **Module** — lifecycle management, DI registration, settings exposure. Only runs on `main` instance type.
- **Controller** — REST endpoints for messages, SSE events, confirmations, threads, credits, and gateway
- **Service** — orchestrates agent creation, config parsing, storage setup, planned task scheduling, background task management
- **Adapter** — bridges n8n services to agent interfaces, enforces RBAC permissions
- **Memory service** — thread lifecycle, message persistence, expiration
- **Settings service** — admin settings (model, MCP, sandbox), user preferences
- **Event bus** — in-process EventEmitter (single instance) or Redis Pub/Sub
  (queue mode), with thread storage for event persistence and replay (max 500 events or 2 MB per thread)
- **Filesystem** — `LocalGateway` (remote daemon via SSE protocol).
  See `docs/filesystem-access.md`
- **Entities** — TypeORM entities for thread, message, memory, snapshots, iteration logs
- **Repositories** — data access layer (7 TypeORM repositories)

### `packages/@n8n/api-types` (Shared Types)

The contract between frontend and backend.

- **Event schemas** — `InstanceAiEvent` discriminated union, `InstanceAiEventType` enum
- **Agent types** — `InstanceAiAgentStatus`, `InstanceAiAgentKind`, `InstanceAiAgentNode`
- **Task types** — `TaskItem`, `TaskList` for progress tracking
- **Confirmation types** — approval, text input, questions, plan review payloads
- **DTOs** — request/response shapes for REST API
- **Push types** — gateway state changes, credit metering events
- **Reducer** — `AgentRunState`, `InstanceAiMessage` for frontend state machine

### `packages/frontend/.../instanceAi/` (Frontend)

The chat interface.

- **Store** — thread management, message state, agent tree rendering, SSE connection lifecycle
- **Reducer** — event reducer that processes SSE events into agent tree state
- **SSE client** — subscribes to event stream, handles reconnect with replay
- **API client** — REST client for messages, confirmations, threads, memory, settings
- **Agent tree** — renders orchestrator + sub-agent events as a collapsible tree
- **Components** — input, workflow preview, tool call steps, task checklist, credential setup modal, domain access approval, debug/memory panels

## Key Design Decisions

### 1. Clean Interface Boundary

The `@n8n/instance-ai` package defines service interfaces, not implementations.
The backend adapter implements these against real n8n services. This means:

- The agent core is testable in isolation
- The agent core can be reused outside n8n (e.g., CLI, tests)
- Swapping the agent framework doesn't affect n8n integration

### 2. Agent Created Per Request

A new orchestrator instance is created for each `sendMessage` call. This is
intentional:

- MCP server configuration can change between requests
- User context (permissions) is request-scoped
- Memory is handled externally (storage-backed), not in-agent
- Sub-agents are created dynamically within the request lifecycle

### 3. Pub/Sub Streaming

The event bus decouples agent execution from event delivery:

- All agents (orchestrator + sub-agents) publish to a per-thread channel
- Frontend subscribes via SSE with `Last-Event-ID` for reconnect/replay
- All events carry `runId` (correlates to triggering message) and `agentId`
- SSE events use monotonically increasing per-thread `id` values for replay
- SSE supports both `Last-Event-ID` header and `?lastEventId` query parameter
- Events are persisted to thread storage regardless of transport
- No need to pipe sub-agent streams through orchestrator tool execution
- One active run per thread (additional `POST /chat` is rejected while active)
- Cancellation via `POST /instance-ai/chat/:threadId/cancel` (idempotent)

### 4. Module System Integration

Instance AI uses n8n's module system (`@BackendModule`). This means:

- It can be disabled via `N8N_DISABLED_MODULES=instance-ai`
- It only runs on `main` instance type (not workers)
- It exposes settings to the frontend via the module `settings()` method
- It has proper shutdown lifecycle for MCP connection cleanup

## Runtime & Streaming

The agent runtime is built on Mastra's streaming primitives with added
resumability, HITL suspension, and background task management.

### Stream Execution

```
streamAgentRun() → agent.stream() → executeResumableStream()
  ├─ for each chunk: mapMastraChunkToEvent() → eventBus.publish()
  ├─ on suspension: wait for confirmation → agent.resumeStream() → loop
  └─ return StreamRunResult {status, mastraRunId, text}
```

The `executeResumableStream()` loop consumes Mastra chunks, translates them to
canonical `InstanceAiEvent` schema, publishes to the event bus, and handles HITL
suspension/resume cycles. Two control modes:

- **Manual** — returns suspension to caller (used by the orchestrator's main run)
- **Auto** — waits for confirmation and resumes automatically (used by background sub-agents)

### Background Task Manager

Long-running tasks (workflow builds, data table operations, research) run as
background tasks with concurrency limits (default: 5 per thread). Features:

- **Correction queueing** — users can steer running tasks mid-flight via
  `correct-background-task`
- **Cancellation** — three surfaces converge: stop button, "stop that" message,
  or `cancelRun` (global stop)
- **Message enrichment** — running task context is injected into the orchestrator's
  messages so it can reference task IDs

### Run State Registry

In-memory registry of active, suspended, and pending runs per thread. Manages:

- Active run tracking (one per thread)
- Suspended run state (awaiting HITL confirmation)
- Pending confirmation resolution
- Timeout sweeping for stale suspensions

## Planned Tasks & Workflow Loop

### Planned Task System

The `plan` tool creates dependency-aware task graphs for multi-step work. Each
task has a `kind` that determines its executor:

| Kind | Executor | Tools |
|------|----------|-------|
| `build-workflow` | Builder agent | search-nodes, build-workflow, get-node-type-definition, etc. |
| `manage-data-tables` | Data table agent | All `*-data-table*` tools |
| `research` | Research agent | web-search, fetch-url |
| `delegate` | Custom sub-agent | Orchestrator-specified subset |

Tasks run detached as background agents. Dependencies are respected — a task
only starts when all its `deps` have succeeded. The plan is shown to the user
for approval before execution begins.

### Workflow Loop State Machine

The workflow builder follows a deterministic state machine for the
build→verify→debug cycle:

```
build → submit → verify → (success | needs_patch | needs_rebuild | failed_terminal)
                              ↓           ↓               ↓
                           finalize    patch+submit    rebuild+submit
                                          ↓               ↓
                                        verify          verify
```

The `report-verification-verdict` tool feeds results into this state machine,
which returns guidance for the next action. Same failure signature twice triggers
a terminal state to prevent infinite loops.

## Tool Search & Deferred Tools

To keep the orchestrator's context lean, tools are stratified into two tiers:

- **Core tools** (always-loaded): `plan`, `delegate`, `ask-user`, `web-search`,
  `fetch-url` — these are directly available to the LLM
- **Deferred tools** (behind ToolSearchProcessor): all other domain tools —
  discovered on-demand via `search_tools` and activated via `load_tool`

This follows Anthropic's guidance on tool search for agents with large tool sets.
The processor is configurable via `disableDeferredTools` flag.

## MCP Integration

External MCP servers are connected via `McpClientManager`. Their tools are:

1. **Schema-sanitized** for Anthropic compatibility (ZodNull → optional,
   discriminated unions → flattened objects, array types → recursive element fix)
2. **Name-checked** against reserved domain tool names (prevents malicious
   shadowing of tools like `run-workflow`)
3. **Separated** from domain tools in the orchestrator's tool set
4. **Cached** by config hash across agent instances

Browser MCP tools (Chrome DevTools) are excluded from the orchestrator to avoid
context bloat from screenshots. They're available to `browser-credential-setup`
sub-agents.

## Tracing & Observability

LangSmith integration provides step-level observability:

- **Agent runs** — root trace spans with metadata (agent_id, thread_id, model)
- **LLM steps** — per-step traces with messages, reasoning, tool calls, usage,
  finish reason
- **Sub-agent traces** — child spans under parent agent runs
- **Synthetic tool traces** — internal tools tracked separately from
  LLM-invoked tools

## Message Compaction

For conversations that exceed the context window, `generateCompactionSummary()`
creates an LLM-generated summary of the conversation history. The summary uses
a structured format (Goal, Important facts, Current state, Open issues, Next
step) and is included as a `<conversation-summary>` block in subsequent requests.

## Domain Access Gating

The `DomainAccessTracker` manages per-domain approval for external URL access.
When the agent calls `fetch-url`, the domain is checked against the tracker.
Unapproved domains trigger a HITL confirmation with `domainAccess` payload,
allowing the user to approve or deny access to specific hosts.

## Security Model

- **Permission scoping** — all operations go through n8n's RBAC permission system via the adapter (`userHasScopes()`)
- **Credential safety** — tool outputs never include decrypted secrets; credential setup uses the n8n frontend UI where secrets are handled securely
- **HITL confirmation** — destructive operations (delete, publish, restore) require user approval via the suspension protocol
- **Domain access gating** — external URL fetches require per-domain user approval
- **Memory isolation** — messages, observations, plans, and event history are
  thread-scoped. Cross-user isolation is enforced.
- **Sub-agent containment** — sub-agents cannot spawn their own sub-agents,
  can only use native domain tools from the registered pool (no MCP tools), and
  have low `maxSteps`. A mandatory protocol prevents cascading delegation.
- **MCP tool isolation** — MCP tools are name-checked against reserved domain tool
  names to prevent malicious shadowing. Schema sanitization prevents schema-based attacks.
- **Sandbox isolation** — when enabled, code execution runs in isolated Daytona
  containers (not on the host). File writes are path-traversal protected (must
  stay within workspace root). Shell paths are quoted to prevent injection.
  See `docs/sandboxing.md` for details.
- **Filesystem safety** — read-only interface, 512KB file size cap, binary
  detection, default directory exclusions (node_modules, .git, dist), symlink
  escape protection when basePath is set, 30s timeout per gateway request.
  See `docs/filesystem-access.md` for the full security model.
- **Web research safety** — SSRF protection blocks private IPs, loopback, and non-HTTP(S) schemes.
  Post-redirect SSRF check prevents open-redirect attacks. Fetched content is treated as untrusted.
- **Module gating** — disabled by default unless `N8N_INSTANCE_AI_MODEL` is set
