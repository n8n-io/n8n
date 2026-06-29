# Configuration

## Environment Variables

All Instance AI configuration is done via environment variables.

### Core

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_MODEL` | string | `anthropic/claude-opus-4-8` | LLM model in `provider/model` format. Must be set for the module to enable. |
| `N8N_INSTANCE_AI_MODEL_URL` | string | `''` | Base URL for an OpenAI-compatible endpoint (e.g. `http://localhost:1234/v1` for LM Studio). When set, model requests go to this URL instead of the built-in provider. |
| `N8N_INSTANCE_AI_MODEL_API_KEY` | string | `''` | API key for the custom model endpoint. Optional — some local servers don't require one. |
| `N8N_INSTANCE_AI_MCP_SERVERS` | string | `''` | Comma-separated MCP server configs. Format: `name=url,name=url` |
| `N8N_INSTANCE_AI_SUB_AGENT_MAX_STEPS` | number | `100` | Maximum LLM reasoning steps for sub-agents spawned via delegate tool |
| `N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED` | boolean | `false` | Disable the local gateway (filesystem, shell, browser) for all users |

### Tracing

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_DIAGNOSTICS_ENABLED` | boolean | `true` | When set to `false`, Instance AI tracing is disabled. |
| `LANGSMITH_API_KEY` / `LANGCHAIN_API_KEY` | string | unset | Enables direct LangSmith export for local and self-hosted setups. |
| `LANGSMITH_ENDPOINT` / `LANGCHAIN_ENDPOINT` | string | unset | Optional direct LangSmith endpoint override. |
| `LANGSMITH_TRACING` / `LANGCHAIN_TRACING_V2` | boolean | unset | LangSmith SDK tracing flags. `false` disables tracing; `true` enables direct tracing when direct LangSmith credentials or endpoints are configured. |

### Debugging

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_RUN_DEBUG_ENABLED` | boolean | `false` | Capture orchestrator LLM steps and workflow code snapshots for the dev debug panel and eval LLM debug reports. |

### Memory

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_LAST_MESSAGES` | number | `20` | Number of recent messages to include in context |

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
When no search provider is available, the `web-search` action is disabled. `fetch-url` still works.

### Sandbox (Code Execution)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_SANDBOX_ENABLED` | boolean | `false` | Enable sandbox-backed workflow building. When false, workflow builder capability is unavailable. |
| `N8N_INSTANCE_AI_SANDBOX_PROVIDER` | string | `n8n-sandbox` | Sandbox provider: `n8n-sandbox` for the n8n sandbox service, or `daytona` for the Daytona provider. |
| `DAYTONA_API_URL` | string | `''` | Daytona API URL (e.g. `https://app.daytona.io/api`). Required when provider is `daytona`. |
| `DAYTONA_API_KEY` | string | `''` | Daytona API key for authentication. Required when provider is `daytona`. |
| `N8N_SANDBOX_SERVICE_URL` | string | `''` | n8n sandbox service URL. Required when provider is `n8n-sandbox`. |
| `N8N_SANDBOX_SERVICE_API_KEY` | string | `''` | API key for the n8n sandbox service. Optional when an `httpHeaderAuth` credential is selected in admin settings. |
| `N8N_INSTANCE_AI_SANDBOX_IMAGE` | string | `daytonaio/sandbox:0.5.0` | Docker image for the Daytona sandbox. |
| `N8N_INSTANCE_AI_SANDBOX_SNAPSHOT` | string | `''` | Overrides the full Daytona snapshot name (e.g. `n8n/instance-ai:2.27.3`) used to create sandboxes. Defaults to the versioned snapshot derived from the running n8n version. Only applies in proxy mode; the snapshot must exist or Daytona falls back to building from the base image. |
| `N8N_INSTANCE_AI_SANDBOX_TIMEOUT` | number | `300000` | Default command timeout in the sandbox (milliseconds). |
| `N8N_INSTANCE_AI_SANDBOX_NAME_PREFIX` | string | `''` | Prefix prepended to every Daytona sandbox name (e.g. `eval-baseline-daily`). Also surfaced as a `name_prefix` label. Empty in production. |
| `N8N_INSTANCE_AI_SANDBOX_EPHEMERAL` | boolean | `false` | When true, Daytona sandboxes are created ephemeral (auto-deleted on stop) instead of lingering stopped. Intended for throwaway eval instances so sandboxes don't accumulate. |
| `N8N_INSTANCE_AI_SANDBOX_AUTO_STOP_MINUTES` | number | `15` | Minutes an idle Daytona sandbox waits before being stopped. `0` disables auto-stop. |
| `N8N_INSTANCE_AI_SANDBOX_AUTO_ARCHIVE_MINUTES` | number | `60` (1 hour) | Minutes a stopped Daytona sandbox waits before being archived to cold storage. `0` uses Daytona's maximum interval. |
| `N8N_INSTANCE_AI_SANDBOX_AUTO_DELETE_MINUTES` | number | `10080` (7 days) | Minutes a stopped Daytona sandbox waits before being deleted. Negative disables auto-delete; `0` deletes on stop. Ignored when `N8N_INSTANCE_AI_SANDBOX_EPHEMERAL` is true. |

When sandbox is enabled, Instance AI writes workflow source files in the runtime
workspace and `build-workflow` runs TypeScript sources through the sandbox
`tsx` build runner before saving. The model still calls only `build-workflow`;
there is no no-sandbox TypeScript build fallback.

