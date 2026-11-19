import type { MigrationContext, ReversibleMigration } from '../migration-types';

/** No unique index or foreign key may cover `lease.leaseSessionId`, `lease.fencingToken` or `lease.revokedAt`: updates to them then do not conflict with the `FOR KEY SHARE` lock of a fence check. */
export class CreateLeaseTables1794906454000 implements ReversibleMigration {
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
				column('kind').varchar(24).primary.comment('The name of the lease kind'),
				column('fencingTokenCounter')
					.bigint.notNull.default(0)
					.comment(
						'The source of fencing tokens, never reset so that a recreated key gets a higher token',
					),
				column('syncLockRoundId').uuid.comment(
					'The sync round that holds the sync lock, or null when the lock is free',
				),
				column('syncLockExpiresAt')
					.timestampTimezone()
					.comment('The time at which the sync lock expires'),
				column('lastFullSyncAt')
					.timestampTimezone()
					.comment('The time at which a process last claimed the periodic full sync'),
			)
			.withTimestamps.withCheck(
				`CHK_${tablePrefix}lease_kind_fencingTokenCounter`,
				`${fencingTokenCounter} >= 0`,
			);

		await createTable('lease_session')
			.withColumns(
				column('id').uuid.primary.comment(
					'The session ID, new for each session, also after a process loses a session',
				),
				column('leaseKind').varchar(24).notNull,
				column('hostId')
					.varchar(255)
					.notNull.comment('The hostId of the n8n instance that opened the session'),
				column('bootId').uuid.notNull.comment('A random ID made when the process starts'),
				column('leaseDurationSeconds').int.notNull.comment(
					'The lease length of the session, in seconds',
				),
				column('expiresAt')
					.timestampTimezone()
					.notNull.comment(
						'The database time until which the session and all its leases are valid',
					),
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
				column('key').varchar(255).primary.comment('The key of the lease in its kind'),
				column('data').json.notNull.comment('The data that the holder needs, as canonical JSON'),
				column('dataHash')
					.varchar(64)
					.notNull.comment('The SHA-256 of data, which sync compares to find changed leases'),
				column('leaseSessionId').uuid.comment(
					'The holder session, or null when the lease is free, with no foreign key or unique index so that updates stay no-key updates',
				),
				column('fencingToken')
					.bigint.notNull.default(0)
					.comment('The fencing token of the current or last holder'),
				column('claimedAt')
					.timestampTimezone()
					.comment('The time at which the holder claimed the lease'),
				column('readyAt')
					.timestampTimezone()
					.comment('The time at which the holder reported the lease as ready'),
				column('revokedAt')
					.timestampTimezone()
					.comment(
						'The time at which sync revoked the lease because it changed or went, or null when not revoked; the hand-over deadline counts from it',
					),
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
			await runQuery(`ALTER TABLE ${escape.tableName('lease')} SET (fillfactor = 90)`);
		}
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('lease');
		await dropTable('lease_session');
		await dropTable('lease_kind');
	}
}
