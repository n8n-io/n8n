# Local Agent Builder eval setup

## Required LangTracer access

Generate a key on the
[LangTracer API keys page](https://lang-tracer.n8n-maintenance.workers.dev/account?section=api).
Add it to `.env.local` at the repository root:

```env
LANGTRACER_URL=https://lang-tracer.n8n-maintenance.workers.dev
LANGTRACER_API_KEY=<generated-key>
```

Do not paste the key into chat or put it in a command. The main skill checks
that both variables exist before it creates an eval.

## Remaining environment

Create `.env.local` at the repository root. Use one Instance AI model provider
and one sandbox provider.

```env
N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-6
N8N_INSTANCE_AI_MODEL_API_KEY=<model-key>
ANTHROPIC_API_KEY=<same-model-key>
N8N_AI_ASSISTANT_BASE_URL=

N8N_INSTANCE_AI_SANDBOX_ENABLED=true
N8N_INSTANCE_AI_SANDBOX_PROVIDER=daytona
DAYTONA_API_URL=https://app.daytona.io/api
DAYTONA_API_KEY=<daytona-key>

N8N_EVAL_EMAIL=nathan@n8n.io
N8N_EVAL_PASSWORD=PlaywrightTest123
```

Use the n8n sandbox service instead of Daytona when it is available. Set
`N8N_INSTANCE_AI_SANDBOX_PROVIDER=n8n-sandbox`,
`N8N_SANDBOX_SERVICE_URL`, and, when required,
`N8N_SANDBOX_SERVICE_API_KEY`.

LangSmith is optional. Unset `LANGSMITH_API_KEY` and `LANGSMITH_TRACING` for a
throwaway direct run. This keeps the run out of the shared LangSmith dataset.

## Build after code changes

From the repository root:

```bash
(
  pnpm --filter n8n... build > build.log 2>&1
  build_status=$?
  tail -n 20 build.log
  exit "$build_status"
)
```

Restart the instance after each build. A running process keeps the old code in
memory.

## Start an isolated instance

Create a temporary user directory:

```bash
mktemp -d /tmp/n8n-agent-eval.XXXXXX
```

Use the printed path as `N8N_USER_FOLDER`. Start the built CLI from
`packages/cli`:

```bash
N8N_PORT=5680 \
N8N_RUNNERS_BROKER_PORT=5681 \
N8N_USER_FOLDER=<printed-temp-directory> \
E2E_TESTS=true \
N8N_ENABLED_MODULES=instance-ai,agents \
N8N_AI_ENABLED=true \
pnpm exec dotenvx run -f ../../.env.local -- pnpm start
```

Use different ports when 5680 or 5681 is busy.

## Seed the owner

Run this once after the isolated instance starts:

```bash
curl -sf -X POST http://localhost:5680/rest/e2e/reset \
  -H 'Content-Type: application/json' \
  -d '{"owner":{"email":"nathan@n8n.io","password":"PlaywrightTest123","firstName":"Eval","lastName":"Owner"},"admin":{"email":"admin@n8n.io","password":"PlaywrightTest123","firstName":"Admin","lastName":"User"},"members":[],"chat":{"email":"chat@n8n.io","password":"PlaywrightTest123","firstName":"Chat","lastName":"User"}}'
```

## Run a local disk case

From `packages/@n8n/instance-ai`:

```bash
pnpm exec dotenvx run -f ../../../.env.local -- \
  env -u LANGSMITH_API_KEY -u LANGSMITH_TRACING \
  pnpm eval:instance-ai \
  --base-url http://localhost:5680 \
  --filter <slug> \
  --tier agents \
  --concurrency 1 \
  --verbose
```

The run writes `eval-results.json`, an HTML report, and a PR-comment preview.
The warnings about disabled run-debug capture are benign.
