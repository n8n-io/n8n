import { MigrationInterface, QueryRunner } from 'typeorm';

import * as config from '../../../../config';

export default class AddWebhookId1610570498276 implements MigrationInterface {
	name = 'AddWebhookId1610570498276';

	public async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(
			`CREATE TABLE "temporary_webhook_entity" ("workflowId" integer NOT NULL, "webhookPath" varchar NOT NULL, "method" varchar NOT NULL, "node" varchar NOT NULL, "webhookId" varchar, PRIMARY KEY ("webhookPath", "method"))`,
		);
		await queryRunner.query(
			`INSERT INTO "temporary_webhook_entity"("workflowId", "webhookPath", "method", "node") SELECT "workflowId", "webhookPath", "method", "node" FROM "${tablePrefix}webhook_entity"`,
		);
		await queryRunner.query(`DROP TABLE "${tablePrefix}webhook_entity"`);
		await queryRunner.query(`ALTER TABLE "temporary_webhook_entity" RENAME TO "${tablePrefix}webhook_entity"`);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_${tablePrefix}e1dddabccea3081178199d6004" ON "${tablePrefix}webhook_entity" ("webhookId", "method") `,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}e1dddabccea3081178199d6004"`);
		await queryRunner.query(`ALTER TABLE "${tablePrefix}webhook_entity" RENAME TO "temporary_webhook_entity"`);
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}webhook_entity" ("workflowId" integer NOT NULL, "webhookPath" varchar NOT NULL, "method" varchar NOT NULL, "node" varchar NOT NULL, PRIMARY KEY ("webhookPath", "method"))`,
		);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}webhook_entity"("workflowId", "webhookPath", "method", "node") SELECT "workflowId", "webhookPath", "method", "node" FROM "temporary_webhook_entity"`,
		);
		await queryRunner.query(`DROP TABLE "temporary_webhook_entity"`);
	}
}
