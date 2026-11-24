import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Adds a nullable `agentId` column to `execution_entity`. It names the agent
 * whose workflow tool started the execution, so the executions list can show
 * and filter by it without reading the run data. It has no foreign key: an
 * execution keeps the ID after the agent is deleted.
 *
 * Old executions keep `null`. Their agent is only in the run data.
 *
 * A raw `ADD COLUMN`, because the schema builder recreates the table on
 * SQLite, and other tables cascade from `execution_entity`.
 */
export class AddAgentIdToExecutions1795504682687 implements ReversibleMigration {
	async up({ escape, runQuery, schemaBuilder: { createIndex } }: MigrationContext) {
		const table = escape.tableName('execution_entity');
		const column = escape.columnName('agentId');
		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${column} VARCHAR(36)`);
		await createIndex(
			'execution_entity',
			['agentId', 'id'],
			/*isUnique=*/ false,
			/*customIndexName=*/ undefined,
			/*whereClause=*/ '"agentId" IS NOT NULL',
		);
	}

	async down({ escape, runQuery, schemaBuilder: { dropIndex } }: MigrationContext) {
		await dropIndex('execution_entity', ['agentId', 'id']);
		const table = escape.tableName('execution_entity');
		const column = escape.columnName('agentId');
		await runQuery(`ALTER TABLE ${table} DROP COLUMN ${column}`);
	}
}
