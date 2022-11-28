import { MigrationInterface, QueryRunner } from 'typeorm';

import config from '@/config';

export class CreateIndexStoppedAt1594828256133 implements MigrationInterface {
	name = 'CreateIndexStoppedAt1594828256133';

	async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const tablePrefixPure = tablePrefix;
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`SET search_path TO ${schema};`);

		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS IDX_${tablePrefixPure}33228da131bb1112247cf52a42 ON ${tablePrefix}execution_entity ("stoppedAt") `,
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');

		const tablePrefixPure = tablePrefix;
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}
		await queryRunner.query(`SET search_path TO ${schema};`);
		await queryRunner.query(`DROP INDEX IDX_${tablePrefixPure}33228da131bb1112247cf52a42`);
	}
}
