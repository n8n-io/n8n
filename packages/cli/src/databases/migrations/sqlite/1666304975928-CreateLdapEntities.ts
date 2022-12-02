import { MigrationInterface, QueryRunner } from 'typeorm';
import { LDAP_DEFAULT_CONFIGURATION } from '@/Ldap/constants';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
export class CreateLdapEntities1666304975928 implements MigrationInterface {
	name = 'CreateLdapEntities1666304975928';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = getTablePrefix();

		await queryRunner.query('PRAGMA foreign_keys=OFF');

		await queryRunner.query(
			`CREATE TABLE "temporary_user" (
				"id" VARCHAR PRIMARY KEY NOT NULL,
				"email" VARCHAR(255) UNIQUE,
				"firstName" VARCHAR(32),
				"lastName" VARCHAR(32),
				"password" VARCHAR,
				"resetPasswordToken" VARCHAR,
				"resetPasswordTokenExpiration" INTEGER DEFAULT NULL,
				"ldapId" VARCHAR(60) UNIQUE DEFAULT NULL,
				"signInType" VARCHAR(20) DEFAULT email,
				"personalizationAnswers" TEXT,
				"createdAt" DATETIME(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
				"updatedAt" DATETIME(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
				"globalRoleId" INTEGER NOT NULL,
				"settings" TEXT,
				"apiKey" VARCHAR DEFAULT NULL,
				"disabled" boolean DEFAULT false,
				FOREIGN KEY ("globalRoleId") REFERENCES "${tablePrefix}role" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`,
		);

		await queryRunner.query(
			`INSERT INTO "temporary_user"(
				"id",
				"email",
				"firstName",
				"lastName",
				"password",
				"resetPasswordToken",
				"resetPasswordTokenExpiration",
				"personalizationAnswers",
				"createdAt",
				"updatedAt",
				"globalRoleId",
				"settings",
				"apiKey"
				) SELECT
				"id",
				"email",
				"firstName",
				"lastName",
				"password",
				"resetPasswordToken",
				"resetPasswordTokenExpiration",
				"personalizationAnswers",
				"createdAt",
				"updatedAt",
				"globalRoleId",
				"settings",
				"apiKey"
				FROM "${tablePrefix}user"`,
		);

		await queryRunner.query(`DROP TABLE "${tablePrefix}user"`);

		await queryRunner.query(`ALTER TABLE "temporary_user" RENAME TO "${tablePrefix}user"`);

		await queryRunner.query('PRAGMA foreign_keys=ON');

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS "${tablePrefix}feature_config" (
				"name" VARCHAR(30) PRIMARY KEY,
				"data" TEXT NOT NULL DEFAULT '{}'
			);`,
		);

		await queryRunner.query(`
				INSERT INTO "${tablePrefix}feature_config" (name, data) VALUES (
					'ldap',
					'${JSON.stringify(LDAP_DEFAULT_CONFIGURATION)}'
				)
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
		await queryRunner.query(`DROP TABLE ${tablePrefix}feature_config`);

		await queryRunner.query('PRAGMA foreign_keys=OFF');

		await queryRunner.query(
			`CREATE TABLE "temporary_user" (
				"id" VARCHAR PRIMARY KEY NOT NULL,
				"email" VARCHAR(255) UNIQUE,
				"firstName" VARCHAR(32),
				"lastName" VARCHAR(32),
				"password" VARCHAR,
				"resetPasswordToken" VARCHAR,
				"resetPasswordTokenExpiration" INTEGER DEFAULT NULL,
				"personalizationAnswers" TEXT,
				"createdAt" DATETIME(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
				"updatedAt" DATETIME(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
				"globalRoleId" INTEGER NOT NULL,
				"settings" TEXT,
				"apiKey" VARCHAR DEFAULT NULL,
				FOREIGN KEY ("globalRoleId") REFERENCES "${tablePrefix}role" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`,
		);

		await queryRunner.query(
			`INSERT INTO "temporary_user"(
				"id",
				"email",
				"firstName",
				"lastName",
				"password",
				"resetPasswordToken",
				"resetPasswordTokenExpiration",
				"personalizationAnswers",
				"createdAt",
				"updatedAt",
				"globalRoleId",
				"settings",
				"apiKey"
				) SELECT
				"id",
				"email",
				"firstName",
				"lastName",
				"password",
				"resetPasswordToken",
				"resetPasswordTokenExpiration",
				"personalizationAnswers",
				"createdAt",
				"updatedAt",
				"globalRoleId",
				"settings",
				"apiKey"
				FROM "${tablePrefix}user"`,
		);

		await queryRunner.query(`DROP TABLE "${tablePrefix}user"`);

		await queryRunner.query(`ALTER TABLE "temporary_user" RENAME TO "${tablePrefix}user"`);

		await queryRunner.query('PRAGMA foreign_keys=ON');
	}
}
