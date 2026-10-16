import { TableIndex } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_execution';

/**
 * The execution list sorts by `(created_at, id)`. Without an index in that
 * order, every page sorts the whole table. Each filter column leads its own
 * index, so a filtered page also reads in sort order. These replace the
 * single-column `workflow_id` and `status` indexes, which are their prefixes.
 */
export class IndexWorkflowExecutionListOrder1792108800000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createIndices(TABLE, [
			new TableIndex({
				name: 'idx_workflow_execution_created_at_id',
				columnNames: ['created_at', 'id'],
			}),
			new TableIndex({
				name: 'idx_workflow_execution_workflow_id_created_at_id',
				columnNames: ['workflow_id', 'created_at', 'id'],
			}),
			new TableIndex({
				name: 'idx_workflow_execution_status_created_at_id',
				columnNames: ['status', 'created_at', 'id'],
			}),
		]);
		await queryRunner.dropIndex(TABLE, 'idx_workflow_execution_workflow_id');
		await queryRunner.dropIndex(TABLE, 'idx_workflow_execution_status');
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createIndices(TABLE, [
			new TableIndex({ name: 'idx_workflow_execution_workflow_id', columnNames: ['workflow_id'] }),
			new TableIndex({ name: 'idx_workflow_execution_status', columnNames: ['status'] }),
		]);
		await queryRunner.dropIndex(TABLE, 'idx_workflow_execution_created_at_id');
		await queryRunner.dropIndex(TABLE, 'idx_workflow_execution_workflow_id_created_at_id');
		await queryRunner.dropIndex(TABLE, 'idx_workflow_execution_status_created_at_id');
	}
}
