import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
import config from '@/config';

export class UpdateRunningExecutionStatus1677237073720 implements MigrationInterface {
	name = 'UpdateRunningExecutionStatus1677237073720';
	public async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`UPDATE "${tablePrefix}execution_entity" SET "status" = 'failed' WHERE "status" = 'running' AND "finished"=0 AND "stoppedAt" IS NOT NULL;`,
		);
		await queryRunner.query(
			`UPDATE "${tablePrefix}execution_entity" SET "status" = 'success' WHERE "status" = 'running' AND "finished"=1 AND "stoppedAt" IS NOT NULL;`,
		);

		logMigrationEnd(this.name);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
