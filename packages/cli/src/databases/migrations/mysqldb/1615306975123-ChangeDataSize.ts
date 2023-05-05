import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '@/config';

export class ChangeDataSize1615306975123 implements MigrationInterface {
	name = 'ChangeDataSize1615306975123';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			'ALTER TABLE `' + tablePrefix + 'execution_entity` MODIFY COLUMN `data` MEDIUMTEXT NOT NULL',
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			'ALTER TABLE `' + tablePrefix + 'execution_entity` MODIFY COLUMN `data` TEXT NOT NULL',
		);
	}
}
