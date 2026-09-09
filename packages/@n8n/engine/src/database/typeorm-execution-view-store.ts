import type { Repository, SelectQueryBuilder } from '@n8n/typeorm';

import type { WorkflowExecution, WorkflowStepExecution } from './entities';
import { ExecutionNotFoundError } from '../execution/execution-store';
import type {
	ExecutionViewStore,
	ExecutionView,
	ExecutionWithStepsView,
	StepView,
	ExecutionListQuery,
	ExecutionListItemView,
} from '../execution/execution-view-store';

/** The execution row, with its steps aggregated into one column. */
type ExecutionWithStepsRow = ExecutionView & { steps: StepView[] };

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

	async listExecutionViews(query: ExecutionListQuery): Promise<ExecutionListItemView[]> {
		const qb = this.buildListQuery(query)
			.select('execution.id', 'id')
			.addSelect('execution.workflow_id', 'workflowId')
			.addSelect('execution.status', 'status')
			.addSelect('execution.mode', 'mode')
			.addSelect('execution.created_at', 'createdAt')
			.addSelect('execution.updated_at', 'updatedAt')
			.addSelect('execution.finished_at', 'finishedAt');
		if (query.before) {
			qb.andWhere('(execution.created_at, execution.id) < (:createdAt, :id)', query.before);
		}
		// A sort order other than the cursor's own (created_at, id) can skip or
		// repeat rows at the page boundary if a row's status changes after the
		// fact. Same limitation as the control plane's equivalent query.
		if (query.order?.top) {
			qb.orderBy(`(CASE WHEN execution.status = '${query.order.top}' THEN 0 ELSE 1 END)`);
		}
		return await qb
			.addOrderBy('execution.created_at', 'DESC')
			.addOrderBy('execution.id', 'DESC')
			.limit(query.limit)
			.getRawMany<ExecutionListItemView>();
	}

	async countExecutionViews(query: ExecutionListQuery): Promise<number> {
		return await this.buildListQuery(query).getCount();
	}

	private buildListQuery(query: ExecutionListQuery): SelectQueryBuilder<WorkflowExecution> {
		const qb = this.executions.createQueryBuilder('execution');
		if (query.workflowIds !== 'all') {
			qb.andWhere('execution.workflow_id = ANY(:workflowIds)', { workflowIds: query.workflowIds });
		}
		if (query.status) qb.andWhere('execution.status = ANY(:statuses)', { statuses: query.status });
		if (query.mode) qb.andWhere('execution.mode = :mode', { mode: query.mode });
		if (query.createdAfter)
			qb.andWhere('execution.created_at >= :createdAfter', { createdAfter: query.createdAfter });
		if (query.createdBefore)
			qb.andWhere('execution.created_at <= :createdBefore', { createdBefore: query.createdBefore });
		return qb;
	}

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
		return row;
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
