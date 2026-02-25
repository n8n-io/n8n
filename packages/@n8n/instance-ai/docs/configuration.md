# Configuration

## Environment Variables

All Instance AI configuration is done via environment variables.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_MODEL` | string | `anthropic/claude-sonnet-4-5` | LLM model in `provider/model` format. Must be set for the module to enable. |
| `N8N_INSTANCE_AI_MCP_SERVERS` | string | `''` | Comma-separated MCP server configs. Format: `name=url,name=url` |
| `N8N_INSTANCE_AI_LAST_MESSAGES` | number | `20` | Number of recent messages to include in context |
| `N8N_INSTANCE_AI_EMBEDDER_MODEL` | string | `''` | Embedder model for semantic recall. Empty disables semantic memory. |
| `N8N_INSTANCE_AI_SEMANTIC_RECALL_TOP_K` | number | `5` | Number of semantically similar messages to retrieve |
| `N8N_INSTANCE_AI_TIMEOUT` | number | `120000` | Agent response timeout in milliseconds |

## Enabling / Disabling

The module is **enabled** when `N8N_INSTANCE_AI_MODEL` is set to a non-empty value.

The module can be **disabled** explicitly by adding it to `N8N_DISABLED_MODULES`:

```bash
N8N_DISABLED_MODULES=instance-ai
```

## MCP Server Configuration

MCP servers are configured as comma-separated `name=url` pairs:

```bash
# Single server
N8N_INSTANCE_AI_MCP_SERVERS="github=https://mcp.github.com/sse"

# Multiple servers
N8N_INSTANCE_AI_MCP_SERVERS="github=https://mcp.github.com/sse,database=https://mcp-db.example.com/sse"
```

Each MCP server's tools are merged with the native tools and made available to
the agent.

## Storage

The memory storage backend is selected automatically based on n8n's database
configuration:

- **PostgreSQL**: If n8n uses `postgresdb`, memory uses the same PostgreSQL
  instance (connection URL built from n8n's DB config)
- **SQLite**: Otherwise, memory uses a local LibSQL file at
  `instance-ai-memory.db`

No separate storage configuration is needed.

## Minimal Setup

```bash
# Minimal — just set the model
N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-5

# With MCP servers
N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-5
N8N_INSTANCE_AI_MCP_SERVERS="my-tools=https://mcp.example.com/sse"

# With semantic memory
N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-5
N8N_INSTANCE_AI_EMBEDDER_MODEL=openai/text-embedding-3-small
```
