import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';
import config from '../../../../config';

export class IntroducePinData1654002187508 implements MigrationInterface {
	name = 'IntroducePinData1654002187508';

	async up(queryRunner: QueryRunner) {
		logMigrationStart(this.name);

		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`
			CREATE TABLE "${tablePrefix}pin_data" (
				"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
				"data" text
			);`);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner) {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`DROP TABLE "${tablePrefix}pin_data"`);
	}
}
