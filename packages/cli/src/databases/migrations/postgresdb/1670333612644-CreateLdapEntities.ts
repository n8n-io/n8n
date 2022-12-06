import { MigrationInterface, QueryRunner } from 'typeorm';
import { LDAP_DEFAULT_CONFIGURATION } from '@/Ldap/constants';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';

export class CreateLdapEntities1670333612644 implements MigrationInterface {
	name = 'CreateLdapEntities1670333612644';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}user
			ADD COLUMN "ldapId" VARCHAR(60) DEFAULT NULL UNIQUE,
			ADD COLUMN "signInType" VARCHAR(20) DEFAULT 'email',
			ADD COLUMN "disabled" BOOLEAN NOT NULL DEFAULT false;`,
		);

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS ${tablePrefix}feature_config (
				"name" TEXT PRIMARY KEY,
				"data" json NOT NULL DEFAULT '{}'::json
			);`,
		);

		await queryRunner.query(`
				INSERT INTO ${tablePrefix}feature_config (name, data) VALUES (
					'ldap',
					'${JSON.stringify(LDAP_DEFAULT_CONFIGURATION)}'
				)
		`);

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS ${tablePrefix}ldap_sync_history (
				"id" serial NOT NULL PRIMARY KEY,
				"startedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"endedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
		await queryRunner.query(`DROP TABLE ${tablePrefix}feature_config`);

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}user\`
			DROP COLUMN \`ldapId\`,
			DROP COLUMN \`signInType\`,
			DROP COLUMN \`disabled\`;`,
		);
	}
}
