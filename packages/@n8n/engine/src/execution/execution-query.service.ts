import type {
	ExecutionViewStore,
	ExecutionView,
	ExecutionWithStepsView,
	ExecutionListQuery,
} from './execution-view-store';

/**
 * Read path for executions and their steps: the seam between the HTTP layer
 * and the store for read-side concerns (pagination, projection, ...) that
 * don't belong in either.
 */
export class ExecutionQueryService {
	constructor(private readonly viewStore: ExecutionViewStore) {}

	/**
	 * Lists executions matching `query`, one page at a time. Fetches one extra
	 * row over the requested limit, so the last in-page row's own cursor can be
	 * reported as `nextCursor` without a second query.
	 */
	async searchExecutions(query: ExecutionListQuery) {
		const { limit } = query;
		const [rows, total] = await Promise.all([
			this.viewStore.listExecutionViews({ ...query, limit: limit + 1 }),
			query.includeTotal ? this.viewStore.countExecutionViews(query) : undefined,
		]);
		const items = rows.slice(0, limit);
		const last = items.at(-1);
		return {
			items,
			nextCursor: rows.length > limit && last ? { createdAt: last.createdAt, id: last.id } : null,
			...(total !== undefined ? { total } : {}),
		};
	}

	/** @throws {ExecutionNotFoundError} if absent. */
	async getExecution(id: string): Promise<ExecutionView> {
		return await this.viewStore.loadExecutionView(id);
	}

	/**
	 * The execution and every step of it, oldest first. One query, so a settle
	 * between two reads cannot report a status that predates the steps.
	 *
	 * @throws {ExecutionNotFoundError} if absent.
	 */
	async getExecutionWithSteps(id: string): Promise<ExecutionWithStepsView> {
		return await this.viewStore.loadExecutionWithStepsView(id);
	}
}
