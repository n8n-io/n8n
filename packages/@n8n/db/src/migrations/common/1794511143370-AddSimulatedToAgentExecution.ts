import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Safe testing: mark agent executions that ran as test runs. Plain ALTER TABLE
 * on both dialects, because recreating the table on SQLite would cascade-delete
 * rows.
 */
export class AddSimulatedToAgentExecution1794511143370 implements ReversibleMigration {
	async up({ runQuery, escape, isPostgres }: MigrationContext) {
		const executions = escape.tableName('agent_execution');
		const simulated = escape.columnName('simulated');

		await runQuery(
			`ALTER TABLE ${executions} ADD COLUMN ${simulated} boolean NOT NULL DEFAULT false`,
		);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${executions}.${simulated} IS 'True when the run was a test run: tool calls went to a simulation, not to real services.'`,
			);
		}
	}

	async down({ runQuery, escape }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('agent_execution')} DROP COLUMN ${escape.columnName('simulated')}`,
		);
	}
}
