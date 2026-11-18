import { Service } from '@n8n/di';
import pLimit from 'p-limit';

/**
 * Each run starts a Vitest process that loads the n8n backend. A change to a
 * sub-workflow can start a run for each caller at once, so this queue limits
 * how many of these runs are in progress together.
 */
const MAX_PARALLEL_RUNS = 2;

@Service()
export class WorkflowTestRunQueue {
	private readonly limit = pLimit(MAX_PARALLEL_RUNS);

	async add<T>(run: () => Promise<T>): Promise<T> {
		return await this.limit(run);
	}
}
