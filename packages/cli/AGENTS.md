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
import — or an inline `eslint-disable` of the rule — fails CI. Existing
business-logic leaks are tracked in a `files`-scoped allowlist in
`eslint.config.mjs` that only ever shrinks: never add to it, and never suppress
the rule inline.

Need an operator query (`In`, `IsNull`, `FindOptionsWhere`, …)? Add a
use-case-named repository method (plain parameters, domain-shaped return) rather
than importing the operator into business logic. Don't relabel the import to
`@n8n/db`, string-match `QueryFailedError`, or push `.manager` /
`createQueryBuilder` into business logic to dodge the rule. See the root
"Persistence layer & the TypeORM boundary" section for the full rationale.
