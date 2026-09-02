import { TableCheck, TableColumn } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_step_execution';
const STATUS_CHECK = 'chk_workflow_step_execution_status';
const WAIT_TILL_INDEX = 'idx_workflow_step_execution_wait_till';

export class AddStepWait1788354900000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumns(TABLE, [
			new TableColumn({
				name: 'wait',
				type: 'jsonb',
				isNullable: true,
				comment:
					'What the step is waiting for, as its executor declared it. Persisted without inspection and read back on resume.',
			}),
			new TableColumn({
				name: 'wait_till',
				type: 'timestamptz',
				precision: 3,
				isNullable: true,
				comment: "The wait's deadline, lifted out of `wait` so the sweep can index it.",
			}),
		]);

		// A waiting step has no outcome, so it settles no more than a running one.
		await queryRunner.dropCheckConstraint(TABLE, STATUS_CHECK);
		await queryRunner.createCheckConstraint(
			TABLE,
			new TableCheck({
				name: STATUS_CHECK,
				expression:
					"status IN ('queued', 'running', 'waiting', 'completed', 'failed', 'skipped', 'cancelled')",
			}),
		);

		// The sweep asks only for due waits, so it indexes only waiting rows.
		await queryRunner.query(
			`CREATE INDEX "${WAIT_TILL_INDEX}" ON ${TABLE} (wait_till) WHERE status = 'waiting'`,
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX "${WAIT_TILL_INDEX}"`);
		await queryRunner.dropCheckConstraint(TABLE, STATUS_CHECK);
		await queryRunner.createCheckConstraint(
			TABLE,
			new TableCheck({
				name: STATUS_CHECK,
				expression:
					"status IN ('queued', 'running', 'completed', 'failed', 'skipped', 'cancelled')",
			}),
		);
		await queryRunner.dropColumns(TABLE, ['wait', 'wait_till']);
	}
}
