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
					// Composite: steps are looked up per execution, usually narrowed to
					// specific nodes. The leading column also serves execution-only
					// lookups and the FK's cascading delete.
					{
						name: 'idx_workflow_step_execution_execution_id_node_id',
						columnNames: ['execution_id', 'node_id'],
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
						expression: "status IN ('queued', 'running', 'completed', 'failed', 'cancelled')",
					},
				],
			}),
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable(TABLE);
	}
}
