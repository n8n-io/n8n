export const TRACER_NAME = 'n8n-expression-runtime';

export const ATTRIBUTE = {
	EXPRESSION_ENGINE: 'expression.engine',
	EXPRESSION_DURATION_SECONDS: 'expression.duration_seconds',
	EXPRESSION_OUTCOME: 'expression.outcome',
	EXPRESSION_ERROR_TYPE: 'expression.error.type',
} as const;

export const DURATION_BUCKETS_SECONDS = [
	0.0001, 0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 5,
];
