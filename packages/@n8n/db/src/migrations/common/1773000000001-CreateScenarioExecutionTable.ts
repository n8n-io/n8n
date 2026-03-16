import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'scenario_execution';

export class CreateScenarioExecutionTable1773000000001 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName).withColumns(
			column('id').int.primary.autoGenerate,
			column('workflowId').varchar().notNull,
			column('mode').varchar(20).notNull,
			column('status').varchar(20).notNull.default("'running'"),
			column('startedAt').timestamp().notNull.default('CURRENT_TIMESTAMP'),
			column('stoppedAt').timestamp(),
			column('data').text,
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
