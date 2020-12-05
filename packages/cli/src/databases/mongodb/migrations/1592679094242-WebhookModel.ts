import {
	MigrationInterface,
} from 'typeorm';

import * as config from '../../../../config';

import {
	MongoQueryRunner,
} from 'typeorm/driver/mongodb/MongoQueryRunner';

export class WebhookModel1592679094242 implements MigrationInterface {
	name = 'WebhookModel1592679094242';

	async up(queryRunner: MongoQueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');
		await queryRunner.manager.createCollectionIndex(`${tablePrefix}webhook_entity`, ['webhookPath',  'method'], { unique: true, background: false });
	}

	async down(queryRunner: MongoQueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');
		await queryRunner.dropTable(`${tablePrefix}webhook_entity`);
	}
}
