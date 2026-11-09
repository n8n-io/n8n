import type { Repository, SelectQueryBuilder } from '@n8n/typeorm';

import type { WorkflowExecution, WorkflowStepExecution } from './entities';
import { parentLinkSql } from './parent-link-columns';
import { UnexpectedError } from '../common';
import { ExecutionNotFoundError } from '../execution/execution-store';
import type {
	ExecutionViewStore,
	ExecutionView,
	ExecutionWithStepsView,
	StepView,
	ExecutionListFilter,
	ExecutionListQuery,
	ExecutionListItemView,
} from '../execution/execution-view-store';

/** The execution row, with its steps aggregated into one column. */
type ExecutionWithStepsRow = ExecutionView & { steps: StepView[] };

const hostMode = (alias: string) => `${alias}.caller_context->>'hostMode'`;

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

		const qb = this.buildListQuery(query)
			.select('execution.id', 'id')
			.addSelect('execution.workflow_id', 'workflowId')
			.addSelect('execution.status', 'status')
			.addSelect('execution.mode', 'mode')
			.addSelect(hostMode('execution'), 'hostMode')
			.addSelect(parentLinkSql('execution'), 'parent')
			.addSelect('execution.created_at', 'createdAt')
			.addSelect('execution.updated_at', 'updatedAt')
			.addSelect('execution.finished_at', 'finishedAt');
		if (query.before) {
			qb.andWhere('(execution.created_at, execution.id) < (:createdAt, :id)', query.before);
		}
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

	private buildListQuery(query: ExecutionListFilter): SelectQueryBuilder<WorkflowExecution> {
		return this.applyFilter(this.executions.createQueryBuilder('execution'), 'execution', query);
	}

	private applyFilter<T extends SelectQueryBuilder<WorkflowExecution>>(
		qb: T,
		alias: string,
		query: ExecutionListFilter,
	): T {
		if (query.workflowIds !== 'all') {
			qb.andWhere(`${alias}.workflow_id = ANY(:workflowIds)`, { workflowIds: query.workflowIds });
		}
		if (query.status) qb.andWhere(`${alias}.status = ANY(:statuses)`, { statuses: query.status });
		if (query.hostMode) {
			qb.andWhere(`${hostMode(alias)} = :hostMode`, { hostMode: query.hostMode });
		}
		if (query.parentExecutionId) {
			qb.andWhere(`${alias}.parent_execution_id = :parentExecutionId`, {
				parentExecutionId: query.parentExecutionId,
			});
		}
		if (query.createdAfter)
			qb.andWhere(`${alias}.created_at >= :createdAfter`, { createdAfter: query.createdAfter });
		if (query.createdBefore)
			qb.andWhere(`${alias}.created_at <= :createdBefore`, { createdBefore: query.createdBefore });
		return qb;
	}

	async loadExecutionView(id: string): Promise<ExecutionView> {
		const row: ExecutionView | undefined = await this.selectExecution(id).getRawOne();
		if (!row) throw new ExecutionNotFoundError(id);
		return row;
	}

	async loadExecutionWithStepsView(id: string): Promise<ExecutionWithStepsView> {
		const row: ExecutionWithStepsRow | undefined = await this.withSteps(
			this.selectExecution(id),
		).getRawOne();
		if (!row) throw new ExecutionNotFoundError(id);
		return row;
	}

	/**
	 * Picks the newest id in a subquery and aggregates only that execution's
	 * steps. Grouping every match and taking one afterwards would cost as much
	 * as the workflow's whole history.
	 */
	async loadLatestExecutionWithStepsView(
		filter: ExecutionListFilter,
	): Promise<ExecutionWithStepsView | undefined> {
		const qb = this.selectExecutionColumns(this.executions.createQueryBuilder('execution'));
		const newest = this.applyFilter(
			qb.subQuery().select('newest.id').from(this.executions.target, 'newest'),
			'newest',
			filter,
		)
			.orderBy('newest.created_at', 'DESC')
			.addOrderBy('newest.id', 'DESC')
			.limit(1);
		const row: ExecutionWithStepsRow | undefined = await this.withSteps(
			qb.where(`execution.id = ${newest.getQuery()}`),
		).getRawOne();
		return row;
	}

	private selectExecution(id: string): SelectQueryBuilder<WorkflowExecution> {
		return this.selectExecutionColumns(this.executions.createQueryBuilder('execution')).where(
			'execution.id = :id',
			{ id },
		);
	}

	private selectExecutionColumns(
		qb: SelectQueryBuilder<WorkflowExecution>,
	): SelectQueryBuilder<WorkflowExecution> {
		return qb
			.select('execution.id', 'id')
			.addSelect('execution.workflow_id', 'workflowId')
			.addSelect('execution.status', 'status')
			.addSelect('execution.mode', 'mode')
			.addSelect(hostMode('execution'), 'hostMode')
			.addSelect('execution.graph', 'graph')
			.addSelect('execution.workflow', 'workflow')
			.addSelect(parentLinkSql('execution'), 'parent')
			.addSelect('execution.created_at', 'createdAt')
			.addSelect('execution.updated_at', 'updatedAt')
			.addSelect('execution.finished_at', 'finishedAt');
	}

	/**
	 * One query, so the status a caller reports cannot predate the steps beside
	 * it. The steps are aggregated rather than joined row-per-step: a left join
	 * repeats every execution column once per step, and both `graph` and
	 * `workflow` are large enough that a long loop would ship them thousands of
	 * times. Grouping by the primary key is what lets the execution columns
	 * survive the aggregate.
	 */
	private withSteps(
		qb: SelectQueryBuilder<WorkflowExecution>,
	): SelectQueryBuilder<WorkflowExecution> {
		return qb
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
			.groupBy('execution.id');
	}
}
