# Configuration

## Environment Variables

All Instance AI configuration is done via environment variables.

### Core

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_MODEL` | string | `anthropic/claude-sonnet-4-6` | LLM model in `provider/model` format. Must be set for the module to enable. |
| `N8N_INSTANCE_AI_MODEL_URL` | string | `''` | Base URL for an OpenAI-compatible endpoint (e.g. `http://localhost:1234/v1` for LM Studio). When set, model requests go to this URL instead of the built-in provider. |
| `N8N_INSTANCE_AI_MODEL_API_KEY` | string | `''` | API key for the custom model endpoint. Optional — some local servers don't require one. |
| `N8N_INSTANCE_AI_MAX_CONTEXT_WINDOW_TOKENS` | number | `500000` | Hard cap on the context window size (in tokens). The effective window is the lesser of this value and the model's native capability. `0` = use the model's full context window. |
| `N8N_INSTANCE_AI_MCP_SERVERS` | string | `''` | Comma-separated MCP server configs. Format: `name=url,name=url` |
| `N8N_INSTANCE_AI_SUB_AGENT_MAX_STEPS` | number | `100` | Maximum LLM reasoning steps for sub-agents spawned via delegate tool |
| `N8N_INSTANCE_AI_BROWSER_MCP` | boolean | `false` | Enable Chrome DevTools MCP for browser-assisted credential setup |
| `N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED` | boolean | `false` | Disable the local gateway (filesystem, shell, browser) for all users |

### Memory

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_LAST_MESSAGES` | number | `20` | Number of recent messages to include in context |
| `N8N_INSTANCE_AI_EMBEDDER_MODEL` | string | `''` | Embedder model for semantic recall. Empty disables semantic memory. |
| `N8N_INSTANCE_AI_SEMANTIC_RECALL_TOP_K` | number | `5` | Number of semantically similar messages to retrieve |

### Filesystem

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_GATEWAY_API_KEY` | string | `''` | Static API key for the filesystem gateway. Used by the `@n8n/computer-use` daemon to authenticate SSE and HTTP POST requests. When empty, the dynamic pairing token flow is used instead. |

Filesystem access requires the `@n8n/computer-use` gateway daemon. The user
runs `npx @n8n/computer-use https://<your-n8n-instance>` on their machine to connect.

See `docs/filesystem-access.md` for the full architecture, gateway protocol spec,
and security model.

### Web Research

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `INSTANCE_AI_BRAVE_SEARCH_API_KEY` | string | `''` | Brave Search API key. Takes priority over SearXNG when set. |
| `N8N_INSTANCE_AI_SEARXNG_URL` | string | `''` | SearXNG instance URL (e.g. `http://searxng:8080`). Empty = disabled. No API key needed. |

**Provider priority**: Brave (if key set) > SearXNG (if URL set) > disabled.
When no search provider is available, `web-search` and `research-with-agent` tools are disabled. `fetch-url` still works.

### Sandbox (Code Execution)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_SANDBOX_ENABLED` | boolean | `false` | Enable sandbox for code execution. When true, the builder agent writes TypeScript files and validates with `tsc` instead of using the string-based `build-workflow` tool. |
| `N8N_INSTANCE_AI_SANDBOX_PROVIDER` | string | `daytona` | Sandbox provider: `daytona` for isolated Docker containers, `n8n-sandbox` for the n8n sandbox service, `local` for direct host execution (dev only, no isolation). |
| `DAYTONA_API_URL` | string | `''` | Daytona API URL (e.g. `https://app.daytona.io/api`). Required when provider is `daytona`. |
| `DAYTONA_API_KEY` | string | `''` | Daytona API key for authentication. Required when provider is `daytona`. |
| `N8N_SANDBOX_SERVICE_URL` | string | `''` | n8n sandbox service URL. Required when provider is `n8n-sandbox`. |
| `N8N_SANDBOX_SERVICE_API_KEY` | string | `''` | API key for the n8n sandbox service. Optional when an `httpHeaderAuth` credential is selected in admin settings. |
| `N8N_INSTANCE_AI_SANDBOX_IMAGE` | string | `daytonaio/sandbox:0.5.0` | Docker image for the Daytona sandbox. |
| `N8N_INSTANCE_AI_SANDBOX_TIMEOUT` | number | `300000` | Default command timeout in the sandbox (milliseconds). |

**Modes**: When sandbox is enabled, the builder agent works in two modes:
- **Sandbox mode** (Daytona/n8n-sandbox/local): agent writes TypeScript to `~/workspace/src/workflow.ts`, runs `tsc` for validation, and uses `submit-workflow` to save. Gets full filesystem access and `execute_command`.
- **Tool mode** (fallback when sandbox unavailable): original `build-workflow` tool with string-based code validation.

