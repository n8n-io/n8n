import {
	MigrationInterface,
	QueryRunner,
} from 'typeorm';

import config from '@/config';

export class WebhookModel1589476000887 implements MigrationInterface {
	name = 'WebhookModel1589476000887';

	async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const tablePrefixIndex = tablePrefix;
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`SET search_path TO ${schema};`);

		await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${tablePrefix}webhook_entity ("workflowId" integer NOT NULL, "webhookPath" character varying NOT NULL, "method" character varying NOT NULL, "node" character varying NOT NULL, CONSTRAINT "PK_${tablePrefixIndex}b21ace2e13596ccd87dc9bf4ea6" PRIMARY KEY ("webhookPath", "method"))`, undefined);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}
		await queryRunner.query(`SET search_path TO ${schema};`);
		await queryRunner.query(`DROP TABLE ${tablePrefix}webhook_entity`, undefined);
	}

}
