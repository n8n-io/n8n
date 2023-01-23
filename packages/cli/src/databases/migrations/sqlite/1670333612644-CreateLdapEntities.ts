import { MigrationInterface, QueryRunner } from 'typeorm';
import { LDAP_DEFAULT_CONFIGURATION, LDAP_FEATURE_NAME } from '@/Ldap/constants';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
export class CreateLdapEntities1670333612644 implements MigrationInterface {
	name = 'CreateLdapEntities1670333612644';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = getTablePrefix();

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}user ADD COLUMN disabled BOOLEAN NOT NULL DEFAULT false;`,
		);

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS "${tablePrefix}auth_identity" (
				"userId" VARCHAR(36) REFERENCES ${tablePrefix}user (id),
				"providerId" VARCHAR(60) NOT NULL,
				"providerType" VARCHAR(20) NOT NULL,
				"createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY("providerId", "providerType")
			);`,
		);

		await queryRunner.query(`
			INSERT INTO "${tablePrefix}settings" (key, value, loadOnStartup)
			VALUES ('${LDAP_FEATURE_NAME}', '${JSON.stringify(LDAP_DEFAULT_CONFIGURATION)}', true)
		`);

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS "${tablePrefix}ldap_sync_history" (
				"id" INTEGER PRIMARY KEY AUTOINCREMENT,
				"startedAt" DATETIME NOT NULL,
				"endedAt" DATETIME NOT NULL,
				"created" INTEGER NOT NULL,
				"updated" INTEGER NOT NULL,
				"disabled" INTEGER NOT NULL,
				"scanned" INTEGER NOT NULL,
				"status" TEXT NOT NULL,
				"runMode" TEXT NOT NULL,
				"error" TEXT
			);`,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(`DROP TABLE ${tablePrefix}ldap_sync_history`);
		await queryRunner.query(`DROP TABLE ${tablePrefix}auth_identity`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}user DROP COLUMN disabled`);
	}
}
