# Memory System

## Overview

The memory system serves two distinct purposes:

- **Long-term user knowledge** — working memory that persists the agent's
  understanding of the user, their preferences, and instance knowledge across
  all conversations (user-scoped)
- **Operational context management** — observational memory that compresses
  the agent's operational history during long autonomous loops to prevent
  context degradation (thread-scoped)
- **Conversation history** — recent messages and semantic recall for the
  current thread (thread-scoped)

Sub-agents currently have working memory **disabled** (`workingMemoryEnabled:
false`). They are stateless — context is passed via the briefing only.

## Tiers

### Tier 1: Storage Backend

The persistence layer. Stores all messages, working memory state, observational
memory, plan state, event history, and vector embeddings.

| Backend | When Used | Connection |
|---------|-----------|------------|
| PostgreSQL | n8n is configured with `postgresdb` | Built from n8n's DB config |
| LibSQL/SQLite | All other cases (default) | `file:instance-ai-memory.db` |

The storage backend is selected automatically based on n8n's database
configuration — no separate config needed.

### Tier 2: Recent Messages

A sliding window of the most recent N messages in the conversation, sent as
context to the LLM on every request.

- **Default**: 20 messages
- **Config**: `N8N_INSTANCE_AI_LAST_MESSAGES`

### Tier 3: Working Memory

A structured markdown template that the agent can update during conversation.
It persists information the agent learns about the user and their instance
across messages. Working memory is **user-scoped** — it carries across threads.

```markdown
# User Context
- **Name**:
- **Role**:
- **Organization**:

# Workflow Preferences
- **Preferred trigger types**:
- **Common integrations used**:
- **Workflow naming conventions**:
- **Error handling patterns**:

# Current Goals
- **Active project/task**:
- **Known issues being debugged**:
- **Pending workflow changes**:

# Instance Knowledge
- **Frequently used credentials**:
- **Key workflow IDs and names**:
- **Custom node types available**:
```

The agent fills this in over time as it learns about the user. Working memory
is included in every request, giving the agent persistent context beyond the
recent message window.

### Tier 4: Observational Memory

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
- Uses a secondary LLM (default: `google/gemini-2.5-flash`) for compression —
  cheap and has a 1M token context window for the Reflector

Observational memory is **thread-scoped** — it tracks the operational history
of the current task, not long-term user knowledge (that's working memory's job).

### Tier 5: Semantic Recall (Optional)

Vector-based retrieval of relevant past messages. When enabled, the system
embeds each message and retrieves semantically similar past messages to include
as context.

- **Requires**: `N8N_INSTANCE_AI_EMBEDDER_MODEL` to be set
- **Config**: `N8N_INSTANCE_AI_SEMANTIC_RECALL_TOP_K` (default: 5)
- **Message range**: 2 messages before and 1 after each match

Disabled by default. When the embedder model is not set, only tiers 1–4 are
active.

### Tier 6: Plan Storage

The `plan` tool stores execution plans in thread-scoped storage. Plans are
structured data (goal, current phase, iteration count, step statuses) that
persist across reconnects within a conversation. See the [tools](./tools.md)
documentation for the plan tool schema.

## Scoping Model

Memory is scoped to two dimensions:

```typescript
agent.stream(message, {
  memory: {
    resource: userId,    // User-level — working memory lives here
    thread: threadId,    // Thread-level — messages, observations, plan live here
  },
});
```

### What's user-scoped (persists across threads)

- **Working memory** — the agent's accumulated understanding of the user
  (preferences, frequently used workflows, instance knowledge)

### What's thread-scoped (isolated per conversation)

- **Recent messages** — the sliding window of N messages
- **Observational memory** — compressed operational history
- **Semantic recall** — vector retrieval of relevant past messages
- **Plan** — the current execution plan

### Sub-agent memory

Sub-agents currently have working memory **disabled**. They are fully stateless —
context is passed via the briefing and `conversationContext` fields in the
`delegate` and `build-workflow-with-agent` tools.

Past failed attempts are tracked via the `IterationLog` (stored in thread
metadata) and appended to sub-agent briefings on retry, providing cross-attempt
context without persistent memory.

### Cross-user isolation

Each user's memory is fully independent. The agent cannot see other users'
conversations, working memory, or semantic history.

## Memory vs. Observational Memory

These serve different purposes and both are active simultaneously:

| Aspect | Working Memory | Observational Memory |
|--------|---------------|---------------------|
| **Scope** | User-scoped | Thread-scoped |
| **Content** | User preferences, instance knowledge | Compressed operational history |
| **Lifecycle** | Persists forever, across all threads | Lives with the conversation |
| **Updated by** | Agent (explicit writes) | Background Observer/Reflector (automatic) |
| **Example** | "User prefers Slack, uses cred-1" | "Built wf-123, exec failed, fixed HTTP auth" |

## Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_LAST_MESSAGES` | number | 20 | Recent message window |
| `N8N_INSTANCE_AI_EMBEDDER_MODEL` | string | `''` | Embedder model (empty = disabled) |
| `N8N_INSTANCE_AI_SEMANTIC_RECALL_TOP_K` | number | 5 | Number of semantic matches |
| `N8N_INSTANCE_AI_OBSERVER_MODEL` | string | `google/gemini-2.5-flash` | LLM for Observer/Reflector |
| `N8N_INSTANCE_AI_OBSERVER_MESSAGE_TOKENS` | number | 30000 | Observer trigger threshold |
| `N8N_INSTANCE_AI_REFLECTOR_OBSERVATION_TOKENS` | number | 40000 | Reflector trigger threshold |
