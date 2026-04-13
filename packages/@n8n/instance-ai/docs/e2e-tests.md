# Instance AI E2E Tests

End-to-end tests for the instance-ai feature live in
[`packages/testing/playwright/tests/e2e/instance-ai`](../../../testing/playwright/tests/e2e/instance-ai).
The full recording/replay architecture, tool tracing, and ID-remapping
docs will land alongside those tests. This doc covers the subset that's
relevant once the generic local Playwright runner is in place: running
the tests against a local n8n build.

## Running Tests

### Local-build mode (no docker, real Anthropic key)

For fast iteration against a local n8n build — skips the container and
proxy stack entirely. Tests hit the real Anthropic API directly, with no
recording or replay.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pnpm --filter=n8n-playwright test:local:instance-ai
```

Extra args flow through to `playwright test`:

```bash
# Single file
pnpm --filter=n8n-playwright test:local:instance-ai instance-ai-workflow-preview.spec.ts

# Grep
pnpm --filter=n8n-playwright test:local:instance-ai --grep "preview"

# Multiple instances in parallel — each gets its own random port + temp DB
pnpm --filter=n8n-playwright test:local:instance-ai --grep "preview" &
pnpm --filter=n8n-playwright test:local:instance-ai --grep "sidebar"  &
wait

# Pin the port (e.g. for browser inspection at http://localhost:5680)
N8N_BASE_URL=http://localhost:5680 pnpm --filter=n8n-playwright test:local:instance-ai --grep "preview"

# Headed browser for visual debugging
pnpm --filter=n8n-playwright test:local:instance-ai --grep "preview" --headed
```

### What `test:local:instance-ai` does

It's a thin wrapper that pre-fills the four env vars n8n needs to boot the
instance-ai module (`N8N_ENABLED_MODULES`, `N8N_INSTANCE_AI_MODEL`,
`N8N_INSTANCE_AI_MODEL_API_KEY`, `N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED`)
over the generic
[`test:local:isolated`](../../../testing/playwright/README.md#testlocalisolated--local-run-with-full-isolation)
runner. The generic runner provides:

- **Random free OS ports** for n8n and the task-runner broker, so multiple
  invocations don't collide.
- **Throwaway `N8N_USER_FOLDER`** under the OS temp dir, cleaned up on
  exit. Your `~/.n8n/database.sqlite` is never touched.
- **Container-only tests included** (`@capability:*`, `@licensed`,
  `@db:reset`). Fixtures must detect the missing container and skip or
  fall back.
- **Self-managed n8n** with a real `/rest/e2e/reset` readiness check and
  `PLAYWRIGHT_SKIP_WEBSERVER=true`, so Playwright doesn't race to start a
  duplicate.
- **Process-group cleanup** so `node ./n8n` and the task-runner don't get
  orphaned when the script exits.

> **Cost note:** Each run makes real Anthropic calls. Scope with `--grep`
> or a filename while iterating.
