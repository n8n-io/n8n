export type MetricCategory =
	| 'default'
	| 'routes'
	| 'cache'
	| 'logs'
	| 'queue'
	| 'webhook'
	| 'workflowExecutionDuration'
	| 'workflowInfo'
	| 'workflowStatistics';

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
