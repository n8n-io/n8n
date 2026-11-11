import { TableColumn, TableIndex } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_step_execution';
const OLD_UNIQUE = 'uniq_workflow_step_execution_execution_id_node_id_iteration';
const NEW_UNIQUE = 'uniq_workflow_step_execution_node_iteration_branch';

/**
 * A node runs once for each live arrival into an input slot, so one node at one
 * pass can have several steps. `branch` tells them apart, and `sources` records
 * which step feeds each input slot of a step.
 */
export class AddStepBranch1794787200000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumns(TABLE, [
			new TableColumn({
				name: 'branch',
				type: 'int',
				default: 0,
				comment:
					'Which run of the node at this iteration. 0 unless several live branches converged upstream.',
			}),
			new TableColumn({
				name: 'sources',
				type: 'jsonb',
				isNullable: true,
				comment:
					'The step that feeds each input slot, and from which output slot. Recorded when the step is planned. NULL for the trigger.',
			}),
		]);

		await queryRunner.dropIndex(TABLE, OLD_UNIQUE);
		await queryRunner.createIndex(
			TABLE,
			new TableIndex({
				name: NEW_UNIQUE,
				columnNames: ['execution_id', 'node_id', 'iteration', 'branch'],
				isUnique: true,
			}),
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropIndex(TABLE, NEW_UNIQUE);
		await queryRunner.createIndex(
			TABLE,
			new TableIndex({
				name: OLD_UNIQUE,
				columnNames: ['execution_id', 'node_id', 'iteration'],
				isUnique: true,
			}),
		);
		await queryRunner.dropColumns(TABLE, ['branch', 'sources']);
	}
}
