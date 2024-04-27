export type Suites = {
	[key: string]: {
		name: string;
		db: 'sqlite' | 'postgres';
		hooks: {
			beforeEachTask?: Callback;
			afterEachTask?: Callback;
		};
		tasks: Task[];
	};
};

/**
 * Single operation whose execution time to measure repeatedly.
 */
export type Task = {
	name: string;
	operation: Callback;
};

export type Callback = () => void | Promise<void>;
