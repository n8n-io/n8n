import type { MigrationContext, ReversibleMigration } from '../migration-types';

type AgentFileRow = { id: string; agentId: string; binaryDataId: string };

/** BinaryDataService mode prefix -> blob-storage location. */
const LOCATION_BY_MODE: Record<string, string> = {
	filesystem: 'fs',
	'filesystem-v2': 'fs',
	s3: 's3',
	azure: 'az',
};

/**
 * Replaces BinaryDataService's opaque `binaryDataId` with the blob-storage
 * location (`storedAt`) plus the byte-store key (`storageKey`) that addresses
 * the bytes.
 *
 * No bytes move: BinaryDataService wrote them through the same fs/s3/azure byte
 * stores the new agent knowledge file store uses, so stripping the mode prefix
 * off `binaryDataId` yields a key that resolves as-is.
 *
 * Rows stored in `database` mode have no byte-store equivalent and are dropped
 * along with their `binary_data` bytes.
 */
export class ReplaceAgentFileBinaryDataIdWithStoredAt1784900752603 implements ReversibleMigration {
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
			`ALTER TABLE ${agentFiles} ADD COLUMN ${storedAt} VARCHAR(2) NOT NULL DEFAULT 'fs' ` +
				`CONSTRAINT "CHK_${tablePrefix}agent_files_storedAt" CHECK(${storedAt} IN ('fs', 's3', 'az'))`,
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
				"WHEN 'fs' THEN 'filesystem-v2:' WHEN 's3' THEN 's3:' WHEN 'az' THEN 'azure:' END " +
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

	/**
	 * Splits each `binaryDataId` into its location and key. Rows whose mode has no
	 * byte-store equivalent (`database`, `default`) are deleted, bytes included.
	 */
	private async convertBinaryDataIds({
		escape,
		runQuery,
		runInBatches,
		logger,
		migrationName,
	}: MigrationContext) {
		const agentFiles = escape.tableName('agent_files');
		const binaryData = escape.tableName('binary_data');
		const id = escape.columnName('id');
		const agentId = escape.columnName('agentId');
		const binaryDataId = escape.columnName('binaryDataId');
		const storedAt = escape.columnName('storedAt');
		const storageKey = escape.columnName('storageKey');
		const sourceType = escape.columnName('sourceType');
		const sourceId = escape.columnName('sourceId');
		const unconvertible: AgentFileRow[] = [];

		await runInBatches<AgentFileRow>(
			// Ordered so the OFFSET window stays stable across batches.
			`SELECT ${id}, ${agentId}, ${binaryDataId} FROM ${agentFiles} ORDER BY ${id}`,
			async (rows) => {
				for (const row of rows) {
					const separatorIndex = row.binaryDataId?.indexOf(':') ?? -1;
					const location =
						separatorIndex === -1
							? undefined
							: LOCATION_BY_MODE[row.binaryDataId.slice(0, separatorIndex)];

					if (!location) {
						unconvertible.push(row);
						continue;
					}

					await runQuery(
						`UPDATE ${agentFiles} SET ${storedAt} = :storedAt, ${storageKey} = :storageKey WHERE ${id} = :id`,
						{
							storedAt: location,
							storageKey: row.binaryDataId.slice(separatorIndex + 1),
							id: row.id,
						},
					);
				}
			},
		);

		if (unconvertible.length === 0) return;

		logger.warn(
			`[${migrationName}] Deleting ${unconvertible.length} agent knowledge file(s) stored in the database, which has no blob-storage equivalent`,
			{ agentIds: [...new Set(unconvertible.map((row) => row.agentId))] },
		);

		for (const row of unconvertible) {
			await runQuery(`DELETE FROM ${agentFiles} WHERE ${id} = :id`, { id: row.id });
			await runQuery(
				`DELETE FROM ${binaryData} WHERE ${sourceType} = 'agent_file' AND ${sourceId} = :id`,
				{ id: row.id },
			);
		}
	}
}
