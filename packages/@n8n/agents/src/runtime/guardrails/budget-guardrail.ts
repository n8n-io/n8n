import type { GuardrailDecision, ModelGuardrail, TokenUsage } from '../../types';

export interface SpendEntry {
	key: string;
	usd: number;
}

export interface SpendTotal {
	key: string;
	totalUsd: number;
	previousUsd: number;
}

/** Process-local spend. `add` is atomic and idempotent on `callId`. */
export interface SpendLedger {
	add(callId: string, entries: SpendEntry[]): Promise<SpendTotal[]>;
	read(key: string): Promise<number>;
}

export class InMemorySpendLedger implements SpendLedger {
	private readonly totals = new Map<string, number>();
	private readonly appliedCallIds = new Set<string>();

	async add(callId: string, entries: SpendEntry[]): Promise<SpendTotal[]> {
		if (this.appliedCallIds.has(callId)) {
			return entries.map((entry) => {
				const totalUsd = this.totals.get(entry.key) ?? 0;
				return { key: entry.key, totalUsd, previousUsd: totalUsd };
			});
		}

		const totals = entries.map((entry) => {
			const previousUsd = this.totals.get(entry.key) ?? 0;
			const totalUsd = previousUsd + entry.usd;
			this.totals.set(entry.key, totalUsd);
			return { key: entry.key, totalUsd, previousUsd };
		});
		this.appliedCallIds.add(callId);
		return totals;
	}

	async read(key: string): Promise<number> {
		return this.totals.get(key) ?? 0;
	}
}

export interface BudgetGuardrailOptions {
	ledger: SpendLedger;
	sessionId?: string;
	agentId?: string;
	sessionCostCapUsd?: number;
	monthlyBudgetUsd?: number;
	alertThresholdPercent?: number;
	onNotice?: (notice: { code: 'budget.alert' }) => void;
}

const SESSION_STOP: GuardrailDecision = { action: 'stop', code: 'budget.session' };
const MONTHLY_STOP: GuardrailDecision = { action: 'stop', code: 'budget.monthly' };
const MISCONFIGURED: GuardrailDecision = { action: 'stop', code: 'budget.misconfigured' };
const ALLOW: GuardrailDecision = { action: 'allow' };

/** UTC month bucket shared by the guardrail and the settings spend read. */
export function budgetMonthKey(agentId: string, now: Date = new Date()): string {
	return `${agentId}:${now.toISOString().slice(0, 7)}`;
}

function hasId(value: string | undefined): value is string {
	return value !== undefined && value.length > 0;
}

/** A budget of 0 is not a cap. */
function positiveUsd(value: number | undefined): number | undefined {
	if (value === undefined || !Number.isFinite(value) || value <= 0) return undefined;
	return value;
}

/**
 * Stops the next model call when a session cap or a monthly budget is already
 * spent. The crossing call is recorded. A missing `usage.cost` adds nothing.
 */
export function createBudgetGuardrail(options: BudgetGuardrailOptions): ModelGuardrail {
	const { ledger, sessionId, agentId, alertThresholdPercent, onNotice } = options;
	const sessionCostCapUsd = positiveUsd(options.sessionCostCapUsd);
	const monthlyBudgetUsd = positiveUsd(options.monthlyBudgetUsd);
	const alertLine =
		monthlyBudgetUsd !== undefined && alertThresholdPercent !== undefined
			? (monthlyBudgetUsd * alertThresholdPercent) / 100
			: undefined;

	return {
		async before(): Promise<GuardrailDecision> {
			if (sessionCostCapUsd !== undefined && !hasId(sessionId)) return MISCONFIGURED;
			if (monthlyBudgetUsd !== undefined && !hasId(agentId)) return MISCONFIGURED;

			if (sessionCostCapUsd !== undefined && hasId(sessionId)) {
				const spent = await ledger.read(sessionId);
				if (spent >= sessionCostCapUsd) return SESSION_STOP;
			}
			if (monthlyBudgetUsd !== undefined && hasId(agentId)) {
				const spent = await ledger.read(budgetMonthKey(agentId));
				if (spent >= monthlyBudgetUsd) return MONTHLY_STOP;
			}
			return ALLOW;
		},

		async after(ctx, usage: TokenUsage | undefined): Promise<void> {
			const cost = usage?.cost;
			if (cost === undefined) return;

			const entries: SpendEntry[] = [];
			if (sessionCostCapUsd !== undefined && hasId(sessionId)) {
				entries.push({ key: sessionId, usd: cost });
			}
			const month = hasId(agentId) ? budgetMonthKey(agentId) : undefined;
			if (monthlyBudgetUsd !== undefined && month !== undefined) {
				entries.push({ key: month, usd: cost });
			}
			if (entries.length === 0) return;

			const totals = await ledger.add(ctx.callId, entries);
			if (alertLine === undefined || month === undefined) return;
			const monthTotal = totals.find((total) => total.key === month);
			if (!monthTotal) return;
			if (monthTotal.previousUsd < alertLine && monthTotal.totalUsd >= alertLine) {
				onNotice?.({ code: 'budget.alert' });
			}
		},
	};
}
