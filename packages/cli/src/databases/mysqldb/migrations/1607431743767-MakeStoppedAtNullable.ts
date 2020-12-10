import { MigrationInterface, QueryRunner } from "typeorm";

import * as config from '../../../../config';

export class MakeStoppedAtNullable1607431743767 implements MigrationInterface {

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');
		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'execution_entity` MODIFY `stoppedAt` datetime', undefined);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');
		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'execution_entity` MODIFY `stoppedAt` datetime NOT NULL', undefined);
	}

}
