# @n8n/telemetry-frontend

Shared browser-side primitives used by n8n's front-end packages that report telemetry through RudderStack:

- `loadRudderStack(...)` — the v1 browser-SDK stub loader (script tag injection + call queue) used by `packages/frontend/editor-ui` and `packages/@n8n/mcp-apps`.
- `RudderStack` — the minimal TypeScript surface of the RudderStack SDK n8n calls into.
- `ANONYMOUS_IP_CONTEXT` — the `{ context: { ip: '0.0.0.0' } }` option n8n passes on every event so RudderStack does not record the user's real IP.
- `sanitizeTelemetryProperties` / `sanitizeTelemetryErrorMessage` — secret-scrubbing helpers built on `@n8n/utils`'s `scrubSecretsInText`, to be applied before properties leave the browser.

The package is browser-only (uses `window` and `document`) and ships both CJS and ESM bundles via `tsdown`, matching the `@n8n/utils` package shape.

## Why a shared package

Both `editor-ui` and `mcp-apps` independently re-implemented the RudderStack stub loader, the `RudderStack` TypeScript interface, and the `0.0.0.0` IP-context pattern. The mcp-apps PR also added secret-scrubbing that editor-ui can adopt. Centralising these here keeps the loader in one place and lets future MCP apps reuse it without copying.

## Out of scope

- `track`/`identify`/`page` enrichment — each consumer enriches differently (Pinia stores in editor-ui, an injected config object in mcp-apps), so the consuming package owns that layer.
- Server-side RudderStack — `packages/cli` uses `@rudderstack/rudder-sdk-node` and is a separate concern.
