import { getRequiredActiveDataWorker } from './tabs';
import type { CoordinatorState } from './types';

/**
 * Ensure the coordinator is initialized before performing operations
 *
 * @param state - The coordinator state
 */
export async function ensureInitialized(state: CoordinatorState): Promise<void> {
	if (!state.initialized) {
		await initialize(state);
	}
}

/**
 * Initialize the database (routes to active tab's worker)
 *
 * Promise caching is handled by the data worker itself, so concurrent
 * calls are deduplicated at that level. The coordinator just tracks
 * whether it has successfully initialized with the current active worker.
 *
 * @param state - The coordinator state
 */
export async function initialize(state: CoordinatorState): Promise<void> {
	console.log('[Coordinator] Initialize requested');

	if (state.initialized) {
		console.log('[Coordinator] Already initialized');
		return;
	}

	const worker = getRequiredActiveDataWorker(state);
	await worker.initialize();
	state.initialized = true;
	console.log('[Coordinator] Initialization complete');
}
