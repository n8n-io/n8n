# Running the eval locally — setup notes

The eval harness builds the workflow on a **live** n8n instance with Instance AI
enabled, then mocks execution and verifies. Getting a local build to actually
run needs more than the README quick-start states. Three blockers, in order:

1. **Sandbox auth.** If the instance runs with
   `N8N_INSTANCE_AI_SANDBOX_ENABLED=true` + `SANDBOX_PROVIDER=daytona`, every
   build crashes with `DaytonaAuthManager requires exactly one of staticApiKey
   or getAuthToken` unless Daytona auth is supplied. Direct mode needs
   `DAYTONA_API_KEY` + `DAYTONA_API_URL`. (Proxy-vended Daytona tokens via the
   AI-assistant staging proxy may not engage even with a valid license — prefer
   direct mode.)
2. **Force direct sandbox mode.** Direct Daytona mode is only chosen when
   `isProxyEnabled()` is false (`= isAiAssistantEnabled() && aiAssistant.baseUrl`).
   Boot with `N8N_AI_ASSISTANT_BASE_URL=` (empty) to force it.
3. **Orchestrator LLM key.** With the proxy off, the build LLM uses
   `@ai-sdk/anthropic`, which reads `ANTHROPIC_API_KEY` from env —
   `N8N_AI_ANTHROPIC_KEY` alone is **not** wired into the non-proxy model client.
   Set `ANTHROPIC_API_KEY` to the same value.

## Working recipe

Keep machine-specific secrets (Daytona + Anthropic keys, sandbox flags) in a
local env file, e.g. `.env.eval` at the repo root — **gitignore it**.

```bash
# 1. boot the instance (E2E_TESTS exposes /rest/e2e/reset for owner seeding)
E2E_TESTS=true N8N_AI_ASSISTANT_BASE_URL= ANTHROPIC_API_KEY="$ANTH" \
  npx dotenvx run -f .env.local -f .env.eval -- pnpm dev:ai

# 2. seed the owner (the e2e reset route registers a few seconds after
#    /healthz returns — retry; default owner nathan@n8n.io / PlaywrightTest123)
curl -sf -X POST http://localhost:5678/rest/e2e/reset -H "Content-Type: application/json" -d '{"owner":{...}}'

# 3. run the eval
cd packages/@n8n/instance-ai
N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-6 \
N8N_EVAL_EMAIL=nathan@n8n.io N8N_EVAL_PASSWORD=PlaywrightTest123 \
  npx dotenvx run -f ../../../.env.local -f ../../../.env.eval -- \
  pnpm eval:instance-ai --filter <slug> --keep-workflows --verbose
```

Gotchas:

- `dotenvx` is only on PATH via `npx dotenvx`; the bare `dotenvx` command fails.
- The eval helper (mock-gen, verifier, user-proxy, expectation judge) also needs
  the Anthropic key; it reads `N8N_AI_ANTHROPIC_KEY` or `ANTHROPIC_API_KEY` and
  defaults the model to `anthropic/claude-sonnet-4-6`.
- Inspect a built workflow with `GET /rest/workflows/<id>` (authenticate via the
  `N8nClient` in `evaluations/clients/n8n-client.ts`, or any logged-in session).
- A full build is ~60–180s; the sandbox image is built on first run, so the
  first build is slower.
