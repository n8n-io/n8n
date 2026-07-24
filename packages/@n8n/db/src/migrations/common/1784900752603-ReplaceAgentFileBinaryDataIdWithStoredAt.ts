import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Replaces BinaryDataService's opaque `binaryDataId` with a blob-storage
 * `storedAt` location. Existing knowledge-file rows are disposable (feature at
 * low rollout) and are deleted rather than migrated — the bytes they point at
 * are no longer readable through the new store. Also drops `'agent_file'` from
 * the `binary_data.sourceType` CHECK, since knowledge files no longer use
 * BinaryDataService.
 * Irreversible: rolling back would delete knowledge files written after the
 * upgrade and orphan their blob-storage bytes.
 */
export class ReplaceAgentFileBinaryDataIdWithStoredAt1784900752603
	implements IrreversibleMigration
{
	async up({
		escape,
		runQuery,
		tablePrefix,
		schemaBuilder: { dropIndex, dropColumns, dropEnumCheck, addEnumCheck },
	}: MigrationContext) {
		const agentFiles = escape.tableName('agent_files');
		const binaryData = escape.tableName('binary_data');
		const sourceType = escape.columnName('sourceType');
		const storedAt = escape.columnName('storedAt');

		await runQuery(`DELETE FROM ${agentFiles}`);
		await runQuery(`DELETE FROM ${binaryData} WHERE ${sourceType} = 'agent_file'`);

		await dropEnumCheck('binary_data', 'sourceType', { recreatesOnSqlite: true });
		await addEnumCheck('binary_data', 'sourceType', ['execution', 'chat_message_attachment'], {
			recreatesOnSqlite: true,
		});

		await dropIndex('agent_files', ['agentId', 'binaryDataId'], { skipIfMissing: true });
		await dropColumns('agent_files', ['binaryDataId'], { recreatesOnSqlite: true });

		await runQuery(
			`ALTER TABLE ${agentFiles} ADD COLUMN ${storedAt} VARCHAR(2) NOT NULL DEFAULT 'fs' ` +
				`CONSTRAINT "CHK_${tablePrefix}agent_files_storedAt" CHECK(${storedAt} IN ('fs', 's3', 'az'))`,
		);
	}
}
