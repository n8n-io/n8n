import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationStart, logMigrationEnd } from '../../utils/migrationHelpers';
import config from '../../../../config';

export class IntroducePinData1654003919549 implements MigrationInterface {
	name = 'IntroducePinData1654003919549';

	async up(queryRunner: QueryRunner) {
		logMigrationStart(this.name);

		const schema = config.getEnv('database.postgresdb.schema');
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`SET search_path TO ${schema};`);

		const pinDataTableName = `${schema}.${tablePrefix}pin_data`;

		await queryRunner.query(
			`CREATE TABLE ${pinDataTableName} (
				"id" SERIAL NOT NULL,
				"data" json,
				CONSTRAINT "PK_7338b1012fbfccc292f72b58c47" PRIMARY KEY ("id")
			)`,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner) {
		logMigrationStart(this.name);

		const schema = config.getEnv('database.postgresdb.schema');
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`SET search_path TO ${schema};`);

		const pinDataTableName = `${schema}.${tablePrefix}pin_data`;

		await queryRunner.query(`DROP TABLE ${pinDataTableName}`);

		logMigrationEnd(this.name);
	}
}
