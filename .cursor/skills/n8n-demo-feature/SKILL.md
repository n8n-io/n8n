---
name: n8n-demo-feature
description: Pattern for demo-gated features in the n8n monorepo (Insights Analyst is the canonical example). Use when adding a feature that should only run in customer-demo / dev environments.
---

# n8n Demo Feature

A demo feature is one that we want to ship to community/demo builds but never to production tenants without a flag. The Insights Analyst is the canonical example.

## Required pieces

1. **Env flag** — name it `N8N_<FEATURE>_DEMO` or `N8N_DEMO_<FEATURE>`. Wire it through a `@Config` class with `@Env(...)` and a `boolean = false` default. Surface it on the frontend via `FrontendModuleSettings` so the route guard can hide the page entirely when off.

2. **Idempotent seed** — the data the demo relies on must be created at startup if missing and replaced (not duplicated) on subsequent runs. Use stable identifiers tagged with the feature so you can clean up safely (`insights-demo-*` is a good convention). The seed runs inside `BackendModule.init()` only when the flag is enabled.

3. **Deterministic fallback** — if the feature includes any LLM call, an unconfigured API key must not break the demo. Provide canned responses that use the seeded data. The frontend can show a "Powered by <provider>" badge only when the LLM mode is active.

4. **Package scope** — keep the seed and the controllers inside the feature module (e.g. `packages/cli/src/modules/insights/`). Don't spill demo data into shared services.

5. **Never break the community demo** — every code path must work without external credentials, network access (beyond the local sample data), or paid licenses.

## Checklist before opening the PR

- [ ] Env flag added to `@n8n/config` (or module-local config) with `@Env`, default `false`, docstring.
- [ ] Frontend route is gated by the flag (returns NOT_FOUND otherwise).
- [ ] Seed is idempotent (run twice → same final state).
- [ ] Fallback path covered by a deterministic test.
- [ ] Demo flag documented in the Linear ticket / PR description.
- [ ] No license-gated calls without a fallback.

## Out of scope for v1 of a demo feature

- Migrations beyond what already exists.
- SSE/push streaming UI (sync JSON keeps the demo simpler).
- Multi-tenant / project-scoped variations of the seed (one demo project is enough).

## Related

- `n8n-build-feature` (orchestrator)
- `n8n-llm-feature` (LLM integration patterns)
- `n8n-rebuild-doctor` (when the demo doesn't update after a change)
- `bugbot/cost-controls.md` (if you add an LLM provider)
