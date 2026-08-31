# Configuration

## Environment Variables

Environment variables define Instance AI defaults and fallbacks. On direct self-hosted
deployments, admins can override the model credential and model name in Instance AI settings.
The sandbox provider is also overridable there (via the sandbox connection); a provider
persisted in settings takes precedence over `N8N_INSTANCE_AI_SANDBOX_PROVIDER`.

### Core

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_MODEL` | string | `anthropic/claude-opus-4-8` | LLM model in `provider/model` format for built-in providers, or a bare model name when `N8N_INSTANCE_AI_MODEL_URL` is set. The effective model must be non-empty for the agent to run successfully. Opus 5: `anthropic/claude-opus-5`. Vertex Claude: `google-vertex-anthropic/claude-opus-4-8`. |
| `N8N_INSTANCE_AI_MODEL_URL` | string | `''` | Base URL for an OpenAI-compatible endpoint (e.g. `http://localhost:1234/v1` for LM Studio). When set, model requests go to this URL instead of the built-in provider. |
| `N8N_INSTANCE_AI_MODEL_API_KEY` | string | `''` | Explicit API key for the environment-selected model. It works with built-in providers and custom endpoints. When it is empty, built-in providers can use their standard API-key environment variable. Some local endpoints do not require a key. |
| `N8N_INSTANCE_AI_VERTEX_PROJECT_ID` | string | `''` | Google Cloud project for `google-vertex-anthropic/*`. Falls back to `GOOGLE_VERTEX_PROJECT`, then `project_id` in the service-account JSON. |
| `N8N_INSTANCE_AI_VERTEX_LOCATION` | string | `''` | Vertex location for `google-vertex-anthropic/*` (e.g. `global`, `us-east5`). Empty falls back to `GOOGLE_VERTEX_LOCATION`, then `global`. |
| `N8N_INSTANCE_AI_VERTEX_SERVICE_ACCOUNT_JSON` | string | `''` | Service-account JSON for Vertex Claude. Omit to use ADC (`gcloud auth application-default login`). |
| `N8N_INSTANCE_AI_REASONING_EFFORT` | string | unset | Optional reasoning effort for `custom/*` (`none`/`minimal`/`low`/`medium`/`high`/`xhigh`/`max`). Unset = known-model map in `src/utils/custom-model-defaults.ts`; still unresolved = omit. |
| `N8N_INSTANCE_AI_SUPPORTS_STRUCTURED_OUTPUTS` | string | unset | Optional `true`/`false` for `custom/*` structured-output support. Unset = known-model map; still unresolved = omit. |
| `N8N_INSTANCE_AI_MCP_SERVERS` | string | `''` | Comma-separated MCP server configs. Format: `name=url,name=url` |
| `N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED` | boolean | `false` | Disable the local gateway (filesystem, shell, browser) for all users |
| `N8N_AI_ALLOW_SENDING_PARAMETER_VALUES` | boolean | `true` | Allow Instance AI to receive workflow and node parameter values. When `false`, the adapter replaces values with structure or placeholders before it sends context to the agent. This is a global n8n AI setting. |

For built-in providers, the setup service recognizes `ANTHROPIC_API_KEY`,
`COHERE_API_KEY`, `DEEPSEEK_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`,
`GROQ_API_KEY`, `MISTRAL_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, and
`XAI_API_KEY`. `N8N_INSTANCE_AI_MODEL_API_KEY` supplies an explicit key instead.

### Tracing

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_DIAGNOSTICS_ENABLED` | boolean | `true` | When set to `false`, Instance AI tracing is disabled. |
| `LANGSMITH_API_KEY` / `LANGCHAIN_API_KEY` | string | unset | Enables direct LangSmith export for local and self-hosted setups. |
| `LANGSMITH_ENDPOINT` / `LANGCHAIN_ENDPOINT` | string | unset | Optional direct LangSmith endpoint override. |
| `LANGSMITH_TRACING` / `LANGCHAIN_TRACING_V2` | boolean | unset | LangSmith SDK tracing flags. `false` disables tracing; `true` enables direct tracing when direct LangSmith credentials or endpoints are configured. |
| `LANGSMITH_PROJECT` / `LANGCHAIN_PROJECT` | string | `instance-ai` | LangSmith project for product traces. `LANGSMITH_PROJECT` takes precedence. |

