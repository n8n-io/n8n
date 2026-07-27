import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Replaces BinaryDataService's opaque `binaryDataId` with a blob-storage
 * `storedAt` location. Existing rows are kept and default to `fs`; the bytes
 * they used to point at are not reachable through the new store, so those
 * files read as missing until re-uploaded.
 */
export class ReplaceAgentFileBinaryDataIdWithStoredAt1784900752603 implements ReversibleMigration {
	async up({
		escape,
		runQuery,
		tablePrefix,
		schemaBuilder: { dropIndex, dropColumns },
	}: MigrationContext) {
		const agentFiles = escape.tableName('agent_files');
		const storedAt = escape.columnName('storedAt');

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
		schemaBuilder: { addColumns, column, createIndex },
	}: MigrationContext) {
		const agentFiles = escape.tableName('agent_files');
		const storedAt = escape.columnName('storedAt');

		await runQuery(`ALTER TABLE ${agentFiles} DROP COLUMN ${storedAt}`);

		// Nullable unlike the original column: `up()` dropped the opaque references
		// and they cannot be reconstructed, while a shared placeholder value would
		// collide on the unique index recreated below.
		await addColumns(
			'agent_files',
			[
				column('binaryDataId').text.comment(
					'Opaque BinaryDataService reference (mode-prefixed); not an FK to binary_data',
				),
			],
			{ recreatesOnSqlite: true },
		);
		await createIndex('agent_files', ['agentId', 'binaryDataId'], true);
	}
}
