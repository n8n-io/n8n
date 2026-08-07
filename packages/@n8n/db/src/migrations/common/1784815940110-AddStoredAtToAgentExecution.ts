import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddStoredAtToAgentExecution1784815940110 implements ReversibleMigration {
	async up({ escape, runQuery, tablePrefix }: MigrationContext) {
		const agentExecution = escape.tableName('agent_execution');
		const storedAt = escape.columnName('storedAt');

		await runQuery(
			`ALTER TABLE ${agentExecution} ADD COLUMN ${storedAt} VARCHAR(2) NOT NULL DEFAULT 'db' ` +
				`CONSTRAINT "CHK_${tablePrefix}agent_execution_storedAt" CHECK(${storedAt} IN ('db', 'fs', 's3', 'az'))`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const agentExecution = escape.tableName('agent_execution');
		const storedAt = escape.columnName('storedAt');

		await runQuery(`ALTER TABLE ${agentExecution} DROP COLUMN ${storedAt}`);
	}
}
