import type { CannedMetric, CannedMetricKey } from './evaluation.constants';

export interface CheckFilterContext {
	// Whether the evaluated slice's root (end) node can accept tool connections.
	sliceCanHaveTools: boolean;
	// Extend with more workflow-derived facts as new filters are added.
}

// A filter returns true to KEEP the check. Add new predicates to this array.
export type CheckFilter = (metric: CannedMetric, ctx: CheckFilterContext) => boolean;

export const CHECK_FILTERS: CheckFilter[] = [
	// Tool Usage is only meaningful when the evaluated node can use tools.
	(metric, ctx) => metric.key !== ('toolsUsed' satisfies CannedMetricKey) || ctx.sliceCanHaveTools,
];

export function getVisibleChecks(
	metrics: readonly CannedMetric[],
	ctx: CheckFilterContext,
): CannedMetric[] {
	return metrics.filter((metric) => CHECK_FILTERS.every((filter) => filter(metric, ctx)));
}
