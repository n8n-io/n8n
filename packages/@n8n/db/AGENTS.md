# AGENTS.md

Extra information specific to the `@n8n/db` package.

## Database migrations

For full guidance on authoring migrations — scaffolding, the pre-flight
checklist the `@n8n-io/migrations-review` team enforces, the
`MigrationContext` API reference, the DSL type mapping, and the detailed
rule catalogue — use the **`n8n:db-migrations`** Claude Code skill at
`.claude/plugins/n8n/skills/db-migrations/`.

Source-of-truth files the skill defers to:
- `packages/@n8n/db/src/migrations/migration-types.ts` — `MigrationContext`, `ReversibleMigration`, `IrreversibleMigration`
- `packages/@n8n/db/src/migrations/dsl/` — schema builder DSL
- `packages/@n8n/backend-test-utils/MIGRATION_TESTING.md` — migration testing helpers
