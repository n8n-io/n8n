import { MigrationInterface, QueryRunner } from 'typeorm';

import * as config from '../../../../config';

export class AddWebhookId1610640521099 implements MigrationInterface {
	name = 'AddWebhookId1610640521099';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'webhook_entity` ADD `webhookId` varchar(255) NULL');
		await queryRunner.query('CREATE INDEX `IDX_' + tablePrefix + 'e1dddabccea3081178199d6004` ON `' + tablePrefix + 'webhook_entity` (`webhookId`, `method`)');
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(
			'DROP INDEX `IDX_' + tablePrefix + 'e1dddabccea3081178199d6004` ON `' + tablePrefix + 'webhook_entity`'
		);
		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'webhook_entity` DROP COLUMN `webhookId`');
	}
}
