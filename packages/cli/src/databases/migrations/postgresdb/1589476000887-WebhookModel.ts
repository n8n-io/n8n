import type { MigrationContext, ReversibleMigration } from '@db/types';

export class WebhookModel1589476000887 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS ${tablePrefix}webhook_entity ("workflowId" integer NOT NULL, "webhookPath" character varying NOT NULL, "method" character varying NOT NULL, "node" character varying NOT NULL, CONSTRAINT "PK_${tablePrefix}b21ace2e13596ccd87dc9bf4ea6" PRIMARY KEY ("webhookPath", "method"))`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP TABLE ${tablePrefix}webhook_entity`);
	}
}
