import { MigrationInterface, QueryRunner } from "typeorm";

import config from '@/config';

export class MakeStoppedAtNullable1607431743767 implements MigrationInterface {

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');
		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'execution_entity` MODIFY `stoppedAt` datetime', undefined);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');
		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'execution_entity` MODIFY `stoppedAt` datetime NOT NULL', undefined);
	}

}
