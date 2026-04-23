export const TRACER_NAME = 'n8n-expression-runtime';

export const METRIC_PREFIX = 'n8n_';

export const ATTRIBUTE = {
	EXPRESSION_ENGINE: 'expression.engine',
	EXPRESSION_DURATION_MS: 'expression.duration_ms',
	EXPRESSION_OUTCOME: 'expression.outcome',
	EXPRESSION_ERROR_TYPE: 'expression.error.type',
} as const;

export const DURATION_BUCKETS_MS = [0.1, 0.5, 1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000];
