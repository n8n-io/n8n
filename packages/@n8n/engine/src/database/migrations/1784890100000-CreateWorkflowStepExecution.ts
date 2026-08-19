import { Table } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_step_execution';

export class CreateWorkflowStepExecution1784890100000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createTable(
			new Table({
				name: TABLE,
				columns: [
					{ name: 'id', type: 'uuid', isPrimary: true },
					{ name: 'execution_id', type: 'uuid' },
					{ name: 'node_id', type: 'varchar' },
					{
						name: 'iteration',
						type: 'int',
						default: 0,
						comment: 'Which pass over a loop body this row belongs to. 0 for non-loops.',
					},
					{ name: 'status', type: 'varchar', length: '32' },
					{
						name: 'outputs',
						type: 'jsonb',
						isNullable: true,
						comment:
							'Step outputs, persisted without inspection and reloaded as downstream inputs. Shape is step-type-specific.',
					},
					{
						name: 'error',
						type: 'jsonb',
						isNullable: true,
						comment: 'Name and message of the error that failed this step.',
					},
					{
						name: 'created_at',
						type: 'timestamptz',
						precision: 3,
						default: 'CURRENT_TIMESTAMP(3)',
					},
					{
						name: 'updated_at',
						type: 'timestamptz',
						precision: 3,
						default: 'CURRENT_TIMESTAMP(3)',
					},
				],
				indices: [
					// Index execution, node and iteration to look up inputs on the hot path.
					// Unique to prevent double writes on failure recovery, and keyed per pass
					// because a node inside a loop body runs once per pass.
					{
						name: 'uniq_workflow_step_execution_execution_id_node_id_iteration',
						columnNames: ['execution_id', 'node_id', 'iteration'],
						isUnique: true,
					},
					// Partial index for the failed-sibling checks: they run on every event, and
					// loops make an execution's row count scale with its data.
					{
						name: 'idx_workflow_step_execution_failed',
						columnNames: ['execution_id'],
						where: "status = 'failed'",
					},
				],
				foreignKeys: [
					{
						columnNames: ['execution_id'],
						referencedTableName: 'workflow_execution',
						referencedColumnNames: ['id'],
						onDelete: 'CASCADE',
					},
				],
				checks: [
					{
						name: 'chk_workflow_step_execution_status',
						expression:
							"status IN ('queued', 'running', 'completed', 'failed', 'skipped', 'cancelled')",
					},
				],
			}),
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable(TABLE);
	}
}
