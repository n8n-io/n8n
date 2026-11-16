import type { MigrationContext, ReversibleMigration } from '../migration-types';

/** No unique index or foreign key may cover `lease.leaseSessionId`, `lease.fencingToken` or `lease.revoked`: updates to them then do not conflict with the `FOR KEY SHARE` lock of a fence check. */
export class CreateLeaseTables1794818156000 implements ReversibleMigration {
	async up({ escape, isPostgres, runQuery, tablePrefix }: MigrationContext) {
		const kind = escape.tableName('lease_kind');
		const session = escape.tableName('lease_session');
		const lease = escape.tableName('lease');
		const ts = isPostgres ? 'TIMESTAMPTZ(3)' : 'DATETIME';
		const nowDefault = isPostgres
			? 'CURRENT_TIMESTAMP(3)'
			: "(STRFTIME('%Y-%m-%d %H:%M:%f','NOW'))";
		const bigint = isPostgres ? 'BIGINT' : 'INTEGER';
		const falseValue = isPostgres ? 'false' : '0';

		await runQuery(`CREATE TABLE ${kind} (
			"kind" VARCHAR(24) NOT NULL PRIMARY KEY,
			"fencingTokenCounter" ${bigint} NOT NULL DEFAULT 0 CONSTRAINT "CHK_${tablePrefix}lease_kind_fencingTokenCounter" CHECK ("fencingTokenCounter" >= 0),
			"syncLockRoundId" VARCHAR(36) NULL,
			"syncLockExpiresAt" ${ts} NULL,
			"lastFullSyncAt" ${ts} NULL,
			"createdAt" ${ts} NOT NULL DEFAULT ${nowDefault},
			"updatedAt" ${ts} NOT NULL DEFAULT ${nowDefault}
		)`);

		await runQuery(`CREATE TABLE ${session} (
			"id" VARCHAR(36) NOT NULL PRIMARY KEY,
			"leaseKind" VARCHAR(24) NOT NULL,
			"hostId" VARCHAR(255) NOT NULL,
			"bootId" VARCHAR(36) NOT NULL,
			"leaseDurationSeconds" INTEGER NOT NULL,
			"expiresAt" ${ts} NOT NULL,
			"createdAt" ${ts} NOT NULL DEFAULT ${nowDefault},
			CONSTRAINT "FK_${tablePrefix}lease_session_leaseKind" FOREIGN KEY ("leaseKind") REFERENCES ${kind} ("kind") ON DELETE CASCADE
		)`);
		await runQuery(
			`CREATE INDEX ${escape.indexName('lease_session_leaseKind_expiresAt')} ON ${session} ("leaseKind", "expiresAt")`,
		);

		await runQuery(`CREATE TABLE ${lease} (
			"leaseKind" VARCHAR(24) NOT NULL,
			"key" VARCHAR(255) NOT NULL,
			"data" TEXT NOT NULL,
			"dataHash" VARCHAR(64) NOT NULL,
			"leaseSessionId" VARCHAR(36) NULL,
			"fencingToken" ${bigint} NOT NULL DEFAULT 0 CONSTRAINT "CHK_${tablePrefix}lease_fencingToken" CHECK ("fencingToken" >= 0),
			"claimedAt" ${ts} NULL,
			"readyAt" ${ts} NULL,
			"revoked" BOOLEAN NOT NULL DEFAULT ${falseValue},
			"revokedAt" ${ts} NULL,
			"createdAt" ${ts} NOT NULL DEFAULT ${nowDefault},
			"updatedAt" ${ts} NOT NULL DEFAULT ${nowDefault},
			PRIMARY KEY ("leaseKind", "key"),
			CONSTRAINT "FK_${tablePrefix}lease_leaseKind" FOREIGN KEY ("leaseKind") REFERENCES ${kind} ("kind") ON DELETE CASCADE
		)`);
		await runQuery(
			`CREATE INDEX ${escape.indexName('lease_leaseKind_leaseSessionId')} ON ${lease} ("leaseKind", "leaseSessionId")`,
		);

		if (isPostgres) {
			// Free space in each page lets an update that changes no indexed column stay on the same page and skip index writes.
			await runQuery(`ALTER TABLE ${lease} SET (fillfactor = 90)`);
		}
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('lease');
		await dropTable('lease_session');
		await dropTable('lease_kind');
	}
}
