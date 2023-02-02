import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
export class AddMfaColumns1669730543736 implements MigrationInterface {
	name = 'AddMfaColumns1669730543736';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = getTablePrefix();

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
				"mfaEnabled" boolean DEFAULT false,
				"mfaSecret" varchar DEFAULT NULL,
				"mfaRecoveryCodes" varchar DEFAULT NULL,
				"personalizationAnswers" text,
				"createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
				"updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
				"globalRoleId" integer NOT NULL,
				"settings" text,
				"apiKey" varchar DEFAULT NULL,
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

		await queryRunner.query('PRAGMA foreign_keys=ON');

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {}
}
