import type { ExecutionViewStore, ExecutionView, StepView } from './execution-view-store';

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

	/** Every step of the execution, oldest first. `[]` if it has none yet. */
	async getSteps(id: string): Promise<StepView[]> {
		return await this.viewStore.loadStepViews(id);
	}
}
