# @n8n/engine — structure & modularity intent

## The blueprint we're following

We structure this package after the **Durable Scheduler modularity blueprint**
([Notion](https://app.notion.com/p/n8n/The-Durable-Scheduler-a-modularity-blueprint-39f5b6e0c94f8193a5fecca8306c4424),
worked example: `packages/@n8n/scheduler`, enforced by its
`src/__tests__/dependency-purity.test.ts`). The core idea: a **pure core that
decides, with every effect handed in as a port**. Dependency arrows point one
way — consumers depend on the engine; the engine core reaches for nothing.

## Reality now: loose, but seam-aware

We are deliberately **loose about composition at this stage**. This one package
currently holds the engine core *and* its serving/persistence infrastructure.
We expect things to shuffle, so we're not paying the full ports-and-adapters
tax yet. What we **do** commit to is keeping the internal boundaries clean, so
serving infra and persistence can later be lifted into their own packages (e.g.
a deployable engine worker) without touching core logic.

## Layers (today, all in this package)

- **Core (decides)** — `graph/`, `execution/`, `admittance/`. Pure
  orchestration/policy. Must not open connections, bind an HTTP server, or read
  the environment. Everything external arrives via constructor args / a deps bag
  (the `createScheduler(deps)` pattern).
- **Ports** — interfaces the core depends on, each defined in its own core
  module beside a default/reference use: `AdmittanceService` (`admittance/`),
  `WorkQueue` (`queue/`), `ExecutionStore` (`execution/`). Adapters implement
  them; the core never imports the port from an adapter. Handed in at
  construction.
- **Adapters (do)** — effectful implementations: `database/` (TypeORM entities,
  migrations, the Postgres `DataSource`, and `TypeOrmExecutionStore`), `queue/`
  (in-memory default). The Postgres/ORM coupling lives *here only*.
- **Serving infra** — `server/` (express), `serve.ts` (standalone entrypoint),
  Dockerfile. First candidate to be extracted later.
- **Composition roots** — `serve.ts` (standalone) and, in integrated mode,
  `packages/cli`. These construct the concrete adapters (the `DataSource`, etc.)
  and hand them in. **Construction lives here, not in the core.**

## Rules that keep the seams extractable

- Core modules (`graph`, `execution`, `admittance`) don't import `express`,
  `pg`, or `@n8n/typeorm`, don't construct a `DataSource`, and never import from
  `database/`. Persistence, queue, and HTTP are injected. The dependency arrow
  is one-way: `database/` imports the port + domain types from the core, not the
  reverse.
- `@n8n/typeorm` / `pg` stay confined to `database/`.
- `@n8n/config` + `@n8n/di` are used only at the serving/composition layer (for
  `EngineConfig`), never in core logic. (The blueprint flags `@n8n/config` as
  debatable precisely because it pulls the DI runtime in — keep it out of core.)
- We go one step stricter than the scheduler's allowlist: **no `n8n-workflow`
  dependency at all, not even type-only** (per the Engine 2.0 design — the core
  must stay free of v1 concepts). Shared JSON types are redefined locally in
  `common/`.
- Arrows point inward: `cli`/`serve` depend on the engine; the engine never
  imports `cli`.
- When serving infra is extracted, add a `dependency-purity.test.ts` (as
  `@n8n/scheduler` does) to enforce the allowlist. Until then, this doc is the
  intent.

## Known deviations — the seams to clean up on decomposition

- `DataSource` construction currently lives in `database/`; it is really a
  composition-root concern.