### Feature gates

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_THINKING_ENABLED` | boolean | `true` | Extended thinking / reasoning. When `false`, reasoning is not enabled on the model. |
| `N8N_INSTANCE_AI_MCP_CONNECTIONS_ENABLED` | boolean | `false` | Force-enable the MCP-connections experiment. `false` falls back to the PostHog flag. The MCP registry module and admin MCP access must also be enabled before the MCP registry discovery tool is wired. |
| `N8N_INSTANCE_AI_NODE_CONTEXT_ENABLED` | boolean | `false` | Force-enable canvas node context. `false` falls back to the PostHog flag. |
| `N8N_INSTANCE_AI_BROWSER_USE_ENABLED` | boolean | `true` | Computer Use browser tooling, used for credential setup. |
| `N8N_INSTANCE_AI_ACTIVATION_CAPPED` | boolean | `false` | Activation capping. |
| `N8N_INSTANCE_AI_ACTIVATION_LOCK_MESSAGE_THRESHOLD` | number | `1` | Assistant messages that must be sent, in addition to instance activation, before an activation lock applies. |

### Debugging

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_RUN_DEBUG_ENABLED` | boolean | `false` | Capture orchestrator LLM steps and workflow code snapshots for the dev debug panel and eval LLM debug reports. |
| `N8N_INSTANCE_AI_TRACE_INTERNAL` / `N8N_INSTANCE_AI_TRACE_INCLUDE_INTERNAL` | boolean | `false` | Include internal orchestration data in trace inputs. Either variable enables it. |
| `N8N_INSTANCE_AI_EVAL_TIMING` | boolean | `false` | When `true`, logs a per-execution `[EvalMock][timing]` phase breakdown (hints / bypass-pin / http-mock / ai-turn) for the eval mock-execution path, to attribute mocked-execution latency. A no-op otherwise. |
| `N8N_INSTANCE_AI_EVAL_MODEL` | string | unset | Optional model override for evaluation helper agents. Falls back to `N8N_INSTANCE_AI_MODEL`. |
| `EVAL_MODAL_LLM_HEADERS` | string | `''` | Eval-only JSON object of extra HTTP headers for Modal (or other custom) LLM endpoints. Used by eval helpers (`createEvalAgent`, mock generation, verification) with `N8N_INSTANCE_AI_MODEL_URL`. |

### Local Computer Use gateway

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_GATEWAY_API_KEY` | string | `''` | Static API key for the local gateway. It authenticates initialization, SSE, responses, and disconnect. It is not user-scoped and cannot create credentials. When empty, use dynamic user pairing. |

Local machine access requires the `@n8n/computer-use` gateway daemon. The user
selects the local-computer setup action in n8n, copies the generated command,
and runs it on their machine. The command contains the instance URL and a
short-lived pairing token.

See `docs/filesystem-access.md` for the full architecture, gateway protocol spec,
and security model.

### Web Research

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `INSTANCE_AI_BRAVE_SEARCH_API_KEY` | string | `''` | Brave Search API key. Takes priority over SearXNG when set. |
| `N8N_INSTANCE_AI_SEARXNG_URL` | string | `''` | SearXNG instance URL (e.g. `http://searxng:8080`). Empty = disabled. No API key needed. |

**Provider priority**: Brave (if key set) > SearXNG (if URL set) > disabled.
When no search provider is available, `research(action="web-search")` returns
without search results. `research(action="fetch-url")` still works.

