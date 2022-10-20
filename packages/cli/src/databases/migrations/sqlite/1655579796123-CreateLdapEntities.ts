import { MigrationInterface, QueryRunner } from 'typeorm';
import * as config from '../../../../config';
import { LDAP_DEFAULT_CONFIGURATION } from '../../../Ldap/constants';
import { logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';
export class CreateLdapEntities1655579796123 implements MigrationInterface {
	name = 'CreateLdapEntities1655579796123';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query('PRAGMA foreign_keys=OFF');

		await queryRunner.query(
			`CREATE TABLE "temporary_user" (
				"id" varchar PRIMARY KEY NOT NULL,
				"email" varchar(255),
				"firstName" varchar(32),
				"lastName" varchar(32),
				"password" varchar,
				"resetPasswordToken" varchar,
				"resetPasswordTokenExpiration" integer DEFAULT NULL,
				"ldapId" varchar DEFAULT NULL,
				"signInType" varchar DEFAULT email,
				"personalizationAnswers" text,
				"createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
				"updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
				"globalRoleId" integer NOT NULL,
				"settings" text,
				"apiKey" varchar DEFAULT NULL,
				"disabled" boolean DEFAULT false,
				CONSTRAINT "FK_${tablePrefix}f0609be844f9200ff4365b1bb3d" FOREIGN KEY ("globalRoleId") REFERENCES "${tablePrefix}role" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`,
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

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS "${tablePrefix}feature_config" (
				"name"	TEXT,
				"data"	TEXT NOT NULL DEFAULT '{}',
				PRIMARY KEY("name")
			);`,
		);

		await queryRunner.query(`
				INSERT INTO "${tablePrefix}feature_config" VALUES (
					ldap,
					${JSON.stringify(LDAP_DEFAULT_CONFIGURATION)},
				)
		`);

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS "${tablePrefix}ldap_sync_history" (
				"id"	INTEGER,
				"startedAt"	datetime NOT NULL,
				"endedAt"	datetime NOT NULL,
				"created"	INTEGER NOT NULL,
				"updated"	INTEGER NOT NULL,
				"disabled"	INTEGER NOT NULL,
				"scanned"	INTEGER NOT NULL,
				"status"	TEXT NOT NULL,
				"runMode" TEXT NOT NULL,
				"error" TEXT,
				PRIMARY KEY("id" AUTOINCREMENT)
			);`,
		);

		await queryRunner.query('PRAGMA foreign_keys=ON');

		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_${tablePrefix}9uxg3h65pj2dzm18mugtk565a8" ON "${tablePrefix}user" ("ldapId")`,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {}
}
