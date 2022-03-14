import {
	MigrationInterface,
	QueryRunner,
} from 'typeorm';

import config = require('../../../../config');

export class IncreaseTypeVarcharLimit1646834195327 implements MigrationInterface {
	name = 'IncreaseTypeVarcharLimit1646834195327';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');
		await queryRunner.query(`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "type" TYPE VARCHAR(128)`);
	}

	async down(queryRunner: QueryRunner): Promise<void> {}
}
