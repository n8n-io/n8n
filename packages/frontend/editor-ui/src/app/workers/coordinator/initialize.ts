import { getRequiredActiveDataWorker } from './tabs';
import type { CoordinatorState } from './types';

/**
 * Ensure the coordinator is initialized before performing operations
 *
 * Uses the stored version and baseUrl from state if already initialized,
 * otherwise requires them to be provided via initialize() first.
 *
 * @param state - The coordinator state
 */
export async function ensureInitialized(state: CoordinatorState): Promise<void> {
	if (!state.initialized) {
		if (!state.version || !state.baseUrl) {
			throw new Error(
				'[Coordinator] Cannot auto-initialize without version and baseUrl. Call initialize({ version, baseUrl }) first.',
			);
		}
		await initialize(state, { version: state.version, baseUrl: state.baseUrl });
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
 * @param options.version - The current n8n version from settings
 * @param options.baseUrl - The base URL for REST API calls (e.g., http://localhost:5678)
 */
export async function initialize(
	state: CoordinatorState,
	{ version, baseUrl }: { version: string; baseUrl: string },
): Promise<void> {
	// Store the version and baseUrl in state
	state.version = version;
	state.baseUrl = baseUrl;

	if (state.initialized) {
		return;
	}

	const worker = getRequiredActiveDataWorker(state);
	await worker.initialize({ version });
	state.initialized = true;
}
