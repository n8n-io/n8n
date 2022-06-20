import { MigrationInterface, QueryRunner } from 'typeorm';
import * as config from '../../../../config';
import { logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';
export class CreateFeatureConfig1655579796123 implements MigrationInterface {
	name = 'CreateFeatureConfig1655579796123';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}feature_config" (
				"name"	TEXT,
				"data"	TEXT NOT NULL DEFAULT '{}',
				PRIMARY KEY("name")
			);`
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`DROP TABLE "${tablePrefix}feature_config"`
		);
	}
}
