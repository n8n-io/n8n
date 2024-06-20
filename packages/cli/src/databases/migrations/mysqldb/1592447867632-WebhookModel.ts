import type { MigrationContext, ReversibleMigration } from '@db/types';

export class WebhookModel1592447867632 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS ${tablePrefix}webhook_entity (workflowId int NOT NULL, webhookPath varchar(255) NOT NULL, method varchar(255) NOT NULL, node varchar(255) NOT NULL, PRIMARY KEY (webhookPath, method)) ENGINE=InnoDB`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP TABLE ${tablePrefix}webhook_entity`);
	}
}
