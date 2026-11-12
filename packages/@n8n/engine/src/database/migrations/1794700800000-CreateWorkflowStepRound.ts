import { Table } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_step_round';

export class CreateWorkflowStepRound1794700800000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createTable(
			new Table({
				name: TABLE,
				columns: [
					{ name: 'step_id', type: 'uuid', isPrimary: true },
					{
						name: 'round',
						type: 'int',
						isPrimary: true,
						comment: 'The run of the declaring step this row records, from 0.',
					},
					{ name: 'execution_id', type: 'uuid' },
					{
						name: 'actions',
						type: 'jsonb',
						comment:
							'The actions the step declared in this round, in declared order. The engine reads the target and the call id of each.',
					},
					{
						name: 'payload',
						type: 'jsonb',
						comment: 'What the node needs in later rounds. The engine does not read it.',
					},
					{
						name: 'created_at',
						type: 'timestamptz',
						precision: 3,
						default: 'CURRENT_TIMESTAMP(3)',
					},
				],
				indices: [
					// For the per-execution caps, which count the rounds and actions of one execution.
					{ name: 'idx_workflow_step_round_execution_id', columnNames: ['execution_id'] },
				],
				foreignKeys: [
					{
						name: 'fk_workflow_step_round_execution',
						columnNames: ['execution_id'],
						referencedTableName: 'workflow_execution',
						referencedColumnNames: ['id'],
						onDelete: 'CASCADE',
					},
					{
						name: 'fk_workflow_step_round_step',
						columnNames: ['step_id'],
						referencedTableName: 'workflow_step_execution',
						referencedColumnNames: ['id'],
						onDelete: 'CASCADE',
					},
				],
			}),
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable(TABLE);
	}
}
