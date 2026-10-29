# AGENTS.md

Guidance specific to the `cli` package. See the root [AGENTS.md](../../AGENTS.md)
for repo-wide conventions.

## TypeORM boundary

TypeORM belongs in the **persistence layer**, not in business logic.

**Allowed to import `@n8n/typeorm`** — files that declare an `@Entity` class or
a class that extends TypeORM `Repository` or n8n `BaseRepository`. Their folder
and filename do not affect the rule. The file-private table class of a
composition repository (see below) satisfies this check, so such a repository
needs no exception. Tests and migration tooling use Code Health exceptions.
Helper-only persistence adapters need a narrow, auditable entry in the
`typeorm-persistence-boundary` rule.

**Not allowed** — business logic (services, controllers, public-api handlers,
commands, factories) must not import `@n8n/typeorm` or `@n8n/typeorm/...`
subpaths. The `typeorm-persistence-boundary` Code Health rule enforces this. A
new import fails CI. The same rule also
catches the **relabel dodge**: importing a TypeORM operator/driver type (`In`,
`Not`, `FindOptionsWhere`, `EntityManager`, …) from `@n8n/db`, which
re-exports them from `@n8n/typeorm` — that silences the direct-import check
without decoupling anything. Existing leaks of both kinds are tracked in the
shrink-only Code Health baseline. Do not add new baseline entries.

Distinct from that shrink-only ratchet, `src/commands/db/revert.ts` is an exact
exception for CLI migration tooling. Adapters with no `Repository` or
`BaseRepository` subclass in the file at all (for example
`src/modules/data-table/data-table-rows.repository.ts`) also need an exact
`allowedFiles` entry in the rule. A repository with a file-private table class
needs none.

## Repositories

A repository is the boundary that keeps TypeORM out of business logic, so it
**composes** a `BaseRepository` and never extends one. Extending would hand
every injecting service `find`, `save`, `delete`, `createQueryBuilder` and
`.manager` for free, and TypeORM would leak through inferred types that no lint
rule can see. Declare a file-private subclass (the table), hold it as a private
field, and write every data access as a named use-case method that calls
`this.table.managerFor(ctx)` internally. The table is never exported or
registered with DI. See the root AGENTS.md section for the rules and
`src/modules/inbound-auth-core/database/repositories/trusted-source.repository.ts`
for a worked example. Most repositories in this package still extend
`BaseRepository` or `Repository`. They are legacy: do not copy them, and do not
convert them in unrelated PRs.

Need an operator query (`In`, `IsNull`, `FindOptionsWhere`, …)? Add a
use-case-named repository method (plain parameters, domain-shaped return) rather
than importing the operator into business logic. Relabeling the import to
`@n8n/db` is lint-enforced against, not just convention (see above); likewise
don't string-match `QueryFailedError` or push `.manager` / `createQueryBuilder`
into business logic to dodge the rule. See the root "Persistence layer & the
TypeORM boundary" section for the full rationale.

## Transactions

Three patterns coexist while the persistence layer is migrated — new code uses
only the third:

1. **`manager.transaction(...)`** — raw TypeORM, leaks the ORM into business
   logic. Anti-pattern; being removed.
2. **`withTransaction(...)`** (`@n8n/db`) — deprecated helper that still hands an
   `EntityManager` to its callback. Removed as call sites migrate.
3. **`TransactionRunner.run(ctx, fn)`** (`@n8n/db`) — the target. Inject the
   `TransactionRunner` port and thread the `OperationContext`; the driver handle
   never reaches business logic. Use this for new work.

See the root AGENTS.md "Transactions" bullet for the full API and a worked
example.

## Tests

- Mock external HTTP services with `nock`.
- Reuse immutable hoisted `mock<T>(...)` fixtures. Do not replace typed entity
  mocks with `as unknown as T`.
- When a mock changes `existsSync()` or another filesystem state check, inspect
  the branch it activates. Mock reachable writes unless the test checks them.
