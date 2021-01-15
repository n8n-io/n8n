import { MigrationInterface, QueryRunner } from "typeorm";

import * as config from '../../../../config';

export class CreateIndexStoppedAt1594828256133 implements MigrationInterface {
	name = 'CreateIndexStoppedAt1594828256133';

	async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.get('database.tablePrefix');
		const tablePrefixPure = tablePrefix;
		const schema = config.get('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_${tablePrefixPure}33228da131bb1112247cf52a42 ON ${tablePrefix}execution_entity ("stoppedAt") `);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(`DROP INDEX IDX_${tablePrefix}33228da131bb1112247cf52a42`);
	}

}
