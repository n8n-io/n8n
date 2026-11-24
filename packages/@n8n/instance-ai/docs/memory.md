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
| `N8N_INSTANCE_AI_OBSERVATION_MAX_WINDOW_TOKENS` | number | 200000 | Largest window for memory thresholds. Thresholds are shares of the model window or this value, whichever is smaller. `0` uses the full model window |
| `N8N_INSTANCE_AI_OBSERVER_MESSAGE_TOKENS` | number | 30000 | Fixed Observer threshold. Applies only when the max window is `0` and the model window is unknown |
| `N8N_INSTANCE_AI_REFLECTOR_OBSERVATION_TOKENS` | number | unset | Fixed Reflector threshold. When unset, the threshold is a share of the memory window. When set, it replaces that share |
| `N8N_INSTANCE_AI_MID_RUN_OBSERVATION` | boolean | true | Summarize during a long turn, between tool calls |
| `N8N_INSTANCE_AI_OBSERVATION_LOG_PLACEMENT` | `system` \| `message` | message | Where the summary goes |
| `N8N_INSTANCE_AI_OBSERVATION_FAILURE_POLICY` | `disableForRun` \| `retry` | retry | What to do when an Observer call fails |
| `N8N_INSTANCE_AI_OBSERVER_MAX_BATCHES` | number | 5 | Maximum Observer calls after one turn. `0` means no limit |
| `N8N_INSTANCE_AI_REFLECTION_MODE` | `background` \| `afterObserve` | background | When the Reflector runs |
| `N8N_INSTANCE_AI_HISTORY_RECALL` | boolean | true | Enable the `read_history` tool |
| `N8N_INSTANCE_AI_THREAD_TTL_DAYS` | number | 30 | Thread TTL. Threads older than this expire, taking their memory with them. `0` disables expiry. |

Observer and Reflector run on the utility model (`N8N_INSTANCE_AI_UTILITY_MODEL`). Without a utility model they use the orchestrator agent's model.
