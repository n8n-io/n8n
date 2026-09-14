/**
 * Retries the given assertion until it passes or the timeout is reached
 *
 * The assertion may be async. `try/catch` around a bare call sees a synchronous throw only, so a
 * rejected promise has to be awaited before the retry decides — otherwise the first failure ends
 * the whole call.
 *
 * @example
 * await retry(
 *   () => expect(screen.getByText('Hello')).toBeInTheDocument()
 * );
 */
export const retry = async (
	// `unknown`, not `Promise<void> | void`: a caller writes
	// `() => expect(x).toBeInTheDocument()`, and that matcher returns an element. The old `() => void`
	// accepted it through TypeScript's void-return allowance, which a union does not extend.
	assertion: () => unknown,
	{ interval = 20, timeout = 1000 } = {},
) => {
	return await new Promise((resolve, reject) => {
		const startTime = Date.now();

		const tryAgain = () => {
			setTimeout(() => {
				void (async () => {
					try {
						resolve(await assertion());
					} catch (error) {
						if (Date.now() - startTime > timeout) {
							reject(error instanceof Error ? error : new Error(String(error)));
						} else {
							tryAgain();
						}
					}
				})();
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
