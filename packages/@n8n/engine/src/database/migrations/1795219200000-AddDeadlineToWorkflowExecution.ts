import { TableColumn, TableIndex } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_execution';
const INDEX = 'idx_workflow_execution_deadline';

/** Adds the time at which the engine cancels an execution that has not ended. */
export class AddDeadlineToWorkflowExecution1795219200000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumn(
			TABLE,
			new TableColumn({
				name: 'deadline',
				type: 'timestamptz',
				precision: 3,
				isNullable: true,
				comment:
					'When the engine cancels the execution if it has not ended. The host sets it at start. Null means no timeout. Kept after the end, so the read can tell a timeout from a manual cancel.',
			}),
		);

		// For the timeout sweep. An ended row keeps its deadline, so only live rows are in the index.
		await queryRunner.createIndex(
			TABLE,
			new TableIndex({
				name: INDEX,
				columnNames: ['deadline'],
				where: "deadline IS NOT NULL AND status IN ('queued', 'running', 'waiting')",
			}),
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropIndex(TABLE, INDEX);
		await queryRunner.dropColumn(TABLE, 'deadline');
	}
}
