export interface MetricDef {
	name: string;
	kind: 'counter' | 'gauge' | 'histogram';
	labels: readonly string[];
	help: string;
}

export const EXPRESSION_METRICS = {
	evaluationDuration: {
		name: 'expression.evaluation.duration_seconds',
		kind: 'histogram',
		labels: ['status', 'type'],
		help: 'Duration of VM-based expression evaluation in seconds.',
	},
	codeCacheHit: {
		name: 'expression.code_cache.hit',
		kind: 'counter',
		labels: [],
		help: 'Expression code cache hits.',
	},
	codeCacheMiss: {
		name: 'expression.code_cache.miss',
		kind: 'counter',
		labels: [],
		help: 'Expression code cache misses.',
	},
	codeCacheEviction: {
		name: 'expression.code_cache.eviction',
		kind: 'counter',
		labels: [],
		help: 'Expression code cache evictions.',
	},
	codeCacheSize: {
		name: 'expression.code_cache.size',
		kind: 'gauge',
		labels: [],
		help: 'Current expression code cache size.',
	},
	poolAcquired: {
		name: 'expression.pool.acquired',
		kind: 'counter',
		labels: [],
		help: 'Bridges acquired from the expression pool.',
	},
	poolReplenishFailed: {
		name: 'expression.pool.replenish_failed',
		kind: 'counter',
		labels: [],
		help: 'Failed pool bridge replenishments.',
	},
	poolScaledUp: {
		name: 'expression.pool.scaled_up',
		kind: 'counter',
		labels: [],
		help: 'Expression pool scaled up from idle.',
	},
	poolScaledToZero: {
		name: 'expression.pool.scaled_to_zero',
		kind: 'counter',
		labels: [],
		help: 'Expression pool scaled to zero after inactivity.',
	},
} as const satisfies Record<string, MetricDef>;

export type ExpressionMetricKey = keyof typeof EXPRESSION_METRICS;
export type ExpressionMetricDef = (typeof EXPRESSION_METRICS)[ExpressionMetricKey];
