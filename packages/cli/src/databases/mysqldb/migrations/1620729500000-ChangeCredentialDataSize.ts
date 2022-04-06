import { MigrationInterface, QueryRunner } from 'typeorm';
import * as config from '../../../../config';

export class ChangeCredentialDataSize1620729500000 implements MigrationInterface {
	name = 'ChangeCredentialDataSize1620729500000';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'credentials_entity` MODIFY COLUMN `type` varchar(128) NOT NULL');
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'credentials_entity` MODIFY COLUMN `type` varchar(32) NOT NULL');
	}
}
