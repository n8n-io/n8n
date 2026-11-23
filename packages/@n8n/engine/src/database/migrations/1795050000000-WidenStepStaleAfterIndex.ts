import { TableIndex } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_step_execution';
const INDEX = 'idx_workflow_step_execution_stale_after';

const QUEUED_OR_RUNNING = "status IN ('queued', 'running')";
const HAS_STALE_AFTER = 'stale_after IS NOT NULL';

const COMMENT_BEFORE =
	'When the engine treats a queued or running step as stuck. Written at each transition into those statuses. NULL in every other status.';
const COMMENT_AFTER =
	'When the engine treats the step as stuck. Written at each transition into queued or running. Also written at each transition into completed, failed or skipped, and cleared after the orchestration worker handled the step:settled message of the step. NULL in every other case.';

/**
 * Removes the index, then creates it again. Both statements run in the
 * transaction of the migration, so no query sees the table without the index.
 *
 * The removal locks the table until the transaction ends, so reads and writes
 * wait while the index builds. Do not change the order to keep the reads open.
 * `claimStep` and `createSteps` read the table and then write it in one
 * transaction. With the build first, such a transaction waits for the lock of
 * the build, the removal waits for that transaction, and PostgreSQL stops one
 * of the two with a deadlock error.
 */
async function replaceIndex(queryRunner: QueryRunner, where: string): Promise<void> {
	await queryRunner.dropIndex(TABLE, INDEX);
	await queryRunner.createIndex(
		TABLE,
		new TableIndex({ name: INDEX, columnNames: ['status', 'stale_after'], where }),
	);
}

async function setComment(queryRunner: QueryRunner, comment: string): Promise<void> {
	// COMMENT takes no bind parameter. The two texts above contain no quote.
	await queryRunner.query(`COMMENT ON COLUMN ${TABLE}.stale_after IS '${comment}'`);
}

/**
 * A settled step now keeps its `stale_after` time until the orchestration
 * worker handles its `step:settled` message. The search for those steps needs
 * them in the index, so the predicate of the index changes from the two
 * statuses to every row that has a time. A settled row leaves the index when
 * the orchestration worker clears its time.
 */
export class WidenStepStaleAfterIndex1795050000000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await replaceIndex(queryRunner, HAS_STALE_AFTER);
		await setComment(queryRunner, COMMENT_AFTER);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await replaceIndex(queryRunner, QUEUED_OR_RUNNING);
		await setComment(queryRunner, COMMENT_BEFORE);
	}
}
