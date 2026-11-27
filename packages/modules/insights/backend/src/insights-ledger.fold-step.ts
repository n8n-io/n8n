import {
	isBillableExecution,
	isInsightsProduction,
	isLedgerFact,
	savesTime,
} from '@n8n/backend-services';
import type { ExecutionLedgerFoldStep, ExecutionLedgerRow, OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';

import type { InsightsLedgerEntry } from './insights-ledger.repository';
import { InsightsLedgerRepository } from './insights-ledger.repository';

/** PostgreSQL INTEGER max, as in the collector. */
const MAX_RUNTIME = 2 ** 31 - 1;

/**
 * Writes `insights_raw` from the `ended` rows of the execution ledger, for v1 and v2 runs.
 * The same counting rules as `InsightsCollectionService`, but the facts come from the row.
 */
export function toInsightsEntries(rows: readonly ExecutionLedgerRow[]): InsightsLedgerEntry[] {
	const entries: InsightsLedgerEntry[] = [];
	for (const row of rows) {
		if (!row.projectId || !isLedgerFact(row)) continue;
		const fact = {
			entityType: row.entityType,
			mode: row.mode,
			source: row.source,
			event: row.event,
			outcome: row.outcome,
		};
		if (!isInsightsProduction(fact)) continue;

		const common = {
			workflowId: row.entityId,
			workflowName: row.entityName,
			projectId: row.projectId,
			timestamp: row.occurredAt,
		};
		entries.push({ ...common, type: fact.outcome === 'success' ? 'success' : 'failure', value: 1 });
		if (isBillableExecution(fact)) entries.push({ ...common, type: 'billable', value: 1 });
		entries.push({
			...common,
			type: 'runtime_ms',
			value: Math.min(Math.max(row.runtimeMs, 0), MAX_RUNTIME),
		});
		if (savesTime(fact))
			entries.push({ ...common, type: 'time_saved_min', value: row.timeSavedMin });
	}
	return entries;
}

@Service()
export class InsightsLedgerFoldStep implements ExecutionLedgerFoldStep {
	readonly name = 'insights_raw';

	constructor(private readonly repository: InsightsLedgerRepository) {}

	async fold(rows: readonly ExecutionLedgerRow[], ctx: OperationContext): Promise<undefined> {
		await this.repository.insert(toInsightsEntries(rows), ctx);
		return undefined;
	}
}
