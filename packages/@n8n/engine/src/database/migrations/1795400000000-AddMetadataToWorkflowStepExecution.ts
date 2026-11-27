import { TableColumn } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_step_execution';

export class AddMetadataToWorkflowStepExecution1795400000000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumn(
			TABLE,
			new TableColumn({
				name: 'metadata',
				type: 'jsonb',
				isNullable: true,
				comment:
					'What the executor recorded about the run, such as the time a node saved. Stored and reported, never read by the engine.',
			}),
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropColumn(TABLE, 'metadata');
	}
}
