type RetryFn = () => boolean | Promise<boolean>;

/**
 * A utility that retries a function every `interval` milliseconds
 * until the function returns true or the maximum number of retries is reached.
 *
 * @param fn - A function that returns a boolean or a Promise resolving to a boolean.
 * @param interval - The time interval (in milliseconds) between each retry. Defaults to 1000.
 * @param maxRetries - The maximum number of retry attempts. Defaults to 3.
 * @param backoff - The backoff strategy to use: 'linear', 'exponential', or null.
 * @returns {Promise<boolean>} - A promise that resolves to:
 *   - true: If the function returns true before reaching maxRetries.
 *   - false: If the function never returns true or if an error occurs.
 */
export async function retry(
	fn: RetryFn,
	interval: number = 1000,
	maxRetries: number = 3,
	backoff: 'exponential' | 'linear' | null = 'linear',
): Promise<boolean> {
	let attempt = 0;

	while (attempt < maxRetries) {
		attempt++;
		try {
			const result = await fn();
			if (result) {
				return true;
			}
		} catch (error) {
			console.error('Error during retry:', error);
			throw error;
		}

		// Wait for the specified interval before the next attempt, if any attempts remain.
		if (attempt < maxRetries) {
			let computedInterval = interval;

			if (backoff === 'linear') {
				computedInterval = interval * attempt;
			} else if (backoff === 'exponential') {
				computedInterval = Math.pow(2, attempt - 1) * interval;
				computedInterval = Math.min(computedInterval, 30000); // Cap the maximum interval to 30 seconds
			}

			await new Promise<void>((resolve) => setTimeout(resolve, computedInterval));
		}
	}

	return false;
}
