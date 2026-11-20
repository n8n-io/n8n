import type { UsagePeriod } from './execution-usage-period';

export type UsageScope = { type: 'instance' } | { type: 'project'; projectId: string };

/** The sum of the usage rows of one scope over a range of days. */
export type UsageTotals = {
	startedCount: number;
	blockedCount: number;
	/** `null` when the range has no row. */
	lastFoldAt: Date | null;
};

export type ExecutionUsage = {
	scope: UsageScope;
	period: UsagePeriod;
	/** Workflow executions that count toward a limit: started minus blocked. */
	executions: number;
	/** Time of the last fold that changed this count. `null` when nothing is counted. */
	lastFoldAt: Date | null;
};

export const NO_USAGE: UsageTotals = { startedCount: 0, blockedCount: 0, lastFoldAt: null };

/** Adds the totals of the parts of one period. The cached read and the database read both use it. */
export function toUsage(
	scope: UsageScope,
	period: UsagePeriod,
	...parts: UsageTotals[]
): ExecutionUsage {
	let counted = 0;
	let lastFoldAt: Date | null = null;
	for (const part of parts) {
		counted += part.startedCount - part.blockedCount;
		if (part.lastFoldAt && (!lastFoldAt || part.lastFoldAt > lastFoldAt)) {
			lastFoldAt = part.lastFoldAt;
		}
	}

	// A run that starts in one period and is blocked in the next makes the new period negative.
	return { scope, period, executions: Math.max(0, counted), lastFoldAt };
}
