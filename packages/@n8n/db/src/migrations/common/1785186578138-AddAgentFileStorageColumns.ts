import type { MigrationContext, ReversibleMigration } from '../migration-types';

/** BinaryDataService reference prefix paired with the location holding the bytes. */
const PREFIX_LOCATIONS = [
	['filesystem:', 'fs'],
	['filesystem-v2:', 'fs'],
	['s3:', 's3'],
	['azure:', 'az'],
	['database:', 'db'],
] as const;

/**
 * Adds the storage location (`storedAt`) and key (`storageKey`) that address a
 * knowledge file's bytes, backfilled from BinaryDataService's opaque
 * `binaryDataId`.
 *
 * `binaryDataId` stays, only relaxed to nullable, so the previous release keeps
 * resolving pre-existing rows during a rolling deploy and a rollback still has
 * the original references. A follow-up migration drops it once this release has
 * been observed in production.
 *
 * No bytes move: BinaryDataService wrote them through the same fs/s3/azure byte
 * stores the new agent knowledge file store uses, so stripping the prefix off
 * `binaryDataId` yields a key that resolves as-is. For `db` rows the key is the
 * `binary_data.fileId` holding the bytes.
 *
 * `fs` rows resolve only when `N8N_BINARY_DATA_STORAGE_PATH` was left unset:
 * the new store roots keys at `N8N_STORAGE_PATH` (`~/.n8n/storage`), which is
 * also BinaryDataService's fs root unless that deprecated var pointed it
 * elsewhere. Where the two diverge, the bytes stay where they are and the file
 * reads as missing.
 */
export class AddAgentFileStorageColumns1785186578138 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const {
			schemaBuilder: { addColumns, addNotNull, column, dropNotNull },
		} = ctx;

		await addColumns(
			'agent_files',
			[
				column('storedAt')
					.varchar(2)
					.notNull.default("'db'")
					.withEnumCheck(['db', 'fs', 's3', 'az'])
					.comment(
						"Where the file bytes live: 'db' (binary_data table), or a blob-storage backend ('fs', 's3', 'az')",
					),
				column('storageKey').text.comment(
					'Key addressing the bytes within storedAt: a binary_data.fileId for db, a byte-store key otherwise. Not a foreign key',
				),
			],
			{ recreatesOnSqlite: true },
		);

		await this.backfillFromBinaryDataIds(ctx);

		await addNotNull('agent_files', 'storageKey', { recreatesOnSqlite: true });
		// New rows leave `binaryDataId` null; the previous release still needs the
		// column to exist to read the rows it wrote.
		await dropNotNull('agent_files', 'binaryDataId', { recreatesOnSqlite: true });
	}

	async down(ctx: MigrationContext) {
		const {
			schemaBuilder: { addNotNull, dropColumns, dropEnumCheck },
		} = ctx;

		await this.restoreMissingBinaryDataIds(ctx);
		await addNotNull('agent_files', 'binaryDataId', { recreatesOnSqlite: true });

		// Must precede the column drop: SQLite carries the CHECK over to the
		// rebuilt table, where it would reference a column that no longer exists.
		await dropEnumCheck('agent_files', 'storedAt', { recreatesOnSqlite: true });
		await dropColumns('agent_files', ['storedAt', 'storageKey'], { recreatesOnSqlite: true });
	}

	/** Splits each `binaryDataId` into the location and key that address its bytes. */
	private async backfillFromBinaryDataIds({ escape, runQuery }: MigrationContext) {
		const agentFiles = escape.tableName('agent_files');
		const binaryDataId = escape.columnName('binaryDataId');
		const storedAt = escape.columnName('storedAt');
		const storageKey = escape.columnName('storageKey');

		for (const [prefix, location] of PREFIX_LOCATIONS) {
			// The offset is derived from the prefix, not from row data.
			await runQuery(
				`UPDATE ${agentFiles} SET ${storedAt} = :location, ${storageKey} = SUBSTR(${binaryDataId}, ${prefix.length + 1}) WHERE ${binaryDataId} LIKE :pattern`,
				{ location, pattern: `${prefix}%` },
			);
		}

		// Every reference BinaryDataService wrote carries one of the prefixes
		// above. Keep an unrecognized one whole so the row survives the NOT NULL
		// below, parked on 'fs' where a key that addresses nothing simply reads as
		// missing — 'db' would instead point at a binary_data.fileId that is not
		// one. The original reference stays in binaryDataId either way.
		await runQuery(
			`UPDATE ${agentFiles} SET ${storedAt} = 'fs', ${storageKey} = ${binaryDataId} WHERE ${storageKey} IS NULL`,
		);
	}

	/**
	 * Rebuilds the prefixed reference for rows written after `up()`. Rows that
	 * predate it kept theirs, so their opaque ids round-trip untouched.
	 */
	private async restoreMissingBinaryDataIds({ escape, runQuery }: MigrationContext) {
		const agentFiles = escape.tableName('agent_files');
		const binaryDataId = escape.columnName('binaryDataId');
		const storedAt = escape.columnName('storedAt');
		const storageKey = escape.columnName('storageKey');

		// `filesystem` rows come back as `filesystem-v2`; both resolve to the same
		// BinaryDataService manager, so the reconstructed id stays readable.
		await runQuery(
			`UPDATE ${agentFiles} SET ${binaryDataId} = CASE ${storedAt} ` +
				"WHEN 'db' THEN 'database:' WHEN 'fs' THEN 'filesystem-v2:' " +
				"WHEN 's3' THEN 's3:' WHEN 'az' THEN 'azure:' END " +
				`|| ${storageKey} WHERE ${binaryDataId} IS NULL`,
		);
	}
}
