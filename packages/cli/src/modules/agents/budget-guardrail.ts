import {
	createBudgetGuardrail,
	type ExecutionOptions,
	type RunOptions,
	type SpendEntry,
	type SpendLedger,
	type SpendTotal,
} from '@n8n/agents';
import type { BudgetGuardrailConfig } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';

import { AgentBudgetSpendRepository } from './repositories/agent-budget-spend.repository';

/** Past this many buffered calls the oldest drops, so a long outage cannot grow memory. */
const PENDING_CALLS_CAP = 10_000;

/**
 * Budget spend shared by every main. Reads and writes the database rows.
 * A database error does not stop a turn: the spend is buffered in memory and
 * retried on the next ledger call. Buffered spend is lost on a process crash,
 * and an alert crossing during an outage can go unnoticed.
 */
@Service()
export class AgentSpendLedger implements SpendLedger {
	/** Calls not yet recorded, in arrival order. */
	private readonly pending = new Map<string, SpendEntry[]>();

	constructor(
		private readonly budgetSpendRepository: AgentBudgetSpendRepository,
		private readonly logger: Logger,
	) {}

	async add(callId: string, entries: SpendEntry[]): Promise<SpendTotal[]> {
		await this.flushPending();
		try {
			return await this.budgetSpendRepository.applySpend(callId, entries);
		} catch (error) {
			this.logger.warn('Failed to record budget spend; buffered the call for a later retry', {
				callId,
				error: error instanceof Error ? error.message : String(error),
			});
			this.buffer(callId, entries);
			return this.bufferedTotals(entries);
		}
	}

	async read(key: string): Promise<number> {
		await this.flushPending();
		try {
			return await this.budgetSpendRepository.readTotal(key);
		} catch (error) {
			this.logger.warn('Failed to read budget spend; using the buffered totals', {
				key,
				error: error instanceof Error ? error.message : String(error),
			});
			return this.bufferedTotalFor(key);
		}
	}

	/**
	 * Replays buffered calls in arrival order. `applySpend` is idempotent on
	 * `callId`, so a retry after an ambiguous failure cannot add spend twice.
	 * Stops at the first failure: the database is still down.
	 */
	private async flushPending(): Promise<void> {
		for (const [callId, entries] of this.pending) {
			try {
				await this.budgetSpendRepository.applySpend(callId, entries);
			} catch {
				return;
			}
			this.pending.delete(callId);
		}
	}

	private buffer(callId: string, entries: SpendEntry[]): void {
		if (this.pending.size >= PENDING_CALLS_CAP && !this.pending.has(callId)) {
			const oldest = this.pending.keys().next().value;
			if (oldest !== undefined) {
				this.pending.delete(oldest);
				this.logger.warn('Budget spend buffer is full; dropped the oldest buffered call', {
					callId: oldest,
				});
			}
		}
		this.pending.set(callId, entries);
	}

	/** Totals from the buffer alone. The database share is unknown during an outage. */
	private bufferedTotals(entries: SpendEntry[]): SpendTotal[] {
		return entries.map((entry) => {
			const totalUsd = this.bufferedTotalFor(entry.key);
			return { key: entry.key, totalUsd, previousUsd: totalUsd - entry.usd };
		});
	}

	private bufferedTotalFor(key: string): number {
		let totalUsd = 0;
		for (const entries of this.pending.values()) {
			for (const entry of entries) {
				if (entry.key === key) totalUsd += entry.usd;
			}
		}
		return totalUsd;
	}
}

export interface BudgetAttachInput {
	ledger?: SpendLedger;
	budget?: BudgetGuardrailConfig;
	sessionId?: string;
	agentId?: string;
	/** Session cap from the root agent. Used only when `useRootSessionCap` is set. */
	rootSessionCapUsd?: number;
	/**
	 * Child runs take the session cap from the root agent and the monthly
	 * budget from `budget` when that guardrail is on.
	 */
	useRootSessionCap?: boolean;
	/** Preview chat shows the approaching card. Nothing else subscribes. */
	onNotice?: (notice: { code: 'budget.alert' }) => void;
}

interface ResolvedBudgetLimits {
	sessionId?: string;
	agentId?: string;
	sessionCostCapUsd?: number;
	monthlyBudgetUsd?: number;
	alertThresholdPercent?: number;
}

function positiveUsd(value: number | undefined): number | undefined {
	if (value === undefined || !Number.isFinite(value) || value <= 0) return undefined;
	return value;
}

function resolveBudgetLimits(input: BudgetAttachInput): ResolvedBudgetLimits | undefined {
	if (input.useRootSessionCap) {
		const childOn = input.budget?.enabled === true;
		const sessionCostCapUsd = positiveUsd(input.rootSessionCapUsd);
		const monthlyBudgetUsd = childOn ? positiveUsd(input.budget?.monthlyBudgetUsd) : undefined;
		if (sessionCostCapUsd === undefined && monthlyBudgetUsd === undefined) return undefined;
		return {
			sessionId: input.sessionId,
			agentId: input.agentId,
			sessionCostCapUsd,
			monthlyBudgetUsd,
			alertThresholdPercent:
				monthlyBudgetUsd !== undefined && childOn ? input.budget?.alertThresholdPercent : undefined,
		};
	}

	if (input.budget?.enabled !== true) return undefined;
	const sessionCostCapUsd = positiveUsd(input.budget.sessionCostCapUsd);
	const monthlyBudgetUsd = positiveUsd(input.budget.monthlyBudgetUsd);
	if (sessionCostCapUsd === undefined && monthlyBudgetUsd === undefined) return undefined;
	return {
		sessionId: input.sessionId,
		agentId: input.agentId,
		sessionCostCapUsd,
		monthlyBudgetUsd,
		alertThresholdPercent:
			monthlyBudgetUsd !== undefined ? input.budget.alertThresholdPercent : undefined,
	};
}

/** Appends the budget hook when a bucket is on. Leaves the options unchanged otherwise. */
export function withBudgetGuardrail<T extends RunOptions & ExecutionOptions>(
	options: T,
	input: BudgetAttachInput,
): T {
	const limits = resolveBudgetLimits(input);
	if (!limits) return options;

	const ledger = input.ledger ?? Container.get(AgentSpendLedger);
	const hook = createBudgetGuardrail({
		ledger,
		...limits,
		...(input.onNotice ? { onNotice: input.onNotice } : {}),
	});
	const existing = options.guardrails;
	return {
		...options,
		guardrails: {
			hooks: [...(existing?.hooks ?? []), hook],
			...(existing?.agentId !== undefined ? { agentId: existing.agentId } : {}),
			...(existing?.threadId !== undefined ? { threadId: existing.threadId } : {}),
		},
	};
}
