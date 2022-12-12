import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
import config from '@/config';

export class AddTriggerCountColumn1669823906994 implements MigrationInterface {
	name = 'AddTriggerCountColumn1669823906994';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ADD COLUMN triggerCount integer NOT NULL DEFAULT 0`,
		);
		// Table will be populated by n8n startup - see ActiveWorkflowRunner.ts

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity DROP COLUMN triggerCount`,
		);
	}
}
