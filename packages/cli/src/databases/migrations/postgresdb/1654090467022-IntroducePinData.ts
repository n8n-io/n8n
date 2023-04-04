import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';

export class IntroducePinData1654090467022 implements MigrationInterface {
	name = 'IntroducePinData1654090467022';

	async up(queryRunner: QueryRunner) {
		logMigrationStart(this.name);

		const tablePrefix = getTablePrefix();
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity ADD "pinData" json`);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner) {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity DROP COLUMN "pinData"`);
	}
}
