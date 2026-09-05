import type { Repository, SelectQueryBuilder } from '@n8n/typeorm';

import type { WorkflowExecution, WorkflowStepExecution } from './entities';
import { ExecutionNotFoundError } from '../execution/execution-store';
import type {
	ExecutionViewStore,
	ExecutionView,
	ExecutionWithStepsView,
	StepView,
} from '../execution/execution-view-store';

/**
 * One step as `json_agg` reports it. Postgres renders a timestamp inside JSON as
 * a string, so the two date columns arrive unparsed.
 */
type StepJson = Omit<StepView, 'createdAt' | 'updatedAt'> & {
	createdAt: string;
	updatedAt: string;
};

/** The execution row, with its steps aggregated into one column. */
type ExecutionWithStepsRow = ExecutionView & { steps: StepJson[] };

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
	 * One query, so the status a caller reports cannot predate the steps beside
	 * it. The steps are aggregated rather than joined row-per-step: a left join
	 * repeats every execution column once per step, and both `graph` and
	 * `workflow` are large enough that a long loop would ship them thousands of
	 * times. Grouping by the primary key is what lets the execution columns
	 * survive the aggregate.
	 */
	async loadExecutionWithStepsView(id: string): Promise<ExecutionWithStepsView> {
		const row: ExecutionWithStepsRow | undefined = await this.selectExecution(id)
			.addSelect(
				`COALESCE(
					json_agg(
						json_build_object(
							'id', step.id,
							'nodeId', step.node_id,
							'iteration', step.iteration,
							'status', step.status,
							'outputs', step.outputs,
							'error', step.error,
							'createdAt', step.created_at,
							'updatedAt', step.updated_at
						)
						ORDER BY step.created_at ASC, step.node_id ASC, step.iteration ASC
					) FILTER (WHERE step.id IS NOT NULL),
					'[]'
				)`,
				'steps',
			)
			.leftJoin(this.steps.metadata.tableName, 'step', 'step.execution_id = execution.id')
			.groupBy('execution.id')
			.getRawOne();
		if (!row) throw new ExecutionNotFoundError(id);

		const { steps, ...execution } = row;
		return { ...execution, steps: steps.map(toStepView) };
	}

	private selectExecution(id: string): SelectQueryBuilder<WorkflowExecution> {
		return this.executions
			.createQueryBuilder('execution')
			.select('execution.id', 'id')
			.addSelect('execution.workflow_id', 'workflowId')
			.addSelect('execution.status', 'status')
			.addSelect('execution.mode', 'mode')
			.addSelect('execution.graph', 'graph')
			.addSelect('execution.workflow', 'workflow')
			.addSelect('execution.created_at', 'createdAt')
			.addSelect('execution.updated_at', 'updatedAt')
			.addSelect('execution.finished_at', 'finishedAt')
			.where('execution.id = :id', { id });
	}
}

function toStepView(step: StepJson): StepView {
	return { ...step, createdAt: new Date(step.createdAt), updatedAt: new Date(step.updatedAt) };
}
