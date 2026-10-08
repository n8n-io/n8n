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

import { AgentBudgetAlertService } from './agent-budget-alert.service';
import {
	AgentBudgetSpendRepository,
	previousTotalUsd,
} from './repositories/agent-budget-spend.repository';

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
			const stored = await this.budgetSpendRepository.readTotal(key);
			return stored + this.bufferedTotalFor(key);
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
			return { key: entry.key, totalUsd, previousUsd: previousTotalUsd(totalUsd, entry.usd) };
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
	/**
	 * Saved agent to email when the month total crosses the alert.
	 * A workflow run sets this to the agent the node targets. Inline workflow
	 * runs have no saved agent, so they leave it unset.
	 */
	alertAgentId?: string;
	/** Session cap from the root agent. Used only when `useRootSessionCap` is set. */
	rootSessionCapUsd?: number;
	/**
	 * Child runs take the session cap from the root agent and the monthly
	 * budget from `budget` when that guardrail is on.
	 */
	useRootSessionCap?: boolean;
	/** Preview chat shows the approaching card. Cloud also emails the project owner. */
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

/**
 * Builds the notice callback.
 * The guardrail calls it once, when the month total crosses the alert line.
 * A later request in the same month does not cross that line again.
 */
function monthlyAlertNotice(
	input: BudgetAttachInput,
	alertThresholdPercent: number | undefined,
): BudgetAttachInput['onNotice'] | undefined {
	const previewNotice = input.onNotice;
	const emailAgentId = alertEmailAgentId(input);
	if (alertThresholdPercent === undefined || emailAgentId === undefined) return previewNotice;
	const alertService = resolveAlertService();
	if (!alertService) return previewNotice;
	return (notice) => {
		previewNotice?.(notice);
		alertService.notifyMonthlyThreshold({
			agentId: emailAgentId,
			alertThresholdPercent,
		});
	};
}

/**
 * The saved agent the email names. A workflow run of a saved agent passes that
 * id in `alertAgentId`. An inline workflow run only has a telemetry id, so it
 * sends no email.
 */
function alertEmailAgentId(input: BudgetAttachInput): string | undefined {
	if (hasId(input.alertAgentId)) return input.alertAgentId;
	if (!hasId(input.agentId) || input.agentId.startsWith('inline:')) return undefined;
	return input.agentId;
}

function resolveAlertService(): AgentBudgetAlertService | undefined {
	try {
		return Container.get(AgentBudgetAlertService);
	} catch {
		try {
			Container.get(Logger).debug(
				'Agent budget alert emails are unavailable: the service is not registered',
			);
		} catch {
			// No logger either. Stay quiet.
		}
		return undefined;
	}
}
function hasId(value: string | undefined): value is string {
	return value !== undefined && value.length > 0;
}

/** Appends the budget hook when a bucket is on. Leaves the options unchanged otherwise. */
export function withBudgetGuardrail<T extends RunOptions & ExecutionOptions>(
	options: T,
	input: BudgetAttachInput,
): T {
	const limits = resolveBudgetLimits(input);
	if (!limits) return options;

	const ledger = input.ledger ?? Container.get(AgentSpendLedger);
	const onNotice = monthlyAlertNotice(input, limits.alertThresholdPercent);
	const hook = createBudgetGuardrail({
		ledger,
		...limits,
		...(onNotice ? { onNotice } : {}),
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
