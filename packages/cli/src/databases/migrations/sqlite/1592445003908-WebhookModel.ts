import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '@/config';
import { logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';

export class WebhookModel1592445003908 implements MigrationInterface {
	name = 'WebhookModel1592445003908';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS ${tablePrefix}webhook_entity ("workflowId" integer NOT NULL, "webhookPath" varchar NOT NULL, "method" varchar NOT NULL, "node" varchar NOT NULL, PRIMARY KEY ("webhookPath", "method"))`,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');
		await queryRunner.query(`DROP TABLE ${tablePrefix}webhook_entity`);
	}
}
