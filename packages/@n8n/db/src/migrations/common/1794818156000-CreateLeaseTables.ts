import type { MigrationContext, ReversibleMigration } from '../migration-types';

/** No unique index or foreign key may cover `lease.leaseSessionId`, `lease.fencingToken` or `lease.revoked`: updates to them then do not conflict with the `FOR KEY SHARE` lock of a fence check. */
export class CreateLeaseTables1794818156000 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, createIndex, column },
		escape,
		isPostgres,
		runQuery,
		tablePrefix,
	}: MigrationContext) {
		const fencingTokenCounter = escape.columnName('fencingTokenCounter');
		const fencingToken = escape.columnName('fencingToken');

		await createTable('lease_kind')
			.withColumns(
				column('kind').varchar(24).primary,
				column('fencingTokenCounter').bigint.notNull.default(0),
				column('syncLockRoundId').uuid,
				column('syncLockExpiresAt').timestampTimezone(),
				column('lastFullSyncAt').timestampTimezone(),
			)
			.withTimestamps.withCheck(
				`CHK_${tablePrefix}lease_kind_fencingTokenCounter`,
				`${fencingTokenCounter} >= 0`,
			);

		await createTable('lease_session')
			.withColumns(
				column('id').uuid.primary,
				column('leaseKind').varchar(24).notNull,
				column('hostId').varchar(255).notNull,
				column('bootId').uuid.notNull,
				column('leaseDurationSeconds').int.notNull,
				column('expiresAt').timestampTimezone().notNull,
			)
			.withCreatedAt.withForeignKey('leaseKind', {
				tableName: 'lease_kind',
				columnName: 'kind',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}lease_session_leaseKind`,
			});
		await createIndex('lease_session', ['leaseKind', 'expiresAt']);

		await createTable('lease')
			.withColumns(
				column('leaseKind').varchar(24).primary,
				column('key').varchar(255).primary,
				column('data').text.notNull,
				column('dataHash').varchar(64).notNull,
				column('leaseSessionId').uuid,
				column('fencingToken').bigint.notNull.default(0),
				column('claimedAt').timestampTimezone(),
				column('readyAt').timestampTimezone(),
				column('revoked').bool.notNull.default(false),
				column('revokedAt').timestampTimezone(),
			)
			.withTimestamps.withCheck(`CHK_${tablePrefix}lease_fencingToken`, `${fencingToken} >= 0`)
			.withForeignKey('leaseKind', {
				tableName: 'lease_kind',
				columnName: 'kind',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}lease_leaseKind`,
			});
		await createIndex('lease', ['leaseKind', 'leaseSessionId']);

		if (isPostgres) {
			// Free space in each page lets an update that changes no indexed column stay on the same page and skip index writes.
			await runQuery(`ALTER TABLE ${escape.tableName('lease')} SET (fillfactor = 90)`);
		}
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('lease');
		await dropTable('lease_session');
		await dropTable('lease_kind');
	}
}
