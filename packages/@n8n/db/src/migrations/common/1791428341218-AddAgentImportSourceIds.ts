import type { MigrationContext, ReversibleMigration } from '../migration-types';

const identities = [
	{ table: 'agents', owner: 'projectId', source: 'sourceAgentId', length: 36 },
	{ table: 'agent_task_definition', owner: 'agentId', source: 'sourceTaskId', length: 32 },
];

export class AddAgentImportSourceIds1791428341218 implements ReversibleMigration {
	async up({ schemaBuilder, escape, runQuery, isPostgres }: MigrationContext) {
		for (const { table, owner, source, length } of identities) {
			const tableName = escape.tableName(table);
			const columnName = escape.columnName(source);
			// In-place changes preserve child rows when SQLite enforces cascade deletes.
			await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} varchar(${length})`);
			await schemaBuilder.createIndex(table, [owner, source]);
			if (isPostgres) {
				await runQuery(
					`COMMENT ON COLUMN ${tableName}.${columnName} IS 'Source ID recorded by package import'`,
				);
			}
		}
	}

	async down({ schemaBuilder, escape, runQuery }: MigrationContext) {
		for (const { table, owner, source } of identities) {
			await schemaBuilder.dropIndex(table, [owner, source]);
			await runQuery(
				`ALTER TABLE ${escape.tableName(table)} DROP COLUMN ${escape.columnName(source)}`,
			);
		}
	}
}
