import { Table, TableIndex } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_execution';

export class CreateWorkflowExecution1778529600000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createTable(
			new Table({
				name: TABLE,
				columns: [
					{ name: 'id', type: 'varchar', isPrimary: true },
					{ name: 'workflow_id', type: 'varchar' },
					{ name: 'status', type: 'varchar', length: '32' },
					{ name: 'mode', type: 'varchar', length: '32' },
					{ name: 'graph', type: 'jsonb' },
					{ name: 'trigger_payload', type: 'jsonb', isNullable: true },
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
					{ name: 'finished_at', type: 'timestamptz', precision: 3, isNullable: true },
				],
			}),
		);

		await queryRunner.createIndices(TABLE, [
			new TableIndex({ name: 'idx_workflow_execution_workflow_id', columnNames: ['workflow_id'] }),
			new TableIndex({ name: 'idx_workflow_execution_status', columnNames: ['status'] }),
		]);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable(TABLE);
	}
}
