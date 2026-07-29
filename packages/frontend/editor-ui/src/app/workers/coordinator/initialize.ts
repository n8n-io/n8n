import { getRequiredActiveDataWorker } from './tabs';
import type { CoordinatorState } from './types';

/**
 * Ensure the coordinator is initialized before performing operations
 *
 * Uses the stored version from state if already initialized, otherwise
 * requires the version to be provided.
 *
 * @param state - The coordinator state
 */
export async function ensureInitialized(state: CoordinatorState): Promise<void> {
	if (!state.initialized) {
		if (!state.version) {
			throw new Error(
				'[Coordinator] Cannot auto-initialize without version. Call initialize({ version }) first.',
			);
		}
		await initialize(state, { version: state.version });
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
 */
export async function initialize(
	state: CoordinatorState,
	{ version }: { version: string },
): Promise<void> {
	console.log('[Coordinator] Initialize requested');

	// Store the version in state for future ensureInitialized calls
	state.version = version;

	if (state.initialized) {
		console.log('[Coordinator] Already initialized');
		return;
	}

	const worker = getRequiredActiveDataWorker(state);
	await worker.initialize({ version });
	state.initialized = true;
	console.log('[Coordinator] Initialization complete');
}