### Sandbox (Code Execution)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_SANDBOX_ENABLED` | boolean | `false` | Enable sandbox-backed workflow building. When false, workflow builder capability is unavailable. |
| `N8N_INSTANCE_AI_SANDBOX_PROVIDER` | string | `n8n-sandbox` | Sandbox provider: `n8n-sandbox` for the n8n sandbox service, or `daytona` for the Daytona provider. On self-hosted, a provider selected in Instance AI settings takes precedence. |
| `DAYTONA_API_URL` | string | `''` | Daytona API URL (e.g. `https://app.daytona.io/api`). Required when provider is `daytona`. |
| `DAYTONA_API_KEY` | string | `''` | Daytona API key for authentication. Required when provider is `daytona`. |
| `N8N_SANDBOX_SERVICE_URL` | string | `''` | n8n sandbox service URL. Required when provider is `n8n-sandbox`. |
| `N8N_SANDBOX_SERVICE_API_KEY` | string | `''` | API key for the n8n sandbox service. Optional when an `httpHeaderAuth` credential is selected in admin settings. |
| `N8N_INSTANCE_AI_SANDBOX_IMAGE` | string | `daytonaio/sandbox:0.5.0` | Docker image for the Daytona sandbox. |
| `N8N_INSTANCE_AI_SANDBOX_SNAPSHOT` | string | `''` | Overrides the full Daytona snapshot name (e.g. `n8n/instance-ai:2.27.3`) used to create sandboxes. Defaults to the versioned snapshot derived from the running n8n version. It applies only in proxy mode. A missing or unusable snapshot fails sandbox creation because proxy mode cannot upload an image-build context. |
| `N8N_INSTANCE_AI_SANDBOX_TIMEOUT` | number | `300000` | Default command timeout in the sandbox (milliseconds). |
| `N8N_INSTANCE_AI_SANDBOX_CREATE_TIMEOUT_SECONDS` | number | `900` | Eval-harness-only Daytona cold-provisioning timeout in seconds. It must be a positive integer. |
| `N8N_INSTANCE_AI_SANDBOX_NAME_PREFIX` | string | `''` | Prefix prepended to every Daytona sandbox name (e.g. `eval-baseline-daily`). Also surfaced as a `name_prefix` label. Empty in production. |
| `N8N_INSTANCE_AI_SANDBOX_EPHEMERAL` | boolean | `false` | When true, Daytona sandboxes are created ephemeral (auto-deleted on stop) instead of lingering stopped. Intended for throwaway eval instances so sandboxes don't accumulate. |
| `N8N_INSTANCE_AI_SANDBOX_AUTO_STOP_MINUTES` | number | `15` | Minutes an idle Daytona sandbox waits before being stopped. `0` disables auto-stop. |
| `N8N_INSTANCE_AI_SANDBOX_AUTO_ARCHIVE_MINUTES` | number | `60` (1 hour) | Minutes a stopped Daytona sandbox waits before being archived to cold storage. `0` uses Daytona's maximum interval. |
| `N8N_INSTANCE_AI_SANDBOX_AUTO_DELETE_MINUTES` | number | `10080` (7 days) | Minutes a stopped Daytona sandbox waits before being deleted. Negative disables auto-delete; `0` deletes on stop. Ignored when `N8N_INSTANCE_AI_SANDBOX_EPHEMERAL` is true. |
| `N8N_INSTANCE_AI_BUILDER_SANDBOX_TTL_MS` | number | `900000` | Idle TTL for the in-process thread-workspace cache. Expiry removes the cache entry but does not delete the remote sandbox. `0` disables cache eviction. |
| `N8N_INSTANCE_AI_DAYTONA_TOKEN_REFRESH_SKEW_MS` | number | `300000` | How early a Daytona token is refreshed before expiry (5 minutes). |
| `N8N_INSTANCE_AI_SANDBOX_LINK_SDK` | boolean | `false` | Local-dev only. When `1` or `true`, pack `@n8n/utils`, `n8n-workflow`, and `@n8n/workflow-sdk` from the host monorepo into each sandbox after `npm install`. Build all three packages first. Start a new AI thread after changing this because existing sandboxes keep their initialized `node_modules`. |

When sandbox is enabled, Instance AI writes workflow source files in the runtime
workspace and `build-workflow` runs TypeScript sources through the sandbox
`tsx` build runner before saving. The model still calls only `build-workflow`;
there is no no-sandbox TypeScript build fallback.

Sandbox workspaces persist per thread. The same remote sandbox is reused across
messages, runs, and background tasks in a conversation. Service shutdown stops
local expiry timers but leaves remote sandboxes available for reattachment.
Explicit thread cleanup destroys a cached workspace. Provider lifecycle settings
reclaim idle remote sandboxes.

### Observational Memory

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_OBSERVER_MESSAGE_TOKENS` | number | `30000` | Token threshold for Observer to trigger compression |
| `N8N_INSTANCE_AI_REFLECTOR_OBSERVATION_TOKENS` | number | `40000` | Token threshold for Reflector to condense observations |

Observer and Reflector use the same model as the orchestrator agent (see `@n8n/agents` observational memory defaults).

### Builder templates

These environment variables are read directly by `BuilderTemplatesService`.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_TEMPLATES_URL` | string | `https://sdk-templates.n8n.io` | Override the builder-template CDN base URL |
| `N8N_INSTANCE_AI_TEMPLATES_REFRESH_HOURS` | number | `24` | Refresh interval in hours. Invalid or non-positive values use 24 hours |
| `N8N_INSTANCE_AI_TEMPLATES_DISABLED` | boolean | `false` | Disable remote builder templates |

