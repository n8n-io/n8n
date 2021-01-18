import { MigrationInterface, QueryRunner } from 'typeorm';

import * as config from '../../../../config';

export class AddWebhookId1610632462428 implements MigrationInterface {
	name = 'AddWebhookId1610632462428';

	async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.get('database.tablePrefix');
		const tablePrefixPure = tablePrefix;
		const schema = config.get('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`ALTER TABLE ${tablePrefix}webhook_entity ADD "webhookId" character varying`);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefixPure}5c698bcd4092bc271cabdf7814" ON ${tablePrefix}webhook_entity ("webhookId", "method") `
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.get('database.tablePrefix');
		const tablePrefixPure = tablePrefix;
		const schema = config.get('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`DROP INDEX IDX_${tablePrefixPure}5c698bcd4092bc271cabdf7814`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}webhook_entity DROP COLUMN "webhookId"`);
	}
}
