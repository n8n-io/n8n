import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '@/config';
import { logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';

export class AddUserSettings1652367743993 implements MigrationInterface {
	name = 'AddUserSettings1652367743993';

	public async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query('PRAGMA foreign_keys=OFF');

		await queryRunner.query(
			`CREATE TABLE "temporary_user" ("id" varchar PRIMARY KEY NOT NULL, "email" varchar(255), "firstName" varchar(32), "lastName" varchar(32), "password" varchar, "resetPasswordToken" varchar, "resetPasswordTokenExpiration" integer DEFAULT NULL, "personalizationAnswers" text, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "globalRoleId" integer NOT NULL, "settings" text, CONSTRAINT "FK_${tablePrefix}f0609be844f9200ff4365b1bb3d" FOREIGN KEY ("globalRoleId") REFERENCES "${tablePrefix}role" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`,
		);
		await queryRunner.query(
			`INSERT INTO "temporary_user"("id", "email", "firstName", "lastName", "password", "resetPasswordToken", "resetPasswordTokenExpiration", "personalizationAnswers", "createdAt", "updatedAt", "globalRoleId") SELECT "id", "email", "firstName", "lastName", "password", "resetPasswordToken", "resetPasswordTokenExpiration", "personalizationAnswers", "createdAt", "updatedAt", "globalRoleId" FROM "${tablePrefix}user"`,
		);
		await queryRunner.query(`DROP TABLE "${tablePrefix}user"`);
		await queryRunner.query(`ALTER TABLE "temporary_user" RENAME TO "${tablePrefix}user"`);

		await queryRunner.query(
			`CREATE UNIQUE INDEX "UQ_${tablePrefix}e12875dfb3b1d92d7d7c5377e2" ON "${tablePrefix}user" ("email")`,
		);

		await queryRunner.query('PRAGMA foreign_keys=ON');

		logMigrationEnd(this.name);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query('PRAGMA foreign_keys=OFF');

		await queryRunner.query(`ALTER TABLE "${tablePrefix}user" RENAME TO "temporary_user"`);
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}user" ("id" varchar PRIMARY KEY NOT NULL, "email" varchar(255), "firstName" varchar(32), "lastName" varchar(32), "password" varchar, "resetPasswordToken" varchar, "resetPasswordTokenExpiration" integer DEFAULT NULL, "personalizationAnswers" text, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "globalRoleId" integer NOT NULL, CONSTRAINT "FK_${tablePrefix}f0609be844f9200ff4365b1bb3d" FOREIGN KEY ("globalRoleId") REFERENCES "${tablePrefix}role" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`,
		);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}user"("id", "email", "firstName", "lastName", "password", "resetPasswordToken", "resetPasswordTokenExpiration", "personalizationAnswers", "createdAt", "updatedAt", "globalRoleId") SELECT "id", "email", "firstName", "lastName", "password", "resetPasswordToken", "resetPasswordTokenExpiration", "personalizationAnswers", "createdAt", "updatedAt", "globalRoleId" FROM "temporary_user"`,
		);
		await queryRunner.query(`DROP TABLE "temporary_user"`);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "UQ_${tablePrefix}e12875dfb3b1d92d7d7c5377e2" ON "${tablePrefix}user" ("email")`,
		);

		await queryRunner.query('PRAGMA foreign_keys=ON');
	}
}
