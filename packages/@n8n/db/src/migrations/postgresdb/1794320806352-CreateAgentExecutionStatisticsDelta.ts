import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentExecutionStatisticsDelta1794320806352 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, escape, runQuery }: MigrationContext) {
		await createTable('agent_execution_statistics_delta').withColumns(
			column('id').bigint.primary.autoGenerate2,
			column('periodStart').timestampTimezone().notNull.comment('Start of the UTC day of the turn'),
		);
		// Use the workflow buffer's autovacuum settings.
		await runQuery(`ALTER TABLE ${escape.tableName('agent_execution_statistics_delta')} SET (
			autovacuum_vacuum_scale_factor = 0.0,
			autovacuum_vacuum_threshold = 1000,
			autovacuum_vacuum_cost_delay = 0
		)`);
	}

	async down({ schemaBuilder: { dropTable }, escape, runQuery }: MigrationContext) {
		const stats = escape.tableName('agent_execution_statistics');
		const delta = escape.tableName('agent_execution_statistics_delta');
		const period = escape.columnName('periodStart');
		const count = escape.columnName('count');
		await runQuery(`INSERT INTO ${stats} (${period}, ${count})
			SELECT ${period}, COUNT(*) FROM ${delta} GROUP BY ${period}
			ON CONFLICT (${period}) DO UPDATE SET ${count} = ${stats}.${count} + EXCLUDED.${count}`);
		await dropTable('agent_execution_statistics_delta');
	}
}
