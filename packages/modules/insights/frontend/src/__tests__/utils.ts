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
