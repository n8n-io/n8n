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
- `docs/FRONTEND_PLAN.md` — TypeScript types, store structure, reducer, rendering rules
- `docs/tools.md` — tool reference, orchestration tools (plan, delegate), domain tools
- `docs/memory.md` — memory tiers, scoping model
- `docs/decisions.md` — ADR-001 through ADR-017
- `docs/IMPLEMENTATION_PHASES.md` — ticket sequencing and dependencies
- `docs/vision.md` — future direction, autonomous loop, MCP self-augmentation

## Key Conventions

- **Event schema**: `{ type, runId, agentId, payload? }` — defined in `streaming-protocol.md`
- **POST `/chat/:threadId`** returns `{ runId }` — not a stream
- **SSE `/events/:threadId`** delivers all events — replay via `Last-Event-ID` header or `?lastEventId` query param
- **Run lifecycle**: `run-start` (first) → events → `run-finish` (last, carries status)
- **Sub-agents**: stateless, native domain tools only, no MCP, no recursive delegation
- **Memory**: working memory = user-scoped, observational memory = thread-scoped
