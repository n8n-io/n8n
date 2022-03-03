import { MigrationInterface, QueryRunner } from 'typeorm';
import * as config from '../../../../config';

export class AddAPIKeyColumn1646316097469 implements MigrationInterface {
	name = 'AddAPIKeyColumn1646316097469';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');
		await queryRunner.query(`ALTER TABLE "${tablePrefix}user" ADD apiKey varchar`);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');
		await queryRunner.query(`ALTER TABLE "${tablePrefix}user" RENAME TO "${tablePrefix}temporary_user"`);
		await queryRunner.query(`CREATE TABLE "${tablePrefix}user" ("id" varchar PRIMARY KEY NOT NULL, "email" varchar(255), "firstName" varchar(32), "lastName" varchar(32), "password" varchar, "resetPasswordToken" varchar, "resetPasswordTokenExpiration" integer DEFAULT (NULL), "personalizationAnswers" text, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "globalRoleId" integer NOT NULL, CONSTRAINT "FK_f0609be844f9200ff4365b1bb3d" FOREIGN KEY ("globalRoleId") REFERENCES "role" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
		await queryRunner.query(`INSERT INTO "${tablePrefix}user"("id", "email", "firstName", "lastName", "password", "resetPasswordToken", "resetPasswordTokenExpiration", "personalizationAnswers", "createdAt", "updatedAt", "globalRoleId") SELECT "id", "email", "firstName", "lastName", "password", "resetPasswordToken", "resetPasswordTokenExpiration", "personalizationAnswers", "createdAt", "updatedAt", "globalRoleId" FROM "temporary_user"`);
		await queryRunner.query(`DROP TABLE "${tablePrefix}temporary_user"`);
	}
}
