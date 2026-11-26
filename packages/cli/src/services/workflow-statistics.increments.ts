import { isLedgerFact, toWorkflowStatisticsCount } from '@n8n/backend-services';
import type { ExecutionLedgerRow, WorkflowStatisticsIncrement } from '@n8n/db';

const compare = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

/** Sums claimed ledger rows into one increment for each counter, in a stable order. */
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
		let increment = increments.get(key);
		if (!increment) {
			increment = {
				workflowId: row.entityId,
				name: counted.name,
				count: 0,
				rootCount: 0,
				latestEvent: row.occurredAt,
				firstEvent: row.occurredAt,
				workflowName: row.entityName,
			};
			increments.set(key, increment);
		}

		increment.count += 1;
		if (counted.isRoot) increment.rootCount += 1;
		if (row.occurredAt < increment.firstEvent) increment.firstEvent = row.occurredAt;
		if (row.occurredAt >= increment.latestEvent) {
			increment.latestEvent = row.occurredAt;
			increment.workflowName = row.entityName;
		}
	}

	// A fixed order makes concurrent multi-row upserts lock the counters the same way.
	return [...increments.values()].sort(
		(left, right) => compare(left.workflowId, right.workflowId) || compare(left.name, right.name),
	);
}
