/**
 * Active Worker Utilities
 *
 * This module provides utilities for creating coordinator operations
 * that route to the active tab's data worker.
 */

import type * as Comlink from 'comlink';
import type { DataWorkerApi } from '../data/worker';
import type { CoordinatorState } from './types';
import { ensureInitialized } from './initialize';
import { getRequiredActiveDataWorker } from './tabs';

/**
 * Creates a function that ensures initialization and routes to the active worker.
 *
 * The order of operations is:
 * 1. Ensure coordinator is initialized (calls initialize if needed)
 * 2. Get the active data worker (AFTER initialization, as active tab may change)
 * 3. Execute the provided action on the worker
 *
 * @param action - Callback that receives the worker and performs the operation
 * @returns A function that handles init/routing, then calls the action
 */
export function withActiveWorker<TArgs extends unknown[], TReturn>(
	action: (worker: Comlink.Remote<DataWorkerApi>, ...args: TArgs) => Promise<TReturn>,
): (state: CoordinatorState, ...args: TArgs) => Promise<TReturn> {
	return async (state: CoordinatorState, ...args: TArgs): Promise<TReturn> => {
		await ensureInitialized(state);
		const worker = getRequiredActiveDataWorker(state);
		return await action(worker, ...args);
	};
}
