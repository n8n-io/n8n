import type { SelectQueryBuilder } from '@n8n/typeorm';

import { fromSqliteDatetime, fromSqliteJson, toSqliteDatetime } from './sqlite-values';
import type { WorkflowExecution } from '../entities';
import { TypeOrmExecutionViewStore } from '../typeorm-execution-view-store';
import type {
	ExecutionListFilter,
	ExecutionListItemView,
	ExecutionListQuery,
	ExecutionView,
	ExecutionWithStepsView,
	StepView,
} from '../../execution/execution-view-store';

const hostMode = (alias: string) => `${alias}.caller_context->>'hostMode'`;

/** The parent link as one JSON object; `json('true')` keeps `awaited` a boolean. */
function parentLinkSql(alias: string): string {
	return `CASE WHEN ${alias}.parent_execution_id IS NULL THEN NULL ELSE json_object(
		'executionId', ${alias}.parent_execution_id,
		'stepId', ${alias}.parent_step_id,
		'awaited', CASE WHEN ${alias}.parent_awaited THEN json('true') ELSE json('false') END
	) END`;
}

/**
 * `ExecutionViewStore` on SQLite. The queries are the parent's, with the
 * Postgres-only pieces swapped: `ANY` becomes `IN`, the JSON aggregates use
 * SQLite's names, and timestamps in filters and cursors are put into the
 * stored text format so they compare in time order. Raw rows come back with
 * JSON as text and timestamps as text, so each read hydrates them.
 */
export class SqliteExecutionViewStore extends TypeOrmExecutionViewStore {
	async listExecutionViews(query: ExecutionListQuery): Promise<ExecutionListItemView[]> {
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
			if (query.order?.top) {
				// Same rule as the parent: the cursor only walks the plain order.
				await super.listExecutionViews(query);
			}
			qb.andWhere('(execution.created_at, execution.id) < (:createdAt, :id)', {
				createdAt: toSqliteDatetime(query.before.createdAt),
				id: query.before.id,
			});
		}
		if (query.order?.top) {
			qb.orderBy(`(CASE WHEN execution.status = '${query.order.top}' THEN 0 ELSE 1 END)`);
		}
		const rows = await qb
			.addOrderBy('execution.created_at', 'DESC')
			.addOrderBy('execution.id', 'DESC')
			.limit(query.limit)
			.getRawMany<RawListItem>();
		return rows.map(hydrateListItem);
	}

	protected applyFilter<T extends SelectQueryBuilder<WorkflowExecution>>(
		qb: T,
		alias: string,
		query: ExecutionListFilter,
	): T {
		if (query.workflowIds !== 'all') {
			qb.andWhere(`${alias}.workflow_id IN (:...workflowIds)`, { workflowIds: query.workflowIds });
		}
		if (query.status) qb.andWhere(`${alias}.status IN (:...statuses)`, { statuses: query.status });
		if (query.hostMode) {
			qb.andWhere(`${hostMode(alias)} = :hostMode`, { hostMode: query.hostMode });
		}
		if (query.parentExecutionId) {
			qb.andWhere(`${alias}.parent_execution_id = :parentExecutionId`, {
				parentExecutionId: query.parentExecutionId,
			});
		}
		if (query.hasParent !== undefined) {
			qb.andWhere(`${alias}.parent_execution_id IS ${query.hasParent ? 'NOT NULL' : 'NULL'}`);
		}
		if (query.createdAfter) {
			qb.andWhere(`${alias}.created_at >= :createdAfter`, {
				createdAfter: toSqliteDatetime(query.createdAfter),
			});
		}
		if (query.createdBefore) {
			qb.andWhere(`${alias}.created_at <= :createdBefore`, {
				createdBefore: toSqliteDatetime(query.createdBefore),
			});
		}
		return qb;
	}

	async loadExecutionView(id: string): Promise<ExecutionView> {
		return hydrateExecution(await super.loadExecutionView(id));
	}

	async loadExecutionWithStepsView(id: string): Promise<ExecutionWithStepsView> {
		return hydrateExecutionWithSteps(await super.loadExecutionWithStepsView(id));
	}

	async loadLatestExecutionWithStepsView(
		filter: ExecutionListFilter,
	): Promise<ExecutionWithStepsView | undefined> {
		const row = await super.loadLatestExecutionWithStepsView(filter);
		return row === undefined ? undefined : hydrateExecutionWithSteps(row);
	}

	protected selectExecutionColumns(
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

	protected withSteps(
		qb: SelectQueryBuilder<WorkflowExecution>,
	): SelectQueryBuilder<WorkflowExecution> {
		// `json(step.outputs)` embeds the stored text as JSON rather than as a
		// string. No ORDER BY inside the aggregate: the sorter drops the JSON
		// subtype and each object would land as a string. The reader sorts.
		return qb
			.addSelect(
				`COALESCE(
					json_group_array(
						json_object(
							'id', step.id,
							'nodeId', step.node_id,
							'iteration', step.iteration,
							'status', step.status,
							'outputs', json(step.outputs),
							'error', json(step.error),
							'createdAt', step.created_at,
							'updatedAt', step.updated_at
						)
					) FILTER (WHERE step.id IS NOT NULL),
					'[]'
				)`,
				'steps',
			)
			.leftJoin(this.steps.metadata.tableName, 'step', 'step.execution_id = execution.id')
			.groupBy('execution.id');
	}
}

