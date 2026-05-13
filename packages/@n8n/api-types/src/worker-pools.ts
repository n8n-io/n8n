export type ExecutionPoolType = 'production' | 'manual' | 'evaluation';

export type WorkerPoolDefaults = Record<ExecutionPoolType, string>;

export type WorkerPoolsResponse = {
	pools: string[];
	defaults: WorkerPoolDefaults;
};
