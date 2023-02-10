import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix } from '@db/utils/migrationHelpers';

export class WebhookModel1589476000887 implements MigrationInterface {
	name = 'WebhookModel1589476000887';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS ${tablePrefix}webhook_entity ("workflowId" integer NOT NULL, "webhookPath" character varying NOT NULL, "method" character varying NOT NULL, "node" character varying NOT NULL, CONSTRAINT "PK_${tablePrefix}b21ace2e13596ccd87dc9bf4ea6" PRIMARY KEY ("webhookPath", "method"))`,
			undefined,
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(`DROP TABLE ${tablePrefix}webhook_entity`, undefined);
	}
}
