# AGENTS.md

Guidance specific to the `cli` package. See the root [AGENTS.md](../../AGENTS.md)
for repo-wide conventions.

## TypeORM boundary

TypeORM belongs in the **persistence layer**, not in business logic.

**Allowed to import `@n8n/typeorm`** — files that declare an `@Entity` class or a
repository class that extends TypeORM `Repository` or n8n `BaseRepository`.
Their folder and filename do not affect the rule. Tests and migration tooling use
Code Health exceptions. Helper-only persistence adapters need a narrow,
auditable entry in the `typeorm-persistence-boundary` rule.

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
exception for CLI migration tooling. Composition-based repositories use exact
exceptions. Repository subclasses need no exception.

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
