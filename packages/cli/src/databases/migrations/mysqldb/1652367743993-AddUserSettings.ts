import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '@/config';

export class AddUserSettings1652367743993 implements MigrationInterface {
	name = 'AddUserSettings1652367743993';

	public async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			'ALTER TABLE `' + tablePrefix + 'user` ADD COLUMN `settings` json NULL DEFAULT NULL',
		);
		await queryRunner.query(
			'ALTER TABLE `' +
				tablePrefix +
				'user` CHANGE COLUMN `personalizationAnswers` `personalizationAnswers` json NULL DEFAULT NULL',
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'user` DROP COLUMN `settings`');
	}
}
