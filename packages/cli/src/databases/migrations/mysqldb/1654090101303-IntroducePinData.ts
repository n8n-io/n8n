import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
import config from '@/config';;

export class IntroducePinData1654090101303 implements MigrationInterface {
	name = 'IntroducePinData1654090101303';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\` ADD \`pinData\` json`,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`ALTER TABLE \`${tablePrefix}workflow_entity\` DROP COLUMN \`pinData\``);
	}
}
