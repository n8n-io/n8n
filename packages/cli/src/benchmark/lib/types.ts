/**
 * Benchmarking suites, i.e. `*.tasks.ts` files containing benchmarking tasks.
 */
export type Suites = {
	[suiteFilepath: string]: {
		name: string;
		hooks: {
			beforeEach?: Callback;
			afterEach?: Callback;
		};
		tasks: Task[];
	};
};

/**
 * A benchmarking task, i.e. a single operation whose performance to measure.
 */
export type Task = {
	description: string;
	operation: Callback;
};

export type Callback = () => void | Promise<void>;
