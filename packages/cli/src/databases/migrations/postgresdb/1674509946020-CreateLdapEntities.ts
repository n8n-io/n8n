import type { MigrationContext, ReversibleMigration } from '@db/types';
import { LDAP_DEFAULT_CONFIGURATION, LDAP_FEATURE_NAME } from '@/Ldap/constants';

export class CreateLdapEntities1674509946020 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}user" ADD COLUMN disabled BOOLEAN NOT NULL DEFAULT false;`,
		);

		await queryRunner.query(`
			INSERT INTO ${tablePrefix}settings (key, value, "loadOnStartup")
			VALUES ('${LDAP_FEATURE_NAME}', '${JSON.stringify(LDAP_DEFAULT_CONFIGURATION)}', true)
		`);

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS "${tablePrefix}auth_identity" (
				"userId" uuid REFERENCES "${tablePrefix}user" (id),
				"providerId" VARCHAR(64) NOT NULL,
				"providerType" VARCHAR(32) NOT NULL,
				"createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY("providerId", "providerType")
			);`,
		);

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS "${tablePrefix}auth_provider_sync_history" (
				"id" serial NOT NULL PRIMARY KEY,
				"providerType" VARCHAR(32) NOT NULL,
				"runMode" TEXT NOT NULL,
				"status" TEXT NOT NULL,
				"startedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"endedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"scanned" INTEGER NOT NULL,
				"created" INTEGER NOT NULL,
				"updated" INTEGER NOT NULL,
				"disabled" INTEGER NOT NULL,
				"error" TEXT
			);`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP TABLE "${tablePrefix}auth_provider_sync_history"`);
		await queryRunner.query(`DROP TABLE "${tablePrefix}auth_identity"`);

		await queryRunner.query(
			`DELETE FROM ${tablePrefix}settings WHERE key = '${LDAP_FEATURE_NAME}'`,
		);
		await queryRunner.query(`ALTER TABLE "${tablePrefix}user" DROP COLUMN disabled`);
	}
}
