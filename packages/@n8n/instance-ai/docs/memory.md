# Memory System

## Overview

The memory system serves two purposes:

- **Operational context management** — observational memory that compresses
  the agent's operational history during long autonomous loops to prevent
  context degradation (thread-scoped)
- **Conversation history** — recent messages for the current thread
  (thread-scoped)

Sub-agents are stateless — context is passed via the briefing only.

## Tiers

### Tier 1: Storage Backend

The persistence layer. Stores all messages, observational memory, plan state,
and event history.

| Backend | When Used | Connection |
|---------|-----------|------------|
| PostgreSQL | n8n is configured with `postgresdb` | Built from n8n's DB config |
| LibSQL/SQLite | All other cases (default) | `file:instance-ai-memory.db` |

The storage backend is selected automatically based on n8n's database
configuration — no separate config needed.

### Tier 2: Recent Messages

The recent conversation history loaded from storage and sent as context to the
LLM. For short threads the full history is loaded; once observational memory has
run, only the messages since the observation cursor are loaded raw (older turns
are represented by the observation block — see Tier 3).

### Tier 2.5: Thread Anchor

Durable conversation invariants — the user's **original goal** and the
**workflows built** in the thread — persisted on the thread and re-injected into
the system prompt on **every** turn (see `ThreadAnchor`). Unlike Tiers 2–3 it is
not part of the message list, so it survives the recent-message reconstruction,
observational compaction, and HITL suspends. This is what stops the agent from
re-asking answered questions, losing the original request, or claiming "this is
the start of our conversation" mid-thread.

### Tier 3: Observational Memory

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

**Why this matters for the autonomous loop**:

- Tool-heavy workloads (workflow definitions, execution results, node
  descriptions) get **5–40x compression** — a 50-step loop that would blow
  out the context window stays manageable
- The observation block is **append-only** until reflection runs, enabling
  high prompt cache hit rates (4–10x cost reduction)
- **Async buffering** pre-computes observations in the background — no
  user-visible pause when the threshold is hit
- Uses the orchestrator agent's model for compression — same credentials and
  provider as the main conversation

Observational memory is **thread-scoped** — it tracks the operational history
of the current task.

### Tier 4: Plan Storage

The `create-tasks` tool stores execution plans in thread-scoped storage. Plans
are structured task graphs that persist across reconnects within a conversation.
See the [tools](./tools.md) documentation for the task graph schema.

## Scoping Model

All memory is thread-scoped (isolated per conversation):

- **Recent messages** — the sliding window of N messages
- **Observational memory** — compressed operational history
- **Plan** — the current execution plan

### Sub-agent memory

Sub-agents are fully stateless — context is passed via the briefing and
`conversationContext` fields in the `delegate` tool.

Past failed attempts are tracked via the `IterationLog` (stored in thread
metadata) and appended to sub-agent briefings on retry, providing cross-attempt
context without persistent memory.

### Cross-user isolation

Each user's memory is fully independent. The agent cannot see other users'
conversations.

## Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_OBSERVER_MESSAGE_TOKENS` | number | 30000 | Observer trigger threshold |
| `N8N_INSTANCE_AI_REFLECTOR_OBSERVATION_TOKENS` | number | 40000 | Reflector trigger threshold |

Observer and Reflector use the orchestrator agent's model.
