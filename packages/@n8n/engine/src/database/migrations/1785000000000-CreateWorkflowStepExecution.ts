import { Table, TableIndex } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_step_execution';

export class CreateWorkflowStepExecution1785000000000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createTable(
			new Table({
				name: TABLE,
				columns: [
					{ name: 'id', type: 'varchar', isPrimary: true },
					{ name: 'execution_id', type: 'varchar' },
					{ name: 'node_id', type: 'varchar' },
					{ name: 'status', type: 'varchar', length: '32' },
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
			}),
		);

		await queryRunner.createIndices(TABLE, [
			new TableIndex({
				name: 'idx_workflow_step_execution_execution_id',
				columnNames: ['execution_id'],
			}),
		]);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable(TABLE);
	}
}
