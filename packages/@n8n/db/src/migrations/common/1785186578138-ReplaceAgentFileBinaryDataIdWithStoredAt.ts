import type { MigrationContext, ReversibleMigration } from '../migration-types';

type AgentFileRow = { id: string; binaryDataId: string };

/** BinaryDataService mode prefix -> storage location. */
const LOCATION_BY_MODE: Record<string, string> = {
	filesystem: 'fs',
	'filesystem-v2': 'fs',
	s3: 's3',
	azure: 'az',
	database: 'db',
};

/**
 * Replaces BinaryDataService's opaque `binaryDataId` with the storage location
 * (`storedAt`) plus the key (`storageKey`) that addresses the bytes.
 *
 * No bytes move: BinaryDataService wrote them through the same fs/s3/azure byte
 * stores the new agent knowledge file store uses, so stripping the mode prefix
 * off `binaryDataId` yields a key that resolves as-is. For `db` rows the key is
 * the `binary_data.fileId` holding the bytes.
 */
export class ReplaceAgentFileBinaryDataIdWithStoredAt1785186578138 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const {
			escape,
			runQuery,
			tablePrefix,
			schemaBuilder: { addNotNull, createIndex, dropIndex, dropColumns },
		} = ctx;
		const agentFiles = escape.tableName('agent_files');
		const storedAt = escape.columnName('storedAt');
		const storageKey = escape.columnName('storageKey');

		await runQuery(
			`ALTER TABLE ${agentFiles} ADD COLUMN ${storedAt} VARCHAR(2) NOT NULL DEFAULT 'db' ` +
				`CONSTRAINT "CHK_${tablePrefix}agent_files_storedAt" CHECK(${storedAt} IN ('db', 'fs', 's3', 'az'))`,
		);
		await runQuery(`ALTER TABLE ${agentFiles} ADD COLUMN ${storageKey} TEXT`);

		await this.convertBinaryDataIds(ctx);

		await addNotNull('agent_files', 'storageKey', { recreatesOnSqlite: true });

		await dropIndex('agent_files', ['agentId', 'binaryDataId'], { skipIfMissing: true });
		await dropColumns('agent_files', ['binaryDataId'], { recreatesOnSqlite: true });
		await createIndex('agent_files', ['agentId', 'storageKey'], true);
	}

	async down({
		escape,
		runQuery,
		schemaBuilder: { addNotNull, createIndex, dropIndex, dropColumns, dropEnumCheck },
	}: MigrationContext) {
		const agentFiles = escape.tableName('agent_files');
		const storedAt = escape.columnName('storedAt');
		const storageKey = escape.columnName('storageKey');
		const binaryDataId = escape.columnName('binaryDataId');

		await runQuery(`ALTER TABLE ${agentFiles} ADD COLUMN ${binaryDataId} TEXT`);

		// `filesystem` rows come back as `filesystem-v2`; both resolve to the same
		// BinaryDataService manager, so the reconstructed id stays readable.
		await runQuery(
			`UPDATE ${agentFiles} SET ${binaryDataId} = CASE ${storedAt} ` +
				"WHEN 'db' THEN 'database:' WHEN 'fs' THEN 'filesystem-v2:' " +
				"WHEN 's3' THEN 's3:' WHEN 'az' THEN 'azure:' END " +
				`|| ${storageKey}`,
		);

		await addNotNull('agent_files', 'binaryDataId', { recreatesOnSqlite: true });

		await dropIndex('agent_files', ['agentId', 'storageKey'], { skipIfMissing: true });
		// Must precede the column drop: SQLite carries the CHECK over to the
		// rebuilt table, where it would reference a column that no longer exists.
		await dropEnumCheck('agent_files', 'storedAt', { recreatesOnSqlite: true });
		await dropColumns('agent_files', ['storedAt', 'storageKey'], { recreatesOnSqlite: true });
		await createIndex('agent_files', ['agentId', 'binaryDataId'], true);
	}

	/** Splits each `binaryDataId` into its location and key. */
	private async convertBinaryDataIds({ escape, runQuery, runInBatches }: MigrationContext) {
		const agentFiles = escape.tableName('agent_files');
		const id = escape.columnName('id');
		const binaryDataId = escape.columnName('binaryDataId');
		const storedAt = escape.columnName('storedAt');
		const storageKey = escape.columnName('storageKey');

		await runInBatches<AgentFileRow>(
			// Ordered so the OFFSET window stays stable across batches.
			`SELECT ${id}, ${binaryDataId} FROM ${agentFiles} ORDER BY ${id}`,
			async (rows) => {
				for (const row of rows) {
					const separatorIndex = row.binaryDataId.indexOf(':');
					const location =
						separatorIndex === -1
							? undefined
							: LOCATION_BY_MODE[row.binaryDataId.slice(0, separatorIndex)];

					await runQuery(
						`UPDATE ${agentFiles} SET ${storedAt} = :storedAt, ${storageKey} = :storageKey WHERE ${id} = :id`,
						{
							// Every reference BinaryDataService wrote carries a known mode
							// prefix. Keep an unrecognized one whole so the row survives
							// instead of tripping the NOT NULL below; it reads as missing.
							storedAt: location ?? 'db',
							storageKey: location ? row.binaryDataId.slice(separatorIndex + 1) : row.binaryDataId,
							id: row.id,
						},
					);
				}
			},
		);
	}
}
