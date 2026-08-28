/**
 * Retries the given assertion until it passes or the timeout is reached
 *
 * @example
 * await retry(
 *   () => expect(screen.getByText('Hello')).toBeInTheDocument()
 * );
 */
export const retry = async (assertion: () => void, { interval = 20, timeout = 1000 } = {}) => {
	return await new Promise((resolve, reject) => {
		const startTime = Date.now();

		const tryAgain = () => {
			setTimeout(() => {
				try {
					resolve(assertion());
				} catch (error) {
					if (Date.now() - startTime > timeout) {
						reject(error instanceof Error ? error : new Error(String(error)));
					} else {
						tryAgain();
					}
				}
			}, interval);
		};

		tryAgain();
	});
};

export const waitAllPromises = async () => await new Promise((resolve) => setTimeout(resolve));

export type Emitter = (event: string, ...args: unknown[]) => void;
export type Emitters<T extends string> = Record<T, { emit: Emitter }>;

/** Captures the `emit` of a stubbed child so a test can drive it. */
export const useEmitters = <T extends string>() => {
	const emitters = {} as Emitters<T>;
	return {
		emitters,
		addEmitter: (name: T, emitter: Emitter) => {
			emitters[name] = { emit: emitter };
		},
	};
};
