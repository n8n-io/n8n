import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'llm_budget';

/**
 * Admin budgets for the LLM spend in `llm_usage`. A budget targets workflows, agents, projects,
 * users or credentials, and IDs in `target` are soft references: a budget outlives its targets.
 * The table is small and read whole, so it has no index.
 */
export class CreateLlmBudgetTable1793095582545 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName).withColumns(
			column('id').varchar(36).primary,
			column('name').varchar(128).notNull,
			column('enabled').bool.notNull.default(true),
			column('target').json.notNull.comment(
				'Dimension name to filter: { match: "all" } or { match: "ids", ids }',
			),
			// `window` is an SQL keyword.
			column('timeWindow').json.notNull.comment(
				'{ kind: "rolling" | "calendar", unit: "day" | "week" | "month" }',
			),
			column('metric')
				.varchar(16)
				.notNull.withEnumCheck(['costUsd'])
				.comment('What the limit counts'),
			// `limit` is an SQL keyword.
			column('limitAmount').double.notNull,
			column('action')
				.varchar(16)
				.notNull.withEnumCheck(['block', 'warn'])
				.comment('block stops calls at the limit, warn only emits events'),
			column('warnAtPercent').json.notNull,
			column('managedBy')
				.varchar(32)
				.comment('The system that owns the budget, for example agent. NULL for an admin budget'),
			column('externalId').varchar(255).comment('The ID of the budget in its managing system'),
			column('version')
				.int.notNull.default(1)
				.comment('Raised by one on each write, for optimistic concurrency'),
		).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
