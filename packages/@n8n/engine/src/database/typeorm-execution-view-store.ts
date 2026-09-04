import type { Repository, SelectQueryBuilder } from '@n8n/typeorm';

import type { WorkflowExecution, WorkflowStepExecution } from './entities';
import { ExecutionNotFoundError } from '../execution/execution-store';
import type {
	ExecutionViewStore,
	ExecutionView,
	ExecutionWithStepsView,
	StepView,
} from '../execution/execution-view-store';

type StepColumns = { [K in keyof StepView as `step_${K}`]: StepView[K] };
/** What the left join yields for an execution that has no steps. */
type NoStepColumns = { [K in keyof StepView as `step_${K}`]: null };

/** One joined row: the execution, plus one step of it or nothing. */
type ExecutionStepRow = ExecutionView & (StepColumns | NoStepColumns);

/**
 * TypeORM-backed `ExecutionViewStore` adapter. It spans both tables, since a
 * read of an execution and a read of its steps are one concern.
 *
 * Both queries name their columns rather than returning entities, so the read
 * path pulls no payload it doesn't report — `trigger_outputs` today, and
 * whatever the execution path adds later.
 */
export class TypeOrmExecutionViewStore implements ExecutionViewStore {
	constructor(
		private readonly executions: Repository<WorkflowExecution>,
		private readonly steps: Repository<WorkflowStepExecution>,
	) {}

	async loadExecutionView(id: string): Promise<ExecutionView> {
		const row: ExecutionView | undefined = await this.selectExecution(id).getRawOne();
		if (!row) throw new ExecutionNotFoundError(id);
		return row;
	}

	/**
	 * A left join, so an execution with no steps still returns its own row. The
	 * execution columns repeat for each step, `graph` included; that is the price
	 * of reading the status and the steps as of one point in time.
	 */
	async loadExecutionWithStepsView(id: string): Promise<ExecutionWithStepsView> {
		const rows: ExecutionStepRow[] = await this.selectExecution(id)
			.addSelect('step.id', 'step_id')
			.addSelect('step.node_id', 'step_nodeId')
			.addSelect('step.iteration', 'step_iteration')
			.addSelect('step.status', 'step_status')
			.addSelect('step.outputs', 'step_outputs')
			.addSelect('step.error', 'step_error')
			.addSelect('step.created_at', 'step_createdAt')
			.addSelect('step.updated_at', 'step_updatedAt')
			.leftJoin(this.steps.metadata.tableName, 'step', 'step.execution_id = execution.id')
			.orderBy('step.created_at', 'ASC')
			.addOrderBy('step.node_id', 'ASC')
			.addOrderBy('step.iteration', 'ASC')
			.getRawMany();
		if (rows.length === 0) throw new ExecutionNotFoundError(id);

		return { ...toExecutionView(rows[0]), steps: rows.filter(hasStep).map(toStepView) };
	}

	private selectExecution(id: string): SelectQueryBuilder<WorkflowExecution> {
		return this.executions
			.createQueryBuilder('execution')
			.select('execution.id', 'id')
			.addSelect('execution.workflow_id', 'workflowId')
			.addSelect('execution.status', 'status')
			.addSelect('execution.mode', 'mode')
			.addSelect('execution.graph', 'graph')
			.addSelect('execution.created_at', 'createdAt')
			.addSelect('execution.updated_at', 'updatedAt')
			.addSelect('execution.finished_at', 'finishedAt')
			.where('execution.id = :id', { id });
	}
}

function hasStep(row: ExecutionStepRow): row is ExecutionView & StepColumns {
	return row.step_id !== null;
}

function toExecutionView(row: ExecutionStepRow): ExecutionView {
	const { id, workflowId, status, mode, graph, createdAt, updatedAt, finishedAt } = row;
	return { id, workflowId, status, mode, graph, createdAt, updatedAt, finishedAt };
}

function toStepView(row: StepColumns): StepView {
	return {
		id: row.step_id,
		nodeId: row.step_nodeId,
		iteration: row.step_iteration,
		status: row.step_status,
		outputs: row.step_outputs,
		error: row.step_error,
		createdAt: row.step_createdAt,
		updatedAt: row.step_updatedAt,
	};
}
