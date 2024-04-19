export type Suites = {
	[suiteFilepath: string]: {
		hooks: Partial<{ beforeEach: () => Promise<void> }>;
		tasks: Task[];
	};
};

/** A benchmarking task, i.e. a single operation whose performance to measure. */
export type Task = {
	description: string;
	operation: () => Promise<void>;
};

export type Callback = () => void | Promise<void>;
