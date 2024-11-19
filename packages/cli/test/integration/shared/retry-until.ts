/**
 * Retries the given assertion until it passes or the timeout is reached
 *
 * @example
 * await retryUntil(
 *   () => expect(service.someState).toBe(true)
 * );
 */
export const retryUntil = async (
	assertion: () => Promise<void> | void,
	{ interval = 20, timeout = 1000 } = {},
) => {
	return await new Promise((resolve, reject) => {
		const startTime = Date.now();

		const tryAgain = () => {
			setTimeout(async () => {
				try {
					resolve(await assertion());
				} catch (error) {
					if (Date.now() - startTime > timeout) {
						reject(error);
					} else {
						tryAgain();
					}
				}
			}, interval);
		};

		tryAgain();
	});
};
