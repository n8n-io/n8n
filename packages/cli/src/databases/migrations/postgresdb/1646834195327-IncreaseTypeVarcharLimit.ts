import { MigrationInterface, QueryRunner } from 'typeorm';

import config from '@/config';

export class IncreaseTypeVarcharLimit1646834195327 implements MigrationInterface {
	name = 'IncreaseTypeVarcharLimit1646834195327';

	async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`SET search_path TO ${schema};`);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "type" TYPE VARCHAR(128)`,
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {}
}
