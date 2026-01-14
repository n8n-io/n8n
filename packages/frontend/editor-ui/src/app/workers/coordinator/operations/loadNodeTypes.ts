import type { CoordinatorState } from '../types';
import { ensureInitialized, initialize } from './query';
import { getActiveDataWorker } from './tabs';

/**
 * Load node types from the server (routes to active tab's worker)
 *
 * @param state - The coordinator state
 * @param baseUrl - The base URL for API requests
 */
export async function loadNodeTypes(state: CoordinatorState, baseUrl: string): Promise<void> {
	const worker = getActiveDataWorker(state);
	if (!worker) {
		throw new Error('[Coordinator] No active data worker available');
	}

	await ensureInitialized(state, async () => await initialize(state));

	await worker.loadNodeTypes(baseUrl);
}
