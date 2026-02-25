# Memory System

How the agent remembers context across messages and conversations.

## Architecture Overview

```mermaid
graph TD
    A[Agent receives message] --> B[Load memory context]
    B --> C[Tier 1: Storage Backend]
    B --> D[Tier 2: Recent Messages]
    B --> E[Tier 3: Working Memory]
    B --> F[Tier 4: Semantic Recall]

    C --> C1[PostgreSQL - production]
    C --> C2[LibSQL/SQLite - development]

    D --> D1[Last N messages<br/>default: 20]

    E --> E1[Structured template<br/>updated by agent over time]

    F --> F1[Vector embeddings<br/>top-K retrieval]
    F -.->|only if embedderModel set| F1

    style F stroke-dasharray: 5 5
    style F1 stroke-dasharray: 5 5
```

## Tier 1: Storage Backend

All conversation data persists in a database. The backend selects the storage
engine based on the connection URL:

| URL prefix | Backend | Vector store | Use case |
|------------|---------|-------------|----------|
| `postgresql://` | `PostgresStore` | `PgVector` | Production deployments |
| Anything else | `LibSQLStore` | `LibSQLVector` | Local development (file-based) |

### Selection Logic

```typescript
const isPostgres = config.postgresUrl.startsWith('postgresql://');

if (isPostgres) {
  storage = new PostgresStore({ connectionString: config.postgresUrl });
  vector  = new PgVector(config.postgresUrl);
} else {
  storage = new LibSQLStore({ url: config.postgresUrl });
  vector  = new LibSQLVector(config.postgresUrl);
}
```

The backend service builds the URL automatically:
- **PostgreSQL**: Constructs `postgresql://user:password@host:port/database`
  from the existing n8n database config.
- **SQLite fallback**: Uses `file:instance-ai-memory.db` as a local file.

## Tier 2: Recent Messages

A sliding window of the most recent messages provides short-term context.

- **Default**: 20 messages
- **Configurable**: `N8N_INSTANCE_AI_LAST_MESSAGES` environment variable
- **Scope**: Per thread (see Thread Isolation below)

## Tier 3: Working Memory

A structured markdown template that the agent updates over time as it learns
about the user and their n8n instance.

### Template Structure

The working memory template has four sections:

**1. User Context**
- Name
- Role
- Organization

**2. Workflow Preferences**
- Preferred trigger types
- Common integrations used
- Workflow naming conventions
- Error handling patterns

**3. Current Goals**
- Active project/task
- Known issues being debugged
- Pending workflow changes

**4. Instance Knowledge**
- Frequently used credentials
- Key workflow IDs and names
- Custom node types available

Working memory is always enabled. The agent can read and update it across
conversations, building an evolving understanding of the user's needs.

## Tier 4: Semantic Recall (Optional)

Vector-based retrieval of semantically similar past messages. Only enabled when
an embedder model is configured.

| Setting | Default | Environment Variable |
|---------|---------|---------------------|
| Embedder model | _(disabled)_ | `N8N_INSTANCE_AI_EMBEDDER_MODEL` |
| Top-K results | 5 | `N8N_INSTANCE_AI_SEMANTIC_RECALL_TOP_K` |
| Context window | 2 before, 1 after | _(not configurable)_ |

### When Enabled

When `embedderModel` is set and `semanticRecallTopK` is not 0:

```typescript
semanticRecall: {
  topK: config.semanticRecallTopK ?? 5,
  messageRange: { before: 2, after: 1 },
}
```

This retrieves the top-K most relevant past messages (with surrounding context)
and includes them in the agent's prompt alongside recent messages.

### When Disabled

If no embedder model is configured, semantic recall is skipped entirely. The
agent relies solely on the recent message window and working memory.

## Memory Creation

The `createMemory()` factory assembles all tiers:

```typescript
function createMemory(config: InstanceAiMemoryConfig): Memory
```

### Configuration Interface

```typescript
interface InstanceAiMemoryConfig {
  postgresUrl: string;           // Storage backend connection URL
  embedderModel?: string;        // Embedder for semantic recall (optional)
  lastMessages?: number;         // Recent message window (default: 20)
  semanticRecallTopK?: number;   // Semantic search results (default: 5)
}
```

## Thread Isolation

Memory is scoped to a specific user and thread:

```typescript
agent.stream(message, {
  memory: {
    resource: userId,     // User-level isolation
    thread: threadId,     // Conversation-level isolation
  },
});
```

- **resource** = the authenticated user's ID. Different users have completely
  separate memory spaces.
- **thread** = the conversation thread ID (UUID). Each thread maintains its own
  message history while sharing working memory within the user scope.

## Related Docs

- [Configuration](../../configuration.md) — environment variables for memory settings
- [Backend Module](../../internals/backend-module.md) — how the service builds the memory config
- [Chat & Streaming](../chat/) — how memory context feeds into each request
