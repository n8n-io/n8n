export type ExecutionCategory = 'production' | 'manual' | 'evaluation';

export type PoolAssignment = Partial<Record<ExecutionCategory, string>>;

export type WorkerPoolsResponse = {
	pools: string[];
	assignment: PoolAssignment;
};
