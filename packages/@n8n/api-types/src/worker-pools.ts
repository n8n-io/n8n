export type ExecutionCategory = 'production' | 'manual' | 'evaluation';

export type PoolAssignment = Partial<Record<ExecutionCategory, string>>;

export type WorkerPoolsResponse = {
	pools: string[];
	assignment: PoolAssignment;
};

export type ProjectPoolSettingsResponse = {
	assignment: PoolAssignment;
	allowedPools: string[];
	/** Pool names registered by workers in the cluster (read-only context). */
	availablePools: string[];
	/** Instance-level pool assignment, shown in the UI as the "Inherit from instance" fallback (read-only context). */
	instanceDefaults: PoolAssignment;
};
