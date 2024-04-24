/**
 * Benchmarking suites, i.e. `*.suite.ts` files containing benchmarking tasks.
 */
export type Suites = {
	[suiteFilePath: string]: {
		name: string;
		hooks: {
			beforeEachTask?: Callback;
			afterEachTask?: Callback;
		};
		tasks: Task[];
	};
};

/**
 * A benchmarking task, i.e. a single operation whose performance to measure.
 */
export type Task = {
	name: string;
	operation: Callback;
};

export type Callback = () => void | Promise<void>;
