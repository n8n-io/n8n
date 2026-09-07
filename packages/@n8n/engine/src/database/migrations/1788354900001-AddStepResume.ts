import { TableColumn } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_step_execution';

export class AddStepResume1788354900001 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumns(TABLE, [
			new TableColumn({
				name: 'resume',
				type: 'jsonb',
				isNullable: true,
				comment:
					"What ended the step's wait, recorded when it is resumed. Persisted without inspection.",
			}),
		]);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropColumns(TABLE, ['resume']);
	}
}
