# @n8n/instance-ai

Instance AI is the agent runtime behind the AI assistant experience in n8n. It
lets users ask for help with workflows, executions, credentials, nodes, and
workflow building from inside an n8n instance.

The package contains the agent prompts, tool registry, workflow-builder logic,
workspace adapters, tracing helpers, and evaluation harnesses. The HTTP API,
database entities, settings, and n8n service adapters live in
`packages/cli/src/modules/instance-ai`.

## What It Does

Instance AI is built around a deep-agent loop:

- An orchestrator agent receives the user's request and maintains the plan.
- Most work runs in the orchestrator; eval setup uses a focused background agent.
- Domain tools read and update n8n resources through backend adapters.
- Observational memory condenses long conversations.
- Workflow building runs in a sandbox workspace, validates generated TypeScript,
  and submits the workflow through the n8n backend.

The workflow builder requires sandboxing. The default provider is the n8n
sandbox service. Daytona remains an explicit provider for environments that
still need it.

## Running Locally

Instance AI is a backend module, so run it through n8n rather than this package
directly.

### 1. Start the n8n Sandbox Service

From the repo root:

```bash
TESTCONTAINERS_REUSE_ENABLE=true pnpm --filter n8n-containers services \
  --services sandbox \
  --network n8n-instance-ai-dev \
  --name n8n-svc-sandbox
```

This starts the sandbox API and runner containers and writes the host-reachable
sandbox environment variables to `packages/cli/bin/.env`. You can verify the
service from any terminal:

```bash
SANDBOX_PORT=$(docker port n8n-svc-sandbox-sandbox-api 8080/tcp | sed 's/.*://')
curl "http://localhost:${SANDBOX_PORT}/healthz"
```

Expected response:

```json
{"status":"ok"}
```

### 2. Start n8n With Instance AI Enabled

In a second terminal:

```bash
export N8N_ENABLED_MODULES=instance-ai
export N8N_AI_ENABLED=true

export N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-5
export N8N_INSTANCE_AI_MODEL_API_KEY="$ANTHROPIC_API_KEY"

export N8N_INSTANCE_AI_SANDBOX_ENABLED=true

pnpm dev:ai
```

The `pnpm --filter n8n-containers services` command writes
`N8N_INSTANCE_AI_SANDBOX_PROVIDER`, `N8N_SANDBOX_SERVICE_URL`, and
`N8N_SANDBOX_SERVICE_API_KEY` to `packages/cli/bin/.env`. If you are not using
that generated `.env` file, export them manually:

```bash
export N8N_SANDBOX_PORT=$(docker port n8n-svc-sandbox-sandbox-api 8080/tcp | sed 's/.*://')
export N8N_INSTANCE_AI_SANDBOX_PROVIDER=n8n-sandbox
export N8N_SANDBOX_SERVICE_URL="http://localhost:${N8N_SANDBOX_PORT}"
export N8N_SANDBOX_SERVICE_API_KEY=n8n-sandbox-ci-key
```

For n8n running inside the same Docker network as the sandbox service, use the
internal service URL instead:

```bash
N8N_SANDBOX_SERVICE_URL=http://sandbox-api:8080
```

### 3. Cleanup

```bash
pnpm --filter n8n-containers services:clean
docker network rm n8n-instance-ai-dev 2>/dev/null || true
```

## Useful Commands

Run focused tests:

```bash
pnpm --filter @n8n/instance-ai test
```

Print agent prompts:

```bash
pnpm --filter @n8n/instance-ai prompts:print
```

Run evaluations:

```bash
pnpm --filter @n8n/instance-ai eval:instance-ai
```

## More Documentation

- [Architecture](docs/architecture.md)
- [Configuration](docs/configuration.md)
- [Sandboxing](docs/sandboxing.md)
- [Tools](docs/tools.md)
- [Memory](docs/memory.md)
- [Streaming protocol](docs/streaming-protocol.md)
- [Evaluations](evaluations/README.md)
