import type { Repository, SelectQueryBuilder } from '@n8n/typeorm';

import type { WorkflowExecution, WorkflowStepExecution } from './entities';
import { UnexpectedError } from '../common';
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

const HOST_MODE = "execution.caller_context->>'hostMode'";

/**
 * The cursor compares `(created_at, id)`, so it only walks that order. A
 * status-bucket sort puts newer rows behind the top bucket, and the next page
 * drops every one of them: they sort after the cursor row but were never
 * reported. Callers pick one or the other. The API rejects the pair with a 400;
 * this holds the rule for every other caller.
 */
function assertPageableOrder(query: ExecutionListQuery): void {
	if (query.before && query.order?.top) {
		throw new UnexpectedError('An execution cursor cannot page a status-first sort');
	}
}

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
		assertPageableOrder(query);

		const top = query.order?.top;
		if (!top) return await this.selectListPage(this.buildListQuery(query), query).getRawMany();

		// A sort on a CASE expression reads every row. Each bucket instead reads
		// one index-ordered page, and only the two pages are merged.
		const topPage = this.selectListPage(
			this.buildListQuery(query).andWhere('execution.status = :top', { top }),
			query,
		);
		const restPage = this.selectListPage(
			this.buildListQuery(query).andWhere('execution.status <> :top', { top }),
			query,
		);
		return await this.executions.manager
			.createQueryBuilder()
			.select('page.*')
			.from(`((${topPage.getQuery()}) UNION ALL (${restPage.getQuery()}))`, 'page')
			.setParameters(restPage.getParameters())
			.orderBy('(CASE WHEN page.status = :top THEN 0 ELSE 1 END)')
			.addOrderBy('page."createdAt"', 'DESC')
			.addOrderBy('page.id', 'DESC')
			.limit(query.limit)
			.getRawMany<ExecutionListItemView>();
	}

	private selectListPage(
		qb: SelectQueryBuilder<WorkflowExecution>,
		query: ExecutionListQuery,
	): SelectQueryBuilder<WorkflowExecution> {
		qb.select('execution.id', 'id')
			.addSelect('execution.workflow_id', 'workflowId')
			.addSelect('execution.status', 'status')
			.addSelect('execution.mode', 'mode')
			.addSelect(HOST_MODE, 'hostMode')
			.addSelect('execution.created_at', 'createdAt')
			.addSelect('execution.updated_at', 'updatedAt')
			.addSelect('execution.finished_at', 'finishedAt');
		if (query.before) {
			qb.andWhere('(execution.created_at, execution.id) < (:createdAt, :id)', query.before);
		}
		return qb
			.orderBy('execution.created_at', 'DESC')
			.addOrderBy('execution.id', 'DESC')
			.limit(query.limit);
	}

	async countExecutionViews(query: ExecutionListQuery): Promise<number> {
		// Not `getCount()`: its COUNT(DISTINCT id) sorts ids that a join-free query cannot repeat.
		const row = await this.buildListQuery(query)
			.select('COUNT(*)', 'count')
			.getRawOne<{ count: string }>();
		return Number(row?.count ?? 0);
	}

	private buildListQuery(query: ExecutionListQuery): SelectQueryBuilder<WorkflowExecution> {
		const qb = this.executions.createQueryBuilder('execution');
		if (query.workflowIds !== 'all') {
			qb.andWhere('execution.workflow_id = ANY(:workflowIds)', { workflowIds: query.workflowIds });
		}
		if (query.status) qb.andWhere('execution.status = ANY(:statuses)', { statuses: query.status });
		if (query.hostMode) {
			qb.andWhere(`${HOST_MODE} = :hostMode`, { hostMode: query.hostMode });
		}
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
			.addSelect(HOST_MODE, 'hostMode')
			.addSelect('execution.graph', 'graph')
			.addSelect('execution.workflow', 'workflow')
			.addSelect('execution.created_at', 'createdAt')
			.addSelect('execution.updated_at', 'updatedAt')
			.addSelect('execution.finished_at', 'finishedAt')
			.where('execution.id = :id', { id });
	}
}
