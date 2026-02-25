# Memory System

## Overview

The agent's memory system manages conversation context across multiple tiers,
from recent messages to long-term semantic recall. Memory is scoped per user
and per conversation thread.

## Tiers

### Tier 1: Storage Backend

The persistence layer. Stores all messages, working memory state, and vector
embeddings.

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
across messages.

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

### Tier 4: Semantic Recall (Optional)

Vector-based retrieval of relevant past messages. When enabled, the system
embeds each message and retrieves semantically similar past messages to include
as context.

- **Requires**: `N8N_INSTANCE_AI_EMBEDDER_MODEL` to be set
- **Config**: `N8N_INSTANCE_AI_SEMANTIC_RECALL_TOP_K` (default: 5)
- **Message range**: 2 messages before and 1 after each match

Disabled by default. When the embedder model is not set, only tiers 1–3 are
active.

## Thread Isolation

Memory is scoped to two dimensions:

```typescript
agent.stream(message, {
  memory: {
    resource: userId,    // User-level isolation
    thread: threadId,    // Conversation-level isolation
  },
});
```

- Each user has independent memory — agents can't see other users' conversations
- Each thread within a user is independent — starting a new thread starts fresh
  (but working memory carries over within a user's resource scope)

## Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_LAST_MESSAGES` | number | 20 | Recent message window |
| `N8N_INSTANCE_AI_EMBEDDER_MODEL` | string | `''` | Embedder model (empty = disabled) |
| `N8N_INSTANCE_AI_SEMANTIC_RECALL_TOP_K` | number | 5 | Number of semantic matches |
