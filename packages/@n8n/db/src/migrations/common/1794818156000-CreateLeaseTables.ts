import type { MigrationContext, ReversibleMigration } from '../migration-types';

/** No unique index or foreign key may cover `lease.leaseSessionId`, `lease.fencingToken` or `lease.revoked`, so their updates stay no-key updates. */
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
			"tokenCounter" ${bigint} NOT NULL DEFAULT 0 CONSTRAINT "CHK_${tablePrefix}lease_kind_tokenCounter" CHECK ("tokenCounter" >= 0),
			"syncHolder" VARCHAR(36) NULL,
			"syncExpiresAt" ${ts} NULL,
			"fullPassAt" ${ts} NULL,
			"createdAt" ${ts} NOT NULL DEFAULT ${nowDefault},
			"updatedAt" ${ts} NOT NULL DEFAULT ${nowDefault}
		)`);

		await runQuery(`CREATE TABLE ${session} (
			"id" VARCHAR(36) NOT NULL PRIMARY KEY,
			"kind" VARCHAR(24) NOT NULL,
			"hostId" VARCHAR(255) NOT NULL,
			"bootId" VARCHAR(36) NOT NULL,
			"leaseSeconds" INTEGER NOT NULL,
			"expiresAt" ${ts} NOT NULL,
			"createdAt" ${ts} NOT NULL DEFAULT ${nowDefault}
		)`);
		await runQuery(
			`CREATE INDEX ${escape.indexName('lease_session_kind_expiresAt')} ON ${session} ("kind", "expiresAt")`,
		);

		await runQuery(`CREATE TABLE ${lease} (
			"kind" VARCHAR(24) NOT NULL,
			"key" VARCHAR(255) NOT NULL,
			"data" TEXT NOT NULL,
			"dataHash" VARCHAR(64) NOT NULL,
			"group" VARCHAR(255) NULL,
			"leaseSessionId" VARCHAR(36) NULL,
			"fencingToken" ${bigint} NOT NULL DEFAULT 0 CONSTRAINT "CHK_${tablePrefix}lease_fencingToken" CHECK ("fencingToken" >= 0),
			"claimedAt" ${ts} NULL,
			"readyAt" ${ts} NULL,
			"revoked" BOOLEAN NOT NULL DEFAULT ${falseValue},
			"revokedAt" ${ts} NULL,
			"startAttempts" INTEGER NOT NULL DEFAULT 0 CONSTRAINT "CHK_${tablePrefix}lease_startAttempts" CHECK ("startAttempts" >= 0),
			"nextAttemptAt" ${ts} NULL,
			"lastError" TEXT NULL,
			"lastErrorAt" ${ts} NULL,
			"createdAt" ${ts} NOT NULL DEFAULT ${nowDefault},
			"updatedAt" ${ts} NOT NULL DEFAULT ${nowDefault},
			PRIMARY KEY ("kind", "key")
		)`);
		await runQuery(
			`CREATE INDEX ${escape.indexName('lease_kind_leaseSessionId')} ON ${lease} ("kind", "leaseSessionId")`,
		);
		await runQuery(
			`CREATE INDEX ${escape.indexName('lease_kind_group')} ON ${lease} ("kind", "group")`,
		);

		if (isPostgres) {
			await runQuery(`ALTER TABLE ${lease} SET (fillfactor = 90)`);
		}
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('lease');
		await dropTable('lease_session');
		await dropTable('lease_kind');
	}
}
