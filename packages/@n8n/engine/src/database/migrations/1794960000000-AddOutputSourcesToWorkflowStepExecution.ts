import { TableColumn } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_step_execution';

export class AddOutputSourcesToWorkflowStepExecution1794960000000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumn(
			TABLE,
			new TableColumn({
				name: 'output_sources',
				type: 'jsonb',
				isNullable: true,
				comment:
					'Where the items in `outputs` came from, per slot. Only a loop node writes it: it emits items other steps made. See `StepOutputSources`.',
			}),
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropColumn(TABLE, 'output_sources');
	}
}
