import { isLedgerFact, toWorkflowStatisticsCount } from '@n8n/backend-services';
import type { ExecutionLedgerRow, WorkflowStatisticsIncrement } from '@n8n/db';

/** Sums claimed ledger rows into one increment for each counter, in a stable key order. */
export function toStatisticsIncrements(
	rows: readonly ExecutionLedgerRow[],
): WorkflowStatisticsIncrement[] {
	const increments = new Map<string, WorkflowStatisticsIncrement>();

	for (const row of rows) {
		// Engine v2 runs do not count toward the licence yet.
		if (row.origin !== 'v1' || !isLedgerFact(row)) continue;

		const counted = toWorkflowStatisticsCount(row);
		if (!counted) continue;

		const key = `${row.entityId}\u0000${counted.name}`;
		const rootCount = counted.isRoot ? 1 : 0;
		const increment = increments.get(key);
		if (!increment) {
			increments.set(key, {
				workflowId: row.entityId,
				name: counted.name,
				count: 1,
				rootCount,
				latestEvent: row.occurredAt,
				firstEvent: row.occurredAt,
				workflowName: row.entityName,
			});
			continue;
		}

		increment.count += 1;
		increment.rootCount += rootCount;
		if (row.occurredAt < increment.firstEvent) increment.firstEvent = row.occurredAt;
		if (row.occurredAt >= increment.latestEvent) {
			increment.latestEvent = row.occurredAt;
			increment.workflowName = row.entityName;
		}
	}

	// A fixed order makes concurrent multi-row upserts lock the counters the same way.
	return [...increments.entries()]
		.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
		.map(([, increment]) => increment);
}
