import { isBillableExecution } from '@n8n/backend-services';
import {
	LedgerParticipant,
	type ExecutionLedgerParticipant,
	type ExecutionLedgerRow,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { shouldSkipMode, shouldSkipStatus } from './insights-collection.service';
import { InsightsLedgerRepository, type InsightsHourIncrement } from './insights-ledger.repository';
import { TypeToNumber, type TypeUnit } from './insights-shared';

/**
 * Folds finished runs from the execution ledger straight into hourly `insights_by_period`
 * buckets, applying the same skip rules as the raw collector.
 */
@LedgerParticipant()
@Service()
export class InsightsLedgerParticipant implements ExecutionLedgerParticipant {
	readonly name = 'insights';

	constructor(private readonly repository: InsightsLedgerRepository) {}

	async fold(rows: ExecutionLedgerRow[], ctx: OperationContext): Promise<undefined> {
		// PoC switch: the raw collector stays the source unless the ledger is selected.
		if (process.env.N8N_INSIGHTS_SOURCE !== 'ledger') return undefined;

		const counted = rows.filter(
			(row) =>
				row.event === 'finished' &&
				row.status !== null &&
				!shouldSkipStatus[row.status] &&
				!shouldSkipMode[row.mode] &&
				row.source !== 'instance_ai',
		);
		if (counted.length === 0) return undefined;

		const names = new Map(counted.map((row) => [row.workflowId, row.workflowName ?? '']));
		const metaIds = await this.repository.upsertMetadata(ctx, names);

		const byKey = new Map<string, InsightsHourIncrement>();
		const add = (metaId: number, type: TypeUnit, hour: Date, value: number) => {
			const key = `${metaId}:${type}:${hour.getTime()}`;
			const increment = byKey.get(key) ?? { metaId, type: TypeToNumber[type], hour, value: 0 };
			increment.value += value;
			byKey.set(key, increment);
		};

		for (const row of counted) {
			const metaId = metaIds.get(row.workflowId);
			// No owner project: the raw collector drops these too.
			if (metaId === undefined || row.status === null) continue;

			const hour = new Date(row.createdAt);
			hour.setUTCMinutes(0, 0, 0);
			const succeeded = row.status === 'success';
			add(metaId, succeeded ? 'success' : 'failure', hour, row.delta);
			if (isBillableExecution({ mode: row.mode, status: row.status }, row.source ?? undefined)) {
				add(metaId, 'billable', hour, row.delta);
			}
			if (row.runtimeMs !== null) add(metaId, 'runtime_ms', hour, row.runtimeMs);
			if (succeeded && row.mode !== 'error')
				add(metaId, 'time_saved_min', hour, row.timeSavedMin ?? 0);
		}

		await this.repository.addHourlyIncrements(ctx, [...byKey.values()]);
		return undefined;
	}
}
