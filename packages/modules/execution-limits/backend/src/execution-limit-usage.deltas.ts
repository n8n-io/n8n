import { executionLimitDelta, isLedgerFact } from '@n8n/backend-services';
import type { ExecutionLedgerEntityType, ExecutionLedgerRow } from '@n8n/db';

/** Counts to add to the instance row of one UTC day and entity type. */
export type InstanceUsageDelta = {
	/** UTC day as `YYYY-MM-DD`. */
	day: string;
	entityType: ExecutionLedgerEntityType;
	startedCount: number;
	blockedCount: number;
};

/** Counts to add to the row of one project. */
export type ProjectUsageDelta = InstanceUsageDelta & { projectId: string };

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
		const projectId = delta === 1 ? row.projectId : blockedProjectIdOf(row);
		const { entityType } = row;
		const day = row.occurredAt.toISOString().slice(0, 10);
		const zero = { day, entityType, startedCount: 0, blockedCount: 0 };

		const projectKey = `${projectId}|${day}|${entityType}`;
		const projectDelta = projects.get(projectKey) ?? { projectId, ...zero };
		projectDelta[column] += 1;
		projects.set(projectKey, projectDelta);

		const instanceKey = `${day}|${entityType}`;
		const instanceDelta = instance.get(instanceKey) ?? { ...zero };
		instanceDelta[column] += 1;
		instance.set(instanceKey, instanceDelta);
	}

	return { projects: sortedByKey(projects), instance: sortedByKey(instance) };
}

// Concurrent writers that lock rows in the same order cannot deadlock.
function sortedByKey<T>(deltas: Map<string, T>): T[] {
	return [...deltas.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, d]) => d);
}

/** The project that counted the start of a blocked run. */
function blockedProjectIdOf(row: ExecutionLedgerRow): string {
	return row.projectId;
}
