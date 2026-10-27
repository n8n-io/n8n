export type WorkflowStatisticsData<T> = {
	productionSuccess: T;
	productionError: T;
	manualSuccess: T;
	manualError: T;
};
