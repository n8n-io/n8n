import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
import config from '@/config';

export class AddStatusToExecutions1674138566000 implements MigrationInterface {
	name = 'AddStatusToExecutions1674138566000';
	public async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`ALTER TABLE ${tablePrefix}execution_entity ADD COLUMN status varchar`);

		logMigrationEnd(this.name);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`ALTER TABLE ${tablePrefix}execution_entity DROP COLUMN status`);
	}
}
