import {MigrationInterface, QueryRunner} from "typeorm";
import * as config from '../../../../config';

export class AddWebhookId1611149998770 implements MigrationInterface {
	name = 'AddWebhookId1611149998770';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'webhook_entity` ADD `webhookId` varchar(255) NULL');
		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'webhook_entity` ADD `pathLength` int NULL');
		await queryRunner.query('CREATE INDEX `IDX_' + tablePrefix + '742496f199721a057051acf4c2` ON `' + tablePrefix + 'webhook_entity` (`webhookId`, `method`, `pathLength`)');
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(
			'DROP INDEX `IDX_' + tablePrefix + '742496f199721a057051acf4c2` ON `' + tablePrefix + 'webhook_entity`'
		);
		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'webhook_entity` DROP COLUMN `pathLength`');
		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'webhook_entity` DROP COLUMN `webhookId`');
	}
}
