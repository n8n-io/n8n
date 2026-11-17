import { fromSqliteDatetime, fromSqliteJson } from './sqlite-values';
import { ExecutionNotFoundError, type ExecutionRecord } from '../../execution/execution-store';
import { TypeOrmExecutionStore } from '../typeorm-execution-store';

/** The execution path's columns as the raw query returns them: JSON and timestamps as text. */
type RawExecutionRow = {
	id: string;
	workflowId: string;
	status: ExecutionRecord['status'];
	mode: ExecutionRecord['mode'];
	graph: string;
	triggerOutputs: string | null;
	callerContext: string;
	responseExpectation: string;
	parentExecutionId: string | null;
	parentStepId: string | null;
	parentAwaited: number | null;
	lifecycleEventSubscription: string | null;
	finishedAt: string | null;
};

/**
 * `ExecutionStore` on SQLite. The compare-and-set updates are dialect-free and
 * inherited. What differs: the full load reads the row through the entity so
 * JSON columns hydrate, and the live-status refresh is one SQLite statement.
 */
export class SqliteExecutionStore extends TypeOrmExecutionStore {
	async loadExecution(id: string): Promise<ExecutionRecord> {
		// Named columns, as the parent: the workflow document is never shipped.
		const row = await this.repo
			.createQueryBuilder('execution')
			.select('execution.id', 'id')
			.addSelect('execution.workflow_id', 'workflowId')
			.addSelect('execution.status', 'status')
			.addSelect('execution.mode', 'mode')
			.addSelect('execution.graph', 'graph')
			.addSelect('execution.trigger_outputs', 'triggerOutputs')
			.addSelect('execution.caller_context', 'callerContext')
			.addSelect('execution.response_expectation', 'responseExpectation')
			.addSelect('execution.parent_execution_id', 'parentExecutionId')
			.addSelect('execution.parent_step_id', 'parentStepId')
			.addSelect('execution.parent_awaited', 'parentAwaited')
			.addSelect('execution.lifecycle_event_subscription', 'lifecycleEventSubscription')
			.addSelect('execution.finished_at', 'finishedAt')
			.where('execution.id = :id', { id })
			.getRawOne<RawExecutionRow>();
		if (!row) throw new ExecutionNotFoundError(id);
		const record: Omit<ExecutionRecord, 'workflow'> = {
			id: row.id,
			workflowId: row.workflowId,
			status: row.status,
			mode: row.mode,
			graph: fromSqliteJson<ExecutionRecord['graph']>(row.graph) as ExecutionRecord['graph'],
			triggerOutputs: fromSqliteJson<NonNullable<ExecutionRecord['triggerOutputs']>>(
				row.triggerOutputs,
			),
			callerContext: fromSqliteJson<ExecutionRecord['callerContext']>(
				row.callerContext,
			) as ExecutionRecord['callerContext'],
			responseExpectation: fromSqliteJson<ExecutionRecord['responseExpectation']>(
				row.responseExpectation,
			) as ExecutionRecord['responseExpectation'],
			parent:
				row.parentExecutionId === null || row.parentStepId === null || row.parentAwaited === null
					? null
					: {
							executionId: row.parentExecutionId,
							stepId: row.parentStepId,
							awaited: row.parentAwaited === 1,
						},
			lifecycleEventSubscription: fromSqliteJson<
				NonNullable<ExecutionRecord['lifecycleEventSubscription']>
			>(row.lifecycleEventSubscription),
			finishedAt: fromSqliteDatetime(row.finishedAt),
		};
		// The parent's raw read ships no `workflow` either; the type is structural.
		return record as ExecutionRecord;
	}

	async refreshLiveStatus(id: string): Promise<void> {
		// One statement, so the probes and the write run as the single writer.
		await this.repo.query(
			`UPDATE workflow_execution
			 SET status = CASE WHEN EXISTS (
					SELECT 1 FROM workflow_step_execution
					WHERE execution_id = ?1 AND status IN ('queued', 'running')
				) THEN 'running' ELSE 'waiting' END,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = ?1
				AND status IN ('running', 'waiting')
				AND EXISTS (
					SELECT 1 FROM workflow_step_execution
					WHERE execution_id = ?1 AND status IN ('queued', 'running', 'waiting')
				)
				AND status IS NOT CASE WHEN EXISTS (
					SELECT 1 FROM workflow_step_execution
					WHERE execution_id = ?1 AND status IN ('queued', 'running')
				) THEN 'running' ELSE 'waiting' END`,
			[id],
		);
	}
}
