import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Replaces BinaryDataService's opaque `binaryDataId` with a blob-storage
 * `storedAt` location. Existing knowledge-file rows are disposable (feature at
 * low rollout) and are deleted rather than migrated — the bytes they point at
 * are no longer readable through the new store.
 */
export class ReplaceAgentFileBinaryDataIdWithStoredAt1784900752603 implements ReversibleMigration {
	async up({
		escape,
		runQuery,
		tablePrefix,
		schemaBuilder: { dropIndex, dropColumns },
	}: MigrationContext) {
		const agentFiles = escape.tableName('agent_files');
		const binaryData = escape.tableName('binary_data');
		const sourceType = escape.columnName('sourceType');
		const storedAt = escape.columnName('storedAt');

		await runQuery(`DELETE FROM ${agentFiles}`);
		await runQuery(`DELETE FROM ${binaryData} WHERE ${sourceType} = 'agent_file'`);

		await dropIndex('agent_files', ['agentId', 'binaryDataId'], { skipIfMissing: true });
		await dropColumns('agent_files', ['binaryDataId'], { recreatesOnSqlite: true });

		await runQuery(
			`ALTER TABLE ${agentFiles} ADD COLUMN ${storedAt} VARCHAR(2) NOT NULL DEFAULT 'fs' ` +
				`CONSTRAINT "CHK_${tablePrefix}agent_files_storedAt" CHECK(${storedAt} IN ('fs', 's3', 'az'))`,
		);
	}

	async down({
		escape,
		runQuery,
		schemaBuilder: { addColumns, createIndex, column },
	}: MigrationContext) {
		const agentFiles = escape.tableName('agent_files');
		const storedAt = escape.columnName('storedAt');

		await runQuery(`DELETE FROM ${agentFiles}`);
		await runQuery(`ALTER TABLE ${agentFiles} DROP COLUMN ${storedAt}`);

		await addColumns(
			'agent_files',
			[
				column('binaryDataId').text.notNull.comment(
					'Opaque BinaryDataService reference (mode-prefixed); not an FK to binary_data',
				),
			],
			{ recreatesOnSqlite: true },
		);
		await createIndex('agent_files', ['agentId', 'binaryDataId'], true);
	}
}
