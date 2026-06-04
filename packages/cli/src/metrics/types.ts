export type MetricCategory =
	| 'default'
	| 'routes'
	| 'cache'
	| 'logs'
	| 'queue'
	| 'workflowExecutionDuration'
	| 'workflowStatistics'
	| 'executionData';

export type MetricLabel =
	| 'credentialsType'
	| 'nodeType'
	| 'workflowId'
	| 'workflowName'
	| 'apiPath'
	| 'apiMethod'
	| 'apiStatusCode';

export type Includes = {
	metrics: Record<MetricCategory, boolean>;
	labels: Record<MetricLabel, boolean>;
};