Sandbox workspaces persist per thread — the same container is reused across messages in a conversation. Workspaces are destroyed on server shutdown.

### Observational Memory

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_OBSERVER_MODEL` | string | `google/gemini-2.5-flash` | LLM for Observer/Reflector compression agents |
| `N8N_INSTANCE_AI_OBSERVER_MESSAGE_TOKENS` | number | `30000` | Token threshold for Observer to trigger compression |
| `N8N_INSTANCE_AI_REFLECTOR_OBSERVATION_TOKENS` | number | `40000` | Token threshold for Reflector to condense observations |

### Lifecycle & Housekeeping

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_THREAD_TTL_DAYS` | number | `90` | Conversation thread TTL in days. Threads older than this are auto-expired. 0 = no expiration. |
| `N8N_INSTANCE_AI_SNAPSHOT_PRUNE_INTERVAL` | number | `3600000` | Interval in ms between snapshot pruning runs. 0 = disabled. |
| `N8N_INSTANCE_AI_SNAPSHOT_RETENTION` | number | `86400000` | Retention period in ms for orphaned workflow snapshots before pruning. |
| `N8N_INSTANCE_AI_CONFIRMATION_TIMEOUT` | number | `600000` | Timeout in ms for HITL confirmation requests. 0 = no timeout. |

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
N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-6

# With MCP servers
N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-6
N8N_INSTANCE_AI_MCP_SERVERS="my-tools=https://mcp.example.com/sse"

# With semantic memory
N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-6
N8N_INSTANCE_AI_EMBEDDER_MODEL=openai/text-embedding-3-small

# With SearXNG (free, self-hosted search)
N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-6
N8N_INSTANCE_AI_SEARXNG_URL=http://searxng:8080

# With Brave Search (paid API, takes priority over SearXNG)
N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-6
INSTANCE_AI_BRAVE_SEARCH_API_KEY=BSA-xxx

# With sandbox (Daytona — isolated code execution for builder agent)
N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-6
N8N_INSTANCE_AI_SANDBOX_ENABLED=true
N8N_INSTANCE_AI_SANDBOX_PROVIDER=daytona
DAYTONA_API_URL=https://app.daytona.io/api
DAYTONA_API_KEY=dtn_xxx

# With sandbox (local — development only, no isolation)
N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-6
N8N_INSTANCE_AI_SANDBOX_ENABLED=true
N8N_INSTANCE_AI_SANDBOX_PROVIDER=local

# With sandbox (n8n sandbox service)
N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-5
N8N_INSTANCE_AI_SANDBOX_ENABLED=true
N8N_INSTANCE_AI_SANDBOX_PROVIDER=n8n-sandbox
N8N_SANDBOX_SERVICE_URL=https://sandbox.example.com
N8N_SANDBOX_SERVICE_API_KEY=sandbox-key

# With filesystem gateway (user runs daemon on their machine)
N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-6
N8N_INSTANCE_AI_GATEWAY_API_KEY=my-secret-key
# User runs: npx @n8n/computer-use

# With custom OpenAI-compatible endpoint (e.g. LM Studio, Ollama)
N8N_INSTANCE_AI_MODEL=custom/llama-3.1-70b
N8N_INSTANCE_AI_MODEL_URL=http://localhost:1234/v1

# Full configuration with observational memory tuning
N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-6
N8N_INSTANCE_AI_MCP_SERVERS="github=https://mcp.github.com/sse"
N8N_INSTANCE_AI_EMBEDDER_MODEL=openai/text-embedding-3-small
N8N_INSTANCE_AI_MAX_STEPS=50
N8N_INSTANCE_AI_MAX_LOOP_ITERATIONS=10
N8N_INSTANCE_AI_OBSERVER_MODEL=google/gemini-2.5-flash
N8N_INSTANCE_AI_OBSERVER_MESSAGE_TOKENS=30000
```

## SearXNG Setup (Docker Compose)

SearXNG is a self-hosted metasearch engine that aggregates results from Google,
Bing, DuckDuckGo, and others. No API key needed.

Add `N8N_INSTANCE_AI_SEARXNG_URL` pointing to your SearXNG service:

```yaml
services:
  searxng:
    image: searxng/searxng:latest
    ports:
      - "8888:8080"  # optional: expose to host
  n8n:
    environment:
      N8N_INSTANCE_AI_MODEL: anthropic/claude-sonnet-4-6
      N8N_INSTANCE_AI_SEARXNG_URL: http://searxng:8080
```

SearXNG must have JSON format enabled in its `settings.yml`:

```yaml
search:
  formats:
    - html
    - json   # required for Instance AI
```

Most SearXNG Docker images enable JSON format by default.
