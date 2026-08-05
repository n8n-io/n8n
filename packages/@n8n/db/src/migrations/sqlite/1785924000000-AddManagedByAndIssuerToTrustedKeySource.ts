import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'trusted_key_source';
const MANAGED_BY_COLUMN = 'managedBy';
const ISSUER_COLUMN = 'issuer';

type JwksSourceRow = { id: string; config: string };

export class AddManagedByAndIssuerToTrustedKeySource1785924000000 implements ReversibleMigration {
	// trusted_key has an inbound ON DELETE CASCADE FK to trusted_key_source, so
	// recreating the table on SQLite would fire that cascade and wipe keys.
	withFKsDisabled = true as const;

	async up({
		schemaBuilder: { addColumns, column, createIndex },
		escape,
		runQuery,
		runInBatches,
	}: MigrationContext) {
		await addColumns(
			TABLE,
			[
				column(MANAGED_BY_COLUMN).varchar(32).notNull.default("'env-config'"),
				column(ISSUER_COLUMN).varchar(255),
			],
			{ recreatesOnSqlite: true },
		);

		// Backfill `issuer` for existing jwks sources so the new unique index
		// applies retroactively — `issuer` is already a required field on the
		// jwks source config shape.
		const tableName = escape.tableName(TABLE);
		const configColumn = escape.columnName('config');
		const idColumn = escape.columnName('id');
		const typeColumn = escape.columnName('type');
		const issuerColumn = escape.columnName(ISSUER_COLUMN);

		const selectQuery = `SELECT ${idColumn} AS id, ${configColumn} AS config FROM ${tableName} WHERE ${typeColumn} = 'jwks'`;
		await runInBatches<JwksSourceRow>(selectQuery, async (rows) => {
			await Promise.all(
				rows.map(async ({ id, config }) => {
					let issuer: unknown;
					try {
						issuer = JSON.parse(config).issuer;
					} catch {
						return;
					}
					if (typeof issuer !== 'string' || issuer.length === 0) return;

					await runQuery(
						`UPDATE ${tableName} SET ${issuerColumn} = :issuer WHERE ${idColumn} = :id`,
						{ issuer, id },
					);
				}),
			);
		});

		await createIndex(TABLE, [ISSUER_COLUMN], true);
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		await dropIndex(TABLE, [ISSUER_COLUMN], { skipIfMissing: true });
		await dropColumns(TABLE, [MANAGED_BY_COLUMN, ISSUER_COLUMN], { recreatesOnSqlite: true });
	}
}
