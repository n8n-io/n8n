import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
import config from '@/config';

export class IntroducePinData1654090467022 implements MigrationInterface {
	name = 'IntroducePinData1654090467022';

	async up(queryRunner: QueryRunner) {
		logMigrationStart(this.name);

		const schema = config.getEnv('database.postgresdb.schema');
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`SET search_path TO ${schema}`);

		await queryRunner.query(
			`ALTER TABLE ${schema}.${tablePrefix}workflow_entity ADD "pinData" json`,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner) {
		const schema = config.getEnv('database.postgresdb.schema');
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`SET search_path TO ${schema}`);

		await queryRunner.query(
			`ALTER TABLE ${schema}.${tablePrefix}workflow_entity DROP COLUMN "pinData"`,
		);
	}
}