type RawListItem = Omit<
	ExecutionListItemView,
	'parent' | 'createdAt' | 'updatedAt' | 'finishedAt'
> & {
	parent: string | null;
	createdAt: string;
	updatedAt: string;
	finishedAt: string | null;
};

function hydrateListItem(row: RawListItem): ExecutionListItemView {
	return {
		...row,
		parent: fromSqliteJson<NonNullable<ExecutionListItemView['parent']>>(row.parent),
		createdAt: fromSqliteDatetime(row.createdAt) as Date,
		updatedAt: fromSqliteDatetime(row.updatedAt) as Date,
		finishedAt: fromSqliteDatetime(row.finishedAt),
	};
}

/** What the raw query returns before hydration: JSON and timestamps as text. */
type RawExecution = Omit<ExecutionView, 'graph' | 'workflow' | 'parent'> & {
	graph: string | ExecutionView['graph'];
	workflow: string | ExecutionView['workflow'];
	parent: string | ExecutionView['parent'];
};

function hydrateExecution(view: ExecutionView): ExecutionView {
	const row: RawExecution = view;
	return {
		...row,
		graph: fromSqliteJson<ExecutionView['graph']>(row.graph) as ExecutionView['graph'],
		workflow: fromSqliteJson<ExecutionView['workflow']>(row.workflow) as ExecutionView['workflow'],
		parent: fromSqliteJson<NonNullable<ExecutionView['parent']>>(row.parent),
		createdAt: fromSqliteDatetime(row.createdAt) as Date,
		updatedAt: fromSqliteDatetime(row.updatedAt) as Date,
		finishedAt: fromSqliteDatetime(row.finishedAt),
	};
}

function hydrateExecutionWithSteps(row: ExecutionWithStepsView): ExecutionWithStepsView {
	const steps = fromSqliteJson<StepView[]>(row.steps as unknown as string) ?? [];
	const byAge = (a: StepView, b: StepView) =>
		a.createdAt.localeCompare(b.createdAt) ||
		a.nodeId.localeCompare(b.nodeId) ||
		a.iteration - b.iteration;
	return {
		...hydrateExecution(row),
		steps: steps.sort(byAge).map((step) => ({
			...step,
			createdAt: (fromSqliteDatetime(step.createdAt) as Date).toISOString(),
			updatedAt: (fromSqliteDatetime(step.updatedAt) as Date).toISOString(),
		})),
	};
}
