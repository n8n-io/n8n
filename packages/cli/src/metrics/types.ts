export type MetricCategory = 'default' | 'routes' | 'cache' | 'logs' | 'queue';

export type MetricLabel =
	| 'credentialsType'
	| 'nodeType'
	| 'workflowId'
	| 'apiPath'
	| 'apiMethod'
	| 'apiStatusCode';

export type Includes = {
	metrics: Record<MetricCategory, boolean>;
	labels: Record<MetricLabel, boolean>;
};
