import {
	MigrationInterface,
	QueryRunner,
} from 'typeorm';

import * as config from '../../../../config';

export class WebhookModel1592447867632 implements MigrationInterface {
	name = 'WebhookModel1592447867632';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${tablePrefix}webhook_entity (workflowId int NOT NULL, webhookPath varchar(255) NOT NULL, method varchar(255) NOT NULL, node varchar(255) NOT NULL, PRIMARY KEY (webhookPath, method)) ENGINE=InnoDB`);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');
		await queryRunner.query(`DROP TABLE ${tablePrefix}webhook_entity`);
	}
}
