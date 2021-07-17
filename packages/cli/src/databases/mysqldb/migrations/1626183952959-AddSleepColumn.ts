import {MigrationInterface, QueryRunner} from "typeorm";
import * as config from '../../../../config';

export class AddSleepColumnId1626183952959 implements MigrationInterface {
	name = 'AddSleepColumnId1626183952959';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'execution_entity` ADD `sleepTill` DATETIME NULL');
		await queryRunner.query('CREATE INDEX `IDX_' + tablePrefix + 'ca4a71b47f28ac6ea88293a8e2` ON `' + tablePrefix + 'webhook_entity` (`webhookId`, `method`, `pathLength`)');
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(
			'DROP INDEX `IDX_' + tablePrefix + 'ca4a71b47f28ac6ea88293a8e2` ON `' + tablePrefix + 'webhook_entity`'
		);
		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'execution_entity` DROP COLUMN `sleepTill`');
	}
}
