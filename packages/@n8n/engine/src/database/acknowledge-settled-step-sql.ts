import { ANNOUNCED_STEP_STATUSES } from '../execution/execution.types';

/**
 * A data-modifying CTE body that does what `StepStore.acknowledgeSettledStep`
 * does, for a step of one execution. Add it to a write that writes rows anyway,
 * so the acknowledgement commits with that write and adds no commit of its own.
 *
 * PostgreSQL runs a data-modifying CTE once, also when the main statement does
 * not read it or changes no row. A raw statement does not set `updated_at`, so
 * the time the step settled stays as it is. The test on `stale_after` makes a
 * second acknowledgement write no row version.
 *
 * Uses the named parameters `:acknowledgeStepId` and `:acknowledgeExecutionId`.
 */
export const ACKNOWLEDGE_SETTLED_STEP_SQL = `UPDATE workflow_step_execution
	SET stale_after = NULL
	WHERE id = :acknowledgeStepId
		AND execution_id = :acknowledgeExecutionId
		AND status IN (${ANNOUNCED_STEP_STATUSES.map((status) => `'${status}'`).join(', ')})
		AND stale_after IS NOT NULL`;

export const ACKNOWLEDGED_CTE_ALIAS = 'acknowledged';
