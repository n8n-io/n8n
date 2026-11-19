import { TableColumn } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_step_execution';
const COLUMN = 'attempt';

/**
 * The reconciliation sweeper can queue a step again after the worker of the
 * step stopped. The attempt number bounds how many times it does that, and the
 * outcome writes of a worker test it, so a worker of an earlier attempt cannot
 * change the row.
 *
 * The default is a constant, so PostgreSQL adds the column without a rewrite
 * of the table.
 */
export class AddStepAttempt1795089600000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumn(
			TABLE,
			new TableColumn({
				name: COLUMN,
				type: 'int',
				default: 1,
				comment:
					'How many times the engine queued the step to run it from the start. 1 at creation. The reconciliation sweeper adds 1 when it queues the step again after the worker of the step stopped.',
			}),
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropColumn(TABLE, COLUMN);
	}
}
