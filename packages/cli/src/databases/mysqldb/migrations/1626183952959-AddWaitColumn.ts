import {MigrationInterface, QueryRunner} from "typeorm";
import * as config from '../../../../config';

export class AddWaitColumnId1626183952959 implements MigrationInterface {
	name = 'AddWaitColumnId1626183952959';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'execution_entity` ADD `waitTill` DATETIME NULL');
		await queryRunner.query('CREATE INDEX `IDX_' + tablePrefix + 'ca4a71b47f28ac6ea88293a8e2` ON `' + tablePrefix + 'execution_entity` (`waitTill`)');
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(
			'DROP INDEX `IDX_' + tablePrefix + 'ca4a71b47f28ac6ea88293a8e2` ON `' + tablePrefix + 'execution_entity`'
		);
		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'execution_entity` DROP COLUMN `waitTill`');
	}
}
