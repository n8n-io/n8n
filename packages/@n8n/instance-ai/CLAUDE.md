# Instance AI — Development Guidelines

## Linear Tickets

- **Never set priority to Urgent (1)**. Use High (2) as the maximum.

## Engineering Standards

Follow `docs/ENGINEERING.md` for all implementation work. Key rules:

- **No `any`, no `as` casts** — use discriminated unions, type guards, `satisfies`
- **Zod schemas are the source of truth** — infer types with `z.infer<>`, don't define types separately
- **Shared types in `@n8n/api-types`** — event types, API shapes, enums
- **Test behavior, not implementation** — test contracts, edge cases, observable outcomes
- **Tools are thin wrappers** — validate input, call service, return output. No business logic in tools.
- **Respect the layer boundaries** — Tool → Service interface → Adapter → n8n internals

## Architecture

Read these docs before starting any implementation:

- `docs/architecture.md` — system diagram, deep agent pillars, package responsibilities
- `docs/streaming-protocol.md` — canonical event schema, SSE transport, replay rules
- `docs/tools.md` — tool reference, orchestration tools, domain tools, tool distribution
- `docs/memory.md` — memory tiers, scoping model, sub-agent memory
- `docs/filesystem-access.md` — filesystem architecture, gateway protocol, security model
- `docs/sandboxing.md` — Daytona/local sandbox providers, workspace lifecycle, builder loop
- `docs/configuration.md` — environment variables, minimal setup, storage, event bus

## E2E Testing

Tests live in `packages/testing/playwright/tests/e2e/instance-ai/`.

### Local-build mode (no docker, no recording — hits real Anthropic API)

```bash
cd packages/testing/playwright
export ANTHROPIC_API_KEY=sk-ant-...
pnpm test:local:instance-ai                  # full suite
pnpm test:local:instance-ai --grep "preview" # single test
```

Each run gets a random port + throwaway DB — safe to run in parallel, never
touches `~/.n8n`. This mode does **not** record proxy expectations; it
bypasses the proxy stack entirely and calls Anthropic directly.

### Recording expectations (docker required)

To record (or re-record) proxy expectations for CI replay, run in container
mode with a real key. This captures LLM traffic + tool traces into
`expectations/instance-ai/<test-slug>/`:

```bash
pnpm build:docker   # from repo root — build the local n8n image first
cd packages/testing/playwright
ANTHROPIC_API_KEY=sk-ant-... pnpm test:container:sqlite tests/e2e/instance-ai --workers 1
```

Commit the regenerated `expectations/` files alongside the test.

See `docs/e2e-tests.md` for the full recording/replay architecture.

## Key Conventions

- **Event schema**: `{ type, runId, agentId, payload? }` — defined in `streaming-protocol.md`
- **POST `/chat/:threadId`** returns `{ runId }` — not a stream
- **SSE `/events/:threadId`** delivers all events — replay via `Last-Event-ID` header or `?lastEventId` query param
- **Run lifecycle**: `run-start` (first) → events → `run-finish` (last, carries status)
- **Planned tasks**: `plan` tool for multi-step work; tasks run detached as background agents
- **Sub-agents**: stateless, native domain tools only, no MCP, no recursive delegation
- **Memory**: observational memory = thread-scoped, working memory is disabled
