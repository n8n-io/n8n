export type QueueMetricsEventMap = {
	'job-counts-updated': {
		active: number;
		completed: number;
		failed: number;
		waiting: number;
	};
};