### Lifecycle & Housekeeping

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_THREAD_TTL_DAYS` | number | `30` | Conversation thread TTL in days. Threads older than this are auto-expired. 0 = no expiration. |
| `N8N_INSTANCE_AI_PRUNE_INTERVAL` | number | `3600000` | Interval in ms between scheduled pruning runs on the leader. Prunes stale checkpoints, expired pending confirmations, and expired conversation threads. 0 = disabled. |
| `N8N_INSTANCE_AI_SNAPSHOT_RETENTION` | number | `86400000` | Retention period in ms for stale native persistence checkpoints before they are marked expired. |
| `N8N_INSTANCE_AI_CONFIRMATION_TIMEOUT` | number | `86400000` | Timeout in ms for HITL confirmation requests. 0 = no timeout. |
| `N8N_INSTANCE_AI_CHECKPOINT_GC_RETENTION` | number | `604800000` | Retention period in ms for expired checkpoint tombstones before hard deletion. `0` keeps tombstones. |

### Output filtering

Instance AI does not scan or redact agent output on the streaming path.
Agent output is stored raw, consistent with workflow execution data, and
redaction applies at egress boundaries instead — the LangSmith telemetry
redactor is a separate layer and is unaffected. There are no
`N8N_INSTANCE_AI_OUTPUT_REDACTION_*` settings.

## Provider connections

On self-hosted deployments, owners and admins can configure the model, sandbox, and
web-search connections from the AI Assistant settings page. These connections are
managed centrally and are not offered as workflow-canvas credentials.

The environment variables above remain the fallback when no provider connection is
selected. The effective model name resolves as the instance setting, then the per-user
preference, then `N8N_INSTANCE_AI_MODEL`. Cloud and proxy-managed deployments receive
these values from the managed service instead.

## Enabling / Disabling

The `instance-ai` module is in the default module set. It does not need to be
listed in `N8N_ENABLED_MODULES`. `N8N_AI_ENABLED` controls older global AI
features and does not gate Instance AI.

Chat and the main UI are gated by `InstanceAiSettingsService.isInstanceAiEnabled()`.
Member-facing entry points are additionally gated by `isSetupCompleted()`, which
resolves the admin model selection, the assigned sandbox and search credentials,
and whether the deployment is cloud or proxy-managed. On cloud and proxy-managed
deployments setup is treated as complete.

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
the orchestrator agent. The embedded Agent Builder receives the same validated,
approval-wrapped MCP tools; specialized background agents do not.

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

Events are persisted to the durable event log, which is the only storage
path — there is no setting to turn it off. Coalesced step-level facts
(completed text/reasoning blocks, tool calls and results, run lifecycle) are
appended to the `instance_ai_events` table and replay reads the database;
token deltas are never persisted. Rows cascade-delete with their thread
(`N8N_INSTANCE_AI_THREAD_TTL_DAYS`). Nothing is retained in the process, so
cursors stay valid across restarts and across mains sharing one database.

Runtime behavior:
- One active run per thread. Additional `POST /instance-ai/chat/:threadId`
  requests while a run is active are rejected (`409 Conflict`).
- Runs can be cancelled via `POST /instance-ai/chat/:threadId/cancel`
  (idempotent).

## Minimal Model Connection

These variables configure the minimum model connection. On direct self-hosted deployments,
the model connection alone does not complete setup for member-facing entry points. You must
also configure a sandbox and either configure web search or explicitly continue without it
in Instance AI settings.

```bash
# Configure the model. The instance-ai module is enabled by default.
N8N_INSTANCE_AI_MODEL=anthropic/claude-opus-4-8
N8N_INSTANCE_AI_MODEL_API_KEY="$ANTHROPIC_API_KEY"

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

# With custom OpenAI-compatible endpoint (e.g. LM Studio, Ollama)
N8N_INSTANCE_AI_MODEL=your-tool-capable-model
N8N_INSTANCE_AI_MODEL_URL=http://localhost:1234/v1

# Direct Google Vertex Claude (no AI assistant proxy)
# Keep N8N_AI_ASSISTANT_BASE_URL unset/empty.
N8N_INSTANCE_AI_MODEL=google-vertex-anthropic/claude-opus-4-8
N8N_INSTANCE_AI_VERTEX_PROJECT_ID=my-gcp-project
N8N_INSTANCE_AI_VERTEX_LOCATION=global
N8N_INSTANCE_AI_VERTEX_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# Observational memory tuning
N8N_INSTANCE_AI_OBSERVER_MESSAGE_TOKENS=30000
N8N_INSTANCE_AI_REFLECTOR_OBSERVATION_TOKENS=40000
```

## SearXNG Setup (Docker Compose)

SearXNG is a self-hosted metasearch engine that aggregates results from Google,
Bing, DuckDuckGo, and others. No API key needed.

Add `N8N_INSTANCE_AI_SEARXNG_URL` pointing to your SearXNG service:

```yaml
services:
  searxng:
    image: searxng/searxng:latest
    environment:
      SEARXNG_SECRET: replace-with-a-random-string
    volumes:
      - ./searxng-settings.yml:/etc/searxng/settings.yml:ro
    ports:
      - "8888:8080"  # optional: expose to host
  n8n:
    environment:
      N8N_INSTANCE_AI_MODEL: anthropic/claude-opus-4-8
      N8N_INSTANCE_AI_SEARXNG_URL: http://searxng:8080
```

The stock `searxng/searxng` image serves HTML only — `format=json` requests
return `403 Forbidden` — so Instance AI's web search needs a mounted
`settings.yml` that enables the JSON API:

```yaml
# searxng-settings.yml
use_default_settings: true
search:
  formats:
    - html
    - json   # required for Instance AI
```
