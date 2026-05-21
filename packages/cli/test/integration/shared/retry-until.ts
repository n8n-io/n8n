/**
 * Retries the given assertion until it passes or the timeout is reached
 *
 * @example
 * await retryUntil(
 *   () => expect(service.someState).toBe(true)
 * );
 */
export const retryUntil = async <T>(
	assertion: () => Promise<T> | T,
	{ intervalMs = 200, timeoutMs = 5000 } = {},
): Promise<T> => {
	return await new Promise<T>((resolve, reject) => {
		const startTime = Date.now();

		const tryAgain = () => {
			setTimeout(async () => {
				try {
					resolve(await assertion());
				} catch (error) {
					if (Date.now() - startTime > timeoutMs) {
						reject(error);
					} else {
						tryAgain();
					}
				}
			}, intervalMs);
		};

		tryAgain();
	});
};
