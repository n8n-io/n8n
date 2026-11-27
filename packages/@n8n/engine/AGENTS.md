# @n8n/engine — structure & modularity intent

## Naming

Refer to this project as **engine v2** (lowercase `v2`). Do not use "Engine
2.0", "engine 2.0", or "v2.0". In code, use `engine-v2` for filenames and
`engineV2` for identifiers, as appropriate. Do not confuse engine v2 with n8n
v2 (the product version) or workflow execution order versions.

## The blueprint we're following

We structure this package after the **Durable Scheduler modularity blueprint**
([Notion](https://app.notion.com/p/n8n/The-Durable-Scheduler-a-modularity-blueprint-39f5b6e0c94f8193a5fecca8306c4424),
worked example: `packages/@n8n/scheduler`, enforced by its
`src/__tests__/dependency-purity.test.ts`). The core idea: a **pure core that
decides, with every effect handed in as an injected interface**. Dependency
arrows point one way — consumers depend on the engine; the engine core reaches
for nothing.

## Reality now: loose, but seam-aware

We are deliberately **loose about composition at this stage**. This one package
currently holds the engine core *and* its serving/persistence infrastructure.
We expect things to shuffle, so we're not paying the full ports-and-adapters
tax yet. What we **do** commit to is keeping the internal boundaries clean, so
serving infra and persistence can later be lifted into their own packages (e.g.
a deployable engine worker) without touching core logic.

## Layers (today, all in this package)

- **Core (decides)** — `graph/`, `execution/`, `reconciliation/`, `retention/`, `admittance/`. Pure
  orchestration/policy. Must not open connections, bind an HTTP server, or read
  the environment. Everything external arrives via constructor args / a deps bag
  (the `createScheduler(deps)` pattern).
- **Core interfaces** — interfaces the core depends on, each defined in its own
  core module beside a default/reference use: `AdmittanceService` (`admittance/`),
  `WorkQueue` (`queue/`), `ExecutionStore` / `StepStore` / `ExecutionViewStore`
  (`execution/`), `LifecycleEventPublisher` (`lifecycle-events/`). Adapters
  implement them; the core never imports the interface from an adapter. Handed
  in at construction.
- **Adapters (do)** — effectful implementations: `database/` (TypeORM entities,
  migrations, the Postgres `DataSource`, and `TypeOrmExecutionStore`), `queue/`
  (`InMemoryWorkQueue`, and `RedisWorkQueue` on a Redis list). The Postgres/ORM
  coupling lives *here only*. `createInMemoryWorkQueues` builds the pair of
  in-memory queues. `createRedisWorkQueues` builds the pair of Redis queues:
  the engine sets the list names and the message schemas. The host gives the
  Redis connections, the key prefix and the concurrency limits.
  `RedisWorkQueue` never closes a connection. A queue opens its consumer
  connection on its first `start()`, so a process that only publishes to a
  queue opens none for it. The factory's `close()` closes only the consumer
  connections that were opened; the host closes the publisher. The engine has
  no runtime dependency on `ioredis`; the adapter declares the client commands
  it needs as interfaces.
- **Serving infra** — `server/` (express), `serve.ts` (standalone entrypoint),
  Dockerfile. First candidate to be extracted later.
- **Runtime factory** — `runtime/` (`createEngineRuntime`). Owns the engine's
  internal topology: the stores, the handlers, the workers, the HTTP app and the
  start/stop order. It takes the adapters a host chooses and returns a running
  engine, so no host repeats the wiring. The host gives it the queues. It
  starts and stops the queues its roles consume, but never closes their
  connections.
  A process runs one or more roles (all three by default): `api` mounts `/api`,
  `orchestrator` runs the orchestration worker and the reconciliation sweeper,
  and `step-worker` runs the step worker and the wait sweeper. Every role serves
  `/healthz`. Roles can be split over processes only on shared queues: the
  in-memory queues need all three roles in one process. Only the `api` role
  needs an identity verifier, and the factory refuses that role without one.
  A data plane database is not optional — the factory's type requires one, and
  each composition root refuses to start without it rather than serving
  `/healthz` while unable to run a workflow.
- **Composition roots** — `serve.ts` (standalone) and, in integrated mode,
  `packages/cli`. These construct the concrete adapters (the `DataSource`, the
  admittance policy, the v1 step executor and, in the `n8n engine` process, the
  Redis connections for the work queues) and hand them to the engine factories
  (`createEngineRuntime`, `createInMemoryWorkQueues`, `createRedisWorkQueues`).
  **Construction lives here, not in the core** — but the topology does not:
  that belongs to the factories.

## Rules that keep the seams extractable

- Core modules (`graph`, `execution`, `reconciliation`, `retention`, `admittance`) don't import `express`,
  `pg`, or `@n8n/typeorm`, don't construct a `DataSource`, and never import from
  `database/`. Persistence, queue, and HTTP are injected. The dependency arrow
  is one-way: `database/` imports the interface + domain types from the core, not
  the reverse.
- `@n8n/typeorm` / `pg` stay confined to `database/`.
- `@n8n/config` + `@n8n/di` are used only at the serving/composition layer (for
  `EngineConfig`), never in core logic. (The blueprint flags `@n8n/config` as
  debatable precisely because it pulls the DI runtime in — keep it out of core.)
- We go one step stricter than the scheduler's allowlist: **no `n8n-workflow`
  dependency at all, not even type-only** (per the Engine v2 design — the core
  must stay free of v1 concepts). Shared JSON types are redefined locally in
  `common/`.
- Arrows point inward: `cli`/`serve` depend on the engine; the engine never
  imports `cli`.
- When serving infra is extracted, add a `dependency-purity.test.ts` (as
  `@n8n/scheduler` does) to enforce the allowlist. Until then, this doc is the
  intent.

## Migrations are additive

Change the schema only with a new migration, for example one that adds a
column. Never edit a migration that is already on master. Engine databases
persist, and a database that ran a migration does not run it again, so an edit
never reaches it. The engine roles are deployed and upgraded independently, so
for a while old code runs on the new schema and a migration must not remove
what that code uses.

A new migration gets a timestamp later than the last one and its entry in
`src/database/migrations/index.ts`. Add its file name to the
`unicorn/filename-case` exemptions in `oxlint.config.mts` and
`eslint.config.mjs`. Mirror a new column or index in the entity decorators.
All pending engine migrations run in one transaction under the migration lock,
so a migration cannot opt out of the transaction (for example,
`CREATE INDEX CONCURRENTLY` does not work).

## Crash recovery: reconciliation, not transactions

Handlers advance an execution through several separate writes — claim the
execution, insert step rows, publish the next message — and we deliberately do
**not** make that sequence atomic. Crashing partway through can leave partial
state, such as an execution stuck `running` with no queued step.

The intended answer is a reconciliation layer that detects crashed or stalled
executions and drives recovery (CAT-2938), not transactions spanning stores and
queues. So when you find a partial-write window: make the resulting state
legible to reconciliation, and don't reach for a cross-store transaction. It's a
recurring review question — this is the standing answer.

## Read path and execution path have their own types

A row is not a type. `ExecutionRecord`/`StepRecord`/`StepSummary` are what
running an execution needs; `ExecutionView`/`StepView`
(`execution/execution-view-store.ts`) are what reporting one needs;
`ExecutionSnapshot`/`StepDetail` (`server/api.types.ts`) are the wire. Put a
field on the path that reads it. Keep value types (`StepStatus`, `StepError`,
`StepSlots`, `WorkflowGraph`) shared.

Reads go through `ExecutionViewStore`, so a reader's type cannot reach
`claimStep` or `finishExecution`, and read-side logic has one seam
(`ExecutionQueryService`). Name the columns in the query: these types are
structural, so an adapter returning whole entities still type-checks and still
ships every column.

## Error messages name nodes, not IDs

Users see engine errors in the editor, and node IDs mean nothing to them. When
an error message refers to a node, use the node's name. Use
`createNodeLabeler(graph)` from `graph/` to get the name in quotes. It falls
back to the ID when the graph has no node with that ID.

## Known deviations — the seams to clean up on decomposition

- `DataSource` construction currently lives in `database/`; it is really a
  composition-root concern.
