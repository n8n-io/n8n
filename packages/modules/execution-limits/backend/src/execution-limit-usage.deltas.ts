import { executionLimitDelta, isLedgerFact } from '@n8n/backend-services';
import type { ExecutionLedgerEntityType, ExecutionLedgerRow } from '@n8n/db';

import { EXECUTION_LIMIT_USAGE_INSTANCE_SCOPE_ID } from './execution-limits.types';

/** Counts to add to one usage row. */
export type UsageDelta = {
	/** A project ID, or `EXECUTION_LIMIT_USAGE_INSTANCE_SCOPE_ID` for the instance total. */
	projectId: string;
	/** UTC day as `YYYY-MM-DD`. */
	day: string;
	entityType: ExecutionLedgerEntityType;
	startedCount: number;
	blockedCount: number;
};

/**
 * Sums ledger rows into one delta for each project, UTC day and entity type, plus the
 * instance total. The result has unique keys in a stable order.
 */
export function toUsageDeltas(rows: readonly ExecutionLedgerRow[]): UsageDelta[] {
	const deltas = new Map<string, UsageDelta>();

	for (const row of rows) {
		if (!isLedgerFact(row)) continue;

		const delta = executionLimitDelta(row);
		if (delta === 0) continue;

		const column = delta === 1 ? 'startedCount' : 'blockedCount';
		const projectId = delta === 1 ? row.projectId : blockedProjectIdOf(row);
		const day = row.occurredAt.toISOString().slice(0, 10);

		for (const scopeId of [projectId, EXECUTION_LIMIT_USAGE_INSTANCE_SCOPE_ID]) {
			const key = `${scopeId}|${day}|${row.entityType}`;
			const entry = deltas.get(key) ?? {
				projectId: scopeId,
				day,
				entityType: row.entityType,
				startedCount: 0,
				blockedCount: 0,
			};
			entry[column] += 1;
			deltas.set(key, entry);
		}
	}

	// Concurrent writers that lock rows in the same order cannot deadlock.
	return [...deltas.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, d]) => d);
}

/** The project that counted the start of a blocked run. */
function blockedProjectIdOf(row: ExecutionLedgerRow): string {
	return row.projectId;
}
