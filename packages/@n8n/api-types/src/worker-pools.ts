export type ProjectPoolSettingsResponse = {
	/** Pool that all executions in this project route to. `null` = the system default queue. */
	defaultPool: string | null;
	/** Pool names registered by workers in the cluster (read-only context, populates the dropdown). */
	availablePools: string[];
};
