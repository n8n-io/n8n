import { TableIndex } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_execution';
const INDEX = 'idx_workflow_execution_finished_at_id';

export class AddFinishedAtIndexToWorkflowExecution1795046400000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		// For the retention sweep, oldest first.
		await queryRunner.createIndex(
			TABLE,
			new TableIndex({
				name: INDEX,
				columnNames: ['finished_at', 'id'],
				where: 'finished_at IS NOT NULL',
			}),
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropIndex(TABLE, INDEX);
	}
}
