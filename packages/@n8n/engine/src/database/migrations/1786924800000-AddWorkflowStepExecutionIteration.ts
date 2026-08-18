import { TableColumn, TableIndex } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_step_execution';
const OLD_UNIQUE = 'uniq_workflow_step_execution_execution_id_node_id';
const NEW_UNIQUE = 'uniq_workflow_step_execution_execution_id_node_id_iteration';
const FAILED_INDEX = 'idx_workflow_step_execution_failed';

export class AddWorkflowStepExecutionIteration1786924800000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumn(
			TABLE,
			new TableColumn({
				name: 'iteration',
				type: 'int',
				default: 0,
				comment: 'Which pass over a loop body this row belongs to. 0 for non-loops.',
			}),
		);
		await queryRunner.dropIndex(TABLE, OLD_UNIQUE);
		await queryRunner.createIndex(
			TABLE,
			new TableIndex({
				name: NEW_UNIQUE,
				columnNames: ['execution_id', 'node_id', 'iteration'],
				isUnique: true,
			}),
		);
		await queryRunner.createIndex(
			TABLE,
			new TableIndex({
				name: FAILED_INDEX,
				columnNames: ['execution_id'],
				where: "status = 'failed'",
			}),
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropIndex(TABLE, FAILED_INDEX);
		await queryRunner.dropIndex(TABLE, NEW_UNIQUE);
		await queryRunner.createIndex(
			TABLE,
			new TableIndex({
				name: OLD_UNIQUE,
				columnNames: ['execution_id', 'node_id'],
				isUnique: true,
			}),
		);
		await queryRunner.dropColumn(TABLE, 'iteration');
	}
}
