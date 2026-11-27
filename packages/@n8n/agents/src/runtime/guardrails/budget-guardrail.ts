import type { GuardrailModelCallDecision, ModelGuardrail, TokenUsage } from '../../types';
import { computeSideCallCost } from '../loop/side-call-cost';
import { toTokenUsage } from '../streaming/stream';

export interface SpendEntry {
	key: string;
	usd: number;
}

export interface SpendTotal {
	key: string;
	totalUsd: number;
	previousUsd: number;
}

/** Spend totals. `add` is idempotent on `callId`. */
export interface SpendLedger {
	add(callId: string, entries: SpendEntry[]): Promise<SpendTotal[]>;
	read(key: string): Promise<number>;
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

const SESSION_STOP: GuardrailModelCallDecision = { action: 'stop', code: 'budget.session' };
const MONTHLY_STOP: GuardrailModelCallDecision = { action: 'stop', code: 'budget.monthly' };
const MISCONFIGURED: GuardrailModelCallDecision = { action: 'stop', code: 'budget.misconfigured' };
const ALLOW: GuardrailModelCallDecision = { action: 'allow' };

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
	const { ledger, sessionId, agentId } = options;
	const sessionCostCapUsd = positiveUsd(options.sessionCostCapUsd);
	const monthlyBudgetUsd = positiveUsd(options.monthlyBudgetUsd);

	return {
		async before(): Promise<GuardrailModelCallDecision> {
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
			await recordBudgetSpend(options, ctx.callId, usage?.cost);
		},
	};
}

/**
 * Writes one priced call to the session key and the month key. Fires the
 * alert once, when the month total crosses the line. A missing cost adds
 * nothing. A repeated `callId` does not add the cost twice.
 */
async function recordBudgetSpend(
	options: BudgetGuardrailOptions,
	callId: string,
	cost: number | undefined,
): Promise<void> {
	if (cost === undefined) return;

	const { ledger, sessionId, agentId, alertThresholdPercent, onNotice } = options;
	const sessionCostCapUsd = positiveUsd(options.sessionCostCapUsd);
	const monthlyBudgetUsd = positiveUsd(options.monthlyBudgetUsd);
	const alertLine =
		monthlyBudgetUsd !== undefined && alertThresholdPercent !== undefined
			? (monthlyBudgetUsd * alertThresholdPercent) / 100
			: undefined;

	const entries: SpendEntry[] = [];
	if (sessionCostCapUsd !== undefined && hasId(sessionId)) {
		entries.push({ key: sessionId, usd: cost });
	}
	const month = hasId(agentId) ? budgetMonthKey(agentId) : undefined;
	if (monthlyBudgetUsd !== undefined && month !== undefined) {
		entries.push({ key: month, usd: cost });
	}
	if (entries.length === 0) return;

	const totals = await ledger.add(callId, entries);
	if (alertLine === undefined || month === undefined) return;
	const monthTotal = totals.find((total) => total.key === month);
	if (!monthTotal) return;
	if (monthTotal.previousUsd < alertLine && monthTotal.totalUsd >= alertLine) {
		onNotice?.({ code: 'budget.alert' });
	}
}

/**
 * Prices one side model call and writes it to the budget ledger. A missing
 * price, or a catalog failure, adds nothing and does not throw: the tool
 * call still finishes.
 */
export async function chargeModelSpend(input: {
	modelId: string;
	usage: Parameters<typeof toTokenUsage>[0];
	providerMetadata?: Parameters<typeof toTokenUsage>[1];
	callId: string;
	budget: BudgetGuardrailOptions;
}): Promise<void> {
	let cost: number | undefined;
	try {
		const usage = toTokenUsage(input.usage, input.providerMetadata);
		if (!usage) return;
		cost = await computeSideCallCost(input.modelId, usage);
	} catch {
		// The catalog can fail. This call adds no spend.
		return;
	}
	await recordBudgetSpend(input.budget, input.callId, cost);
}
