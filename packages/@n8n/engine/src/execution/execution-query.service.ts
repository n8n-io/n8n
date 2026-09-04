import type {
	ExecutionViewStore,
	ExecutionView,
	ExecutionWithStepsView,
} from './execution-view-store';

/**
 * Read path for executions and their steps: the seam between the HTTP layer
 * and the store for read-side concerns (pagination, projection, ...) that
 * don't belong in either.
 */
export class ExecutionQueryService {
	constructor(private readonly viewStore: ExecutionViewStore) {}

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
