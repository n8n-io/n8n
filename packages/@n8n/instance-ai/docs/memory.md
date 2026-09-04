# Memory System

## Overview

The memory system serves two purposes:

- **Operational context management** — observational memory that compresses
  the agent's operational history during long autonomous loops to prevent
  context degradation (thread-scoped)
- **Conversation history** — the stored messages for the current thread
  (thread-scoped)

Embedded specialist agents do not share the orchestrator's observational memory.

## Tiers

### Tier 1: Storage Backend

The persistence layer. Stores all messages, observational memory, plan state,
and event history.

Memory persists in the main n8n database via TypeORM — the same PostgreSQL or
SQLite instance n8n already uses, selected automatically from n8n's own database
configuration.

That backend holds message history, observational memory (observation log,
cursors and task locks), plan state in thread metadata, and checkpoints in
their own table.

### Tier 2: Observational Memory

Automatic context compression for long-running autonomous loops. Two background
agents manage the orchestrator's context size:

- **Observer** — when message tokens exceed a threshold (default: 30K), compresses
  old messages into dense observations
- **Reflector** — when observations exceed their threshold (default: 40K),
  condenses observations into higher-level patterns

```
Context window layout during autonomous loop:

┌──────────────────────────────────────────┐
│ Observation Block (≤40K tokens)          │  ← compressed history
│ "Built wf-123 with Schedule→HTTP→Slack.  │     (append-only, cacheable)
│  Exec failed: 401 on HTTP node.          │
│  Debugger identified missing API key.    │
│  Rebuilt workflow, re-executed, passed."  │
├──────────────────────────────────────────┤
│ Raw Message Block (≤30K tokens)          │  ← recent tool calls & results
│ [current step's tool calls and results]  │     (rotated as new messages arrive)
└──────────────────────────────────────────┘
```

Observer and Reflector jobs run through the `@n8n/agents` memory system. The
CLI tracks in-flight memory jobs per thread and records their model usage.
Both jobs use the configured Instance AI model.

Observational memory is **thread-scoped** — it tracks the operational history
of the current task.

### Tier 3: Plan Storage

The `create-tasks` tool stores execution plans in thread-scoped storage. Plans
are structured task graphs that persist across reconnects within a conversation.
See the [tools](./tools.md) documentation for the task graph schema.

## Scoping Model

All memory is thread-scoped (isolated per conversation):

- **Message history** — the stored conversation
- **Observational memory** — compressed operational history
- **Plan** — the current execution plan

### Embedded agent memory

The Agent Builder owns its session state separately from the orchestrator's
observational memory. Generic background-task state stays thread-scoped.

### Cross-user isolation

Each user's memory is fully independent. The agent cannot see other users'
conversations.

## Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_OBSERVER_MESSAGE_TOKENS` | number | 30000 | Observer trigger threshold |
| `N8N_INSTANCE_AI_REFLECTOR_OBSERVATION_TOKENS` | number | 40000 | Reflector trigger threshold |
| `N8N_INSTANCE_AI_THREAD_TTL_DAYS` | number | 30 | Thread TTL. Threads older than this expire, taking their memory with them. `0` disables expiry. |

Observer and Reflector use the orchestrator agent's model.
