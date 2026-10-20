import {
	ExecutionQuotaRepository,
	LedgerParticipant,
	type AfterFoldCommit,
	type ExecutionLedgerParticipant,
	type ExecutionLedgerRow,
	type ExecutionQuotaScopeType,
	type ExecutionQuotaUsageIncrement,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { ExecutionQuotaService, periodWindow } from './execution-quota.service';
import type { CounterFoldUpdate } from './quota-counter.store';

type CounterMove = {
	key: string;
	scope: { scopeType: ExecutionQuotaScopeType; scopeId: string };
	window: { start: Date; end: Date };
	folded: number;
};

/** Folds started rows into the daily usage totals the admission check reads. */
@LedgerParticipant()
@Service()
export class ExecutionQuotaLedgerParticipant implements ExecutionLedgerParticipant {
	readonly name = 'execution-quota';

	constructor(
		private readonly quotaRepository: ExecutionQuotaRepository,
		private readonly quotaService: ExecutionQuotaService,
	) {}

	async fold(
		rows: ExecutionLedgerRow[],
		ctx: OperationContext,
	): Promise<AfterFoldCommit | undefined> {
		const byKey = new Map<string, ExecutionQuotaUsageIncrement>();
		const add = (
			scopeType: ExecutionQuotaScopeType,
			scopeId: string,
			day: string,
			delta: number,
		) => {
			const key = `${scopeType}:${scopeId}:${day}`;
			const increment = byKey.get(key) ?? { scopeType, scopeId, day, delta: 0 };
			increment.delta += delta;
			byKey.set(key, increment);
		};

		const started = rows.filter((row) => row.event === 'started');
		for (const row of started) {
			const day = row.createdAt.toISOString().slice(0, 10);
			add('workflow', row.workflowId, day, row.delta);
			if (row.projectId) add('project', row.projectId, day, row.delta);
		}

		await this.quotaRepository.addUsage(ctx, [...byKey.values()]);

		if (this.quotaService.mode !== 'counter') return undefined;
		return await this.prepareCounterUpdates(started, ctx);
	}

	/** Reads the new absolute totals inside the fold, so the counter never runs ahead of the DB. */
	private async prepareCounterUpdates(
		started: ExecutionLedgerRow[],
		ctx: OperationContext,
	): Promise<AfterFoldCommit | undefined> {
		const moves = new Map<string, CounterMove>();
		for (const row of started) {
			const scopes: CounterMove['scope'][] = [{ scopeType: 'workflow', scopeId: row.workflowId }];
			if (row.projectId) scopes.push({ scopeType: 'project', scopeId: row.projectId });

			for (const scope of scopes) {
				for (const quota of await this.quotaService.quotasForScope(scope)) {
					const key = this.quotaService.counterKey(quota, row.createdAt);
					const move = moves.get(key) ?? {
						key,
						scope,
						window: periodWindow(quota.period, row.createdAt),
						folded: 0,
					};
					// Refund rows never entered the counter, so only admissions leave it.
					if (row.delta > 0) move.folded += row.delta;
					moves.set(key, move);
				}
			}
		}
		if (moves.size === 0) return undefined;

		const list = [...moves.values()];
		const version = await this.quotaRepository.nextFoldVersion(ctx);
		const totals = await this.quotaRepository.foldedTotals(
			ctx,
			list.map((move) => ({ ...move.scope, ...move.window })),
		);
		const updates: CounterFoldUpdate[] = list.map((move, i) => ({
			key: move.key,
			total: totals[i],
			folded: move.folded,
			version,
		}));

		return async () => await this.quotaService.counterStore().applyFold(updates);
	}
}