Sandbox workspaces persist per thread — the same container is reused across messages in a conversation. Workspaces are destroyed on server shutdown.

### Observational Memory

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_OBSERVER_MESSAGE_TOKENS` | number | `30000` | Token threshold for Observer to trigger compression |
| `N8N_INSTANCE_AI_REFLECTOR_OBSERVATION_TOKENS` | number | `40000` | Token threshold for Reflector to condense observations |

Observer and Reflector use the same model as the orchestrator agent (see `@n8n/agents` observational memory defaults).

### Lifecycle & Housekeeping

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_THREAD_TTL_DAYS` | number | `90` | Conversation thread TTL in days. Threads older than this are auto-expired. 0 = no expiration. |
| `N8N_INSTANCE_AI_PRUNE_INTERVAL` | number | `3600000` | Interval in ms between scheduled pruning runs on the leader. Prunes stale checkpoints, expired pending confirmations, and expired conversation threads. 0 = disabled. |
| `N8N_INSTANCE_AI_SNAPSHOT_RETENTION` | number | `86400000` | Retention period in ms for orphaned workflow snapshots before pruning. |
| `N8N_INSTANCE_AI_CONFIRMATION_TIMEOUT` | number | `86400000` | Timeout in ms for HITL confirmation requests. 0 = no timeout. |

### Output Filtering

Agent output is scanned for secrets/PII and redacted before it reaches the user.
The scan covers streamed assistant text, reasoning, and tool results/errors, for
both the orchestrator and delegated sub-agents. A filtering event (categories
and counts only — never the values) is logged whenever a redaction occurs.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_OUTPUT_REDACTION_ENABLED` | boolean | `true` | Master switch. When `false`, output passes through untouched. |
| `N8N_INSTANCE_AI_OUTPUT_REDACTION_SECRETS` | boolean | `true` | Redact credential/secret patterns (API keys, tokens, auth headers, `key=value` pairs). |
| `N8N_INSTANCE_AI_OUTPUT_REDACTION_PII` | string | `credit-card` | Comma-separated PII categories to redact. Available: `email`, `credit-card` (Luhn-validated), `ssn-us` (US Social Security Number, dashed `123-45-6789` form). Defaults to `credit-card` only; `email`/`ssn-us` are implemented but off by default pending review of false-positive rates. Empty = no PII scanning. Unrecognized values are ignored. Per-country national IDs each use their own `ssn-<cc>` category (e.g. a future `ssn-uk`). |
| `N8N_INSTANCE_AI_OUTPUT_REDACTION_PLACEHOLDER` | string | `[REDACTED]` | Replacement text substituted for each redacted match. |

Secret detection is conservative by design — it matches well-known token shapes
and explicit `key=value`/JSON secret fields, not arbitrary opaque strings, to
avoid mangling normal output. The `PiiDetectionType` API also reserves `phone`
and `address`, but those have no detection pattern yet — setting them has no
effect (they were deferred as too false-positive-prone for free-form prose).

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

Instance AI memory persists in the main n8n database via TypeORM — the same
PostgreSQL or SQLite instance n8n already uses. No separate memory database or
LibSQL file is required.

The same storage backend is used for:
- Message history
- Observational memory (observation log, cursors, and task locks)
- Plan storage (thread-scoped in thread metadata)
- Run snapshots and checkpoints (separate tables)

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
N8N_INSTANCE_AI_MODEL=anthropic/claude-opus-4-8

# With MCP servers
N8N_INSTANCE_AI_MCP_SERVERS="my-tools=https://mcp.example.com/sse"

# With SearXNG (free, self-hosted search)
N8N_INSTANCE_AI_SEARXNG_URL=http://searxng:8080

# With Brave Search (paid API, takes priority over SearXNG)
INSTANCE_AI_BRAVE_SEARCH_API_KEY=BSA-xxx

# With sandbox (n8n sandbox service)
# CI can start it with:
# pnpm tsx packages/testing/containers/start-sandbox.ts --network n8n-eval-net
N8N_INSTANCE_AI_SANDBOX_ENABLED=true
N8N_INSTANCE_AI_SANDBOX_PROVIDER=n8n-sandbox
N8N_SANDBOX_SERVICE_URL=https://sandbox.example.com
N8N_SANDBOX_SERVICE_API_KEY=sandbox-key

# With sandbox (Daytona — explicit provider)
N8N_INSTANCE_AI_SANDBOX_ENABLED=true
N8N_INSTANCE_AI_SANDBOX_PROVIDER=daytona
DAYTONA_API_URL=https://app.daytona.io/api
DAYTONA_API_KEY=dtn_xxx

# With filesystem gateway (user runs daemon on their machine)
N8N_INSTANCE_AI_GATEWAY_API_KEY=my-secret-key
# User runs: npx @n8n/computer-use

# With custom OpenAI-compatible endpoint (e.g. LM Studio, Ollama)
N8N_INSTANCE_AI_MODEL_URL=http://localhost:1234/v1

# Output filtering — secrets + email only, with a custom placeholder
N8N_INSTANCE_AI_OUTPUT_REDACTION_PII=email
N8N_INSTANCE_AI_OUTPUT_REDACTION_PLACEHOLDER=‹redacted›

# Observational memory tuning
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
      N8N_INSTANCE_AI_MODEL: anthropic/claude-opus-4-8
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
