import type { MigrationContext, ReversibleMigration } from '@db/types';

export class AddWebhookId1611149998770 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			'ALTER TABLE `' + tablePrefix + 'webhook_entity` ADD `webhookId` varchar(255) NULL',
		);
		await queryRunner.query(
			'ALTER TABLE `' + tablePrefix + 'webhook_entity` ADD `pathLength` int NULL',
		);
		await queryRunner.query(
			'CREATE INDEX `IDX_' +
				tablePrefix +
				'742496f199721a057051acf4c2` ON `' +
				tablePrefix +
				'webhook_entity` (`webhookId`, `method`, `pathLength`)',
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			'DROP INDEX `IDX_' +
				tablePrefix +
				'742496f199721a057051acf4c2` ON `' +
				tablePrefix +
				'webhook_entity`',
		);
		await queryRunner.query(
			'ALTER TABLE `' + tablePrefix + 'webhook_entity` DROP COLUMN `pathLength`',
		);
		await queryRunner.query(
			'ALTER TABLE `' + tablePrefix + 'webhook_entity` DROP COLUMN `webhookId`',
		);
	}
}
