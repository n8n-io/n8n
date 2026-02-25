# Configuration

## Environment Variables

All Instance AI configuration is done via environment variables.

### Core

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_MODEL` | string | `anthropic/claude-sonnet-4-5` | LLM model in `provider/model` format. Must be set for the module to enable. |
| `N8N_INSTANCE_AI_MCP_SERVERS` | string | `''` | Comma-separated MCP server configs. Format: `name=url,name=url` |
| `N8N_INSTANCE_AI_TIMEOUT` | number | `120000` | Agent response timeout in milliseconds |
| `N8N_INSTANCE_AI_MAX_STEPS` | number | `50` | Maximum LLM reasoning steps for the orchestrator |
| `N8N_INSTANCE_AI_MAX_LOOP_ITERATIONS` | number | `10` | Maximum Build→Debug loop iterations before asking user |
| `N8N_INSTANCE_AI_SUB_AGENT_MAX_STEPS` | number | `10` | Maximum LLM reasoning steps for sub-agents |

### Memory

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_LAST_MESSAGES` | number | `20` | Number of recent messages to include in context |
| `N8N_INSTANCE_AI_EMBEDDER_MODEL` | string | `''` | Embedder model for semantic recall. Empty disables semantic memory. |
| `N8N_INSTANCE_AI_SEMANTIC_RECALL_TOP_K` | number | `5` | Number of semantically similar messages to retrieve |

### Observational Memory

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_OBSERVER_MODEL` | string | `google/gemini-2.5-flash` | LLM for Observer/Reflector compression agents |
| `N8N_INSTANCE_AI_OBSERVER_MESSAGE_TOKENS` | number | `30000` | Token threshold for Observer to trigger compression |
| `N8N_INSTANCE_AI_REFLECTOR_OBSERVATION_TOKENS` | number | `40000` | Token threshold for Reflector to condense observations |

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
the orchestrator agent. Sub-agents currently do not receive MCP tools — only
native tools specified in the `delegate` call.

## Storage

The memory storage backend is selected automatically based on n8n's database
configuration:

- **PostgreSQL**: If n8n uses `postgresdb`, memory uses the same PostgreSQL
  instance (connection URL built from n8n's DB config)
- **SQLite**: Otherwise, memory uses a local LibSQL file at
  `instance-ai-memory.db`

No separate storage configuration is needed.

The same storage backend is used for:
- Message history
- Working memory state
- Observational memory (observations and reflections)
- Plan storage (thread-scoped)
- Event persistence (for SSE replay)
- Vector embeddings (when semantic recall is enabled)

## Event Bus

The event bus transport is selected automatically:

- **Single instance**: In-process `EventEmitter` — zero infrastructure
- **Queue mode**: Redis Pub/Sub — uses n8n's existing Redis connection

Event persistence always uses thread storage regardless of transport.

Runtime behavior:
- One active run per thread. Additional `POST /instance-ai/chat/:threadId`
  requests while a run is active are rejected (`409 Conflict`).
- Runs can be cancelled via `POST /instance-ai/chat/:threadId/cancel`
  (idempotent).

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

# Full configuration with observational memory tuning
N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-5
N8N_INSTANCE_AI_MCP_SERVERS="github=https://mcp.github.com/sse"
N8N_INSTANCE_AI_EMBEDDER_MODEL=openai/text-embedding-3-small
N8N_INSTANCE_AI_MAX_STEPS=50
N8N_INSTANCE_AI_MAX_LOOP_ITERATIONS=10
N8N_INSTANCE_AI_OBSERVER_MODEL=google/gemini-2.5-flash
N8N_INSTANCE_AI_OBSERVER_MESSAGE_TOKENS=30000
```
