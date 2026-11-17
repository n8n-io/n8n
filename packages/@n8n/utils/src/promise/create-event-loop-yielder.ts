import { sleep } from '../sleep';

/**
 * Returns a function that waits for the next event loop turn when at least
 * `maxBlockMs` have passed since its last wait, so timers and I/O can run.
 *
 * @throws {Error} when `maxBlockMs` is not a finite number of at least 0
 */
export function createEventLoopYielder(maxBlockMs = 50): () => Promise<void> {
	if (!Number.isFinite(maxBlockMs) || maxBlockMs < 0) {
		throw new Error('maxBlockMs must be a finite number of at least 0');
	}

	let lastYieldAt = performance.now();
	return async () => {
		if (performance.now() - lastYieldAt >= maxBlockMs) {
			await sleep(0);
			lastYieldAt = performance.now();
		}
	};
}
