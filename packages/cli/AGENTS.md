# AGENTS.md

Guidance specific to the `cli` package. See the root [AGENTS.md](../../AGENTS.md)
for repo-wide conventions.

## TypeORM boundary

TypeORM belongs in the **persistence layer**, not in business logic.

**Allowed to import `@n8n/typeorm`** — entity and repository files, including the
ones co-located inside `src/modules/**`:

- `src/databases/**`
- a module's `database/entities/**` and `database/repositories/**`
- files named `*.entity.ts` or `*.repository.ts` (some modules keep these at the
  module root)

These are exempted in `eslint.config.mjs` **by location**, so a genuine `@Entity`
or repository class is never flagged — including the few entity files that lack
the `.entity.ts` suffix (they live in a `database/entities/` folder).

**Not allowed** — business logic (services, controllers, public-api handlers,
commands, factories) must not import `@n8n/typeorm` or `@n8n/typeorm/...`
subpaths. The `misplaced-n8n-typeorm-import` lint rule enforces this; a new
import — or an inline `eslint-disable` of the rule — fails CI. The same rule also
catches the **relabel dodge**: importing a TypeORM operator/driver type (`In`,
`Not`, `FindOptionsWhere`, `EntityManager`, …) from `@n8n/db`, which
re-exports them from `@n8n/typeorm` — that silences the direct-import check
without decoupling anything. Existing leaks of both kinds are tracked in two
`files`-scoped allowlists in `eslint.config.mjs` (direct `@n8n/typeorm` imports,
and `@n8n/db` relabels) that only ever shrink: never add to them, and never
suppress the rule inline.

Distinct from that shrink-only ratchet, two files are **permanently** exempted in
`eslint.config.mjs` for legitimate TypeORM use outside the persistence tree —
these are sanctioned, not migration targets, so don't try to relocate them or
suppress the rule:

- `src/commands/db/revert.ts` — `MigrationExecutor` (CLI migration tooling)
- `src/security-audit/security-audit.repository.ts` — `PackagesRepository`

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
