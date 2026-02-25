# Configuration

Environment variables and setup reference for Instance AI.

## Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_MODEL` | `string` | `anthropic/claude-sonnet-4-5` | LLM model in `provider/model` format. Must be set for the module to be enabled. |
| `N8N_INSTANCE_AI_MCP_SERVERS` | `string` | `''` | Comma-separated MCP server configs: `name=url,name=url` |
| `N8N_INSTANCE_AI_LAST_MESSAGES` | `number` | `20` | Number of recent messages to include in context |
| `N8N_INSTANCE_AI_EMBEDDER_MODEL` | `string` | `''` | Embedder model for semantic recall. Empty = disabled. |
| `N8N_INSTANCE_AI_SEMANTIC_RECALL_TOP_K` | `number` | `5` | Number of semantically similar messages to retrieve |
| `N8N_INSTANCE_AI_TIMEOUT` | `number` | `120000` | Agent response timeout in milliseconds |
| `N8N_DISABLED_MODULES` | `string` | `''` | Comma-separated module names to disable (add `instance-ai` to disable) |

All variables are defined in the `InstanceAiConfig` class at
`packages/@n8n/config/src/configs/instance-ai.config.ts` and accessed via
`globalConfig.instanceAi`.

## Enabled Check

The module is enabled when **both** conditions are true:

1. `instance-ai` is **not** in `N8N_DISABLED_MODULES`
2. `N8N_INSTANCE_AI_MODEL` has a non-empty value

The service checks condition 2 via `isEnabled()`:

```typescript
isEnabled(): boolean {
  return !!this.instanceAiConfig.model;
}
```

The module registry checks condition 1 during module loading.

## Setup Scenarios

### Minimal Setup

Just set the model. Everything else uses defaults.

```bash
export N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-5
```

This gives you:
- AI chat with Claude Sonnet 4.5
- 20 recent messages in context
- Working memory (agent learns about your usage over time)
- No semantic recall
- No MCP servers
- SQLite-based memory storage (if n8n uses SQLite) or PostgreSQL (if n8n uses PostgreSQL)

### With Semantic Memory

Enable vector-based recall of relevant past conversations.

```bash
export N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-5
export N8N_INSTANCE_AI_EMBEDDER_MODEL=openai/text-embedding-3-small
export N8N_INSTANCE_AI_SEMANTIC_RECALL_TOP_K=10
```

This adds:
- Semantic search over past messages using embeddings
- Top 10 most relevant past messages included in context
- Requires a vector-capable storage backend (PostgreSQL recommended)

### With MCP Servers

Extend the agent with external tool servers.

```bash
export N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-5
export N8N_INSTANCE_AI_MCP_SERVERS="github=https://mcp-github.example.com/sse,slack=https://mcp-slack.example.com/sse"
```

This adds:
- All tools from the GitHub MCP server
- All tools from the Slack MCP server
- MCP tools merge transparently with native n8n tools

### Full Configuration

```bash
export N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-5
export N8N_INSTANCE_AI_MCP_SERVERS="github=https://mcp-github.example.com/sse"
export N8N_INSTANCE_AI_LAST_MESSAGES=30
export N8N_INSTANCE_AI_EMBEDDER_MODEL=openai/text-embedding-3-small
export N8N_INSTANCE_AI_SEMANTIC_RECALL_TOP_K=10
export N8N_INSTANCE_AI_TIMEOUT=180000
```

## Database Setup

Memory storage uses the same database as n8n whenever possible.

### PostgreSQL (Recommended for Production)

If n8n is configured with PostgreSQL, the Instance AI service automatically
constructs a connection URL from the existing database config:

```
postgresql://user:password@host:port/database
```

No additional database setup is needed. Memory tables are created automatically
by the Mastra storage providers (`PostgresStore` and `PgVector`).

### SQLite (Development)

If n8n uses SQLite, memory falls back to a local LibSQL file:

```
file:instance-ai-memory.db
```

This creates `instance-ai-memory.db` in the working directory. The `LibSQLStore`
and `LibSQLVector` providers from Mastra handle schema creation.

### Storage Selection

The service detects the database type from n8n's existing configuration
(`dbType` field) and selects the appropriate provider:

| n8n Database | Memory Storage | Vector Storage |
|-------------|---------------|----------------|
| PostgreSQL (`postgresdb`) | `PostgresStore` | `PgVector` |
| SQLite or other | `LibSQLStore` | `LibSQLVector` |

## Disabling the Module

To disable Instance AI entirely:

```bash
export N8N_DISABLED_MODULES=instance-ai
```

This prevents the module from loading during startup. The sidebar item will not
appear and the `/instance-ai/chat` endpoint will not be registered.

To disable alongside other modules:

```bash
export N8N_DISABLED_MODULES=instance-ai,other-module
```

## Related Docs

- [Backend Module](./internals/backend-module.md) — how the service uses these config values
- [Memory System](./features/memory/) — storage backend details
- [MCP Integration](./features/mcp/) — MCP server configuration format
