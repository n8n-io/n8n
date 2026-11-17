import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentExecutionStatistics1794319355722 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_execution_statistics').withColumns(
			column('periodStart').timestampTimezone().primary.comment('Start of the UTC day'),
			column('count').bigint.notNull,
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_execution_statistics');
	}
}
