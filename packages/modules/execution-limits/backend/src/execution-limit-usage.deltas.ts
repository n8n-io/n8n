import { executionLimitDelta, isLedgerFact } from '@n8n/backend-services';
import type { ExecutionLedgerEntityType, ExecutionLedgerRow } from '@n8n/db';

import { toUtcDay } from './execution-usage-period';

/** Counts to add to the instance row of one UTC day and entity type. */
export type InstanceUsageDelta = {
	/** UTC day as `YYYY-MM-DD`. */
	day: string;
	entityType: ExecutionLedgerEntityType;
	startedCount: number;
	blockedCount: number;
};

/** Counts to add to the row of one project. */
type ProjectUsageDelta = InstanceUsageDelta & { projectId: string };

export type UsageDeltas = {
	projects: ProjectUsageDelta[];
	instance: InstanceUsageDelta[];
};

/**
 * Sums ledger rows into one delta for each project, UTC day and entity type, and one
 * instance delta for each UTC day and entity type. Each list has unique, sorted keys.
 */
export function toUsageDeltas(rows: readonly ExecutionLedgerRow[]): UsageDeltas {
	const projects = new Map<string, ProjectUsageDelta>();
	const instance = new Map<string, InstanceUsageDelta>();

	for (const row of rows) {
		if (!isLedgerFact(row)) continue;

		const delta = executionLimitDelta(row);
		if (delta === 0) continue;

		const column = delta === 1 ? 'startedCount' : 'blockedCount';
		const { projectId, entityType } = row;
		const day = toUtcDay(row.occurredAt);
		const zero = () => ({ day, entityType, startedCount: 0, blockedCount: 0 });

		// A run of a workflow with no owner project counts for the instance only.
		if (projectId) {
			const key = `${projectId}|${day}|${entityType}`;
			addOne(projects, key, () => ({ projectId, ...zero() }), column);
		}
		addOne(instance, `${day}|${entityType}`, zero, column);
	}

	return { projects: sortedByKey(projects), instance: sortedByKey(instance) };
}

function addOne<T extends InstanceUsageDelta>(
	deltas: Map<string, T>,
	key: string,
	zero: () => T,
	column: 'startedCount' | 'blockedCount',
): void {
	let delta = deltas.get(key);
	if (!delta) {
		delta = zero();
		deltas.set(key, delta);
	}
	delta[column] += 1;
}

// Concurrent writers that lock rows in the same order cannot deadlock.
function sortedByKey<T>(deltas: Map<string, T>): T[] {
	return [...deltas].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, delta]) => delta);
}
