import type { AgentJsonConfig, BudgetGuardrailConfig } from '@n8n/api-types';

export type BudgetNoticeCode = 'budget.monthly' | 'budget.session' | 'budget.alert';

export type BudgetAmountField = 'monthlyBudgetUsd' | 'sessionCostCapUsd';

export interface BudgetAlertInput {
	enabled: boolean;
	percent: number;
}

const ALERT_STEP = 10;
const ALERT_MIN = 10;
const ALERT_MAX = 100;
const ALERT_DEFAULT = 80;

/** Maps a saved percent onto the slider steps of 10. */
export function snapAlertPercent(value: number): number {
	if (!Number.isFinite(value)) return ALERT_DEFAULT;
	const stepped = Math.round(value / ALERT_STEP) * ALERT_STEP;
	return Math.min(ALERT_MAX, Math.max(ALERT_MIN, stepped));
}

export function formatBudgetUsd(amount: number): string {
	const cents = Math.round(amount * 100);
	const hasCents = cents % 100 !== 0;
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: hasCents ? 2 : 0,
		maximumFractionDigits: 2,
	}).format(amount);
}

/** A budget must be greater than 0. Empty, 0, and negative amounts are unset. */
export function parseBudgetAmount(value: number | null | undefined): number | undefined {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
	return value;
}

function buildBudget(
	monthly: number | undefined,
	session: number | undefined,
	alert: BudgetAlertInput,
): BudgetGuardrailConfig {
	const enabled = monthly !== undefined || session !== undefined;
	const budget: BudgetGuardrailConfig = { enabled };
	if (monthly !== undefined) budget.monthlyBudgetUsd = monthly;
	if (session !== undefined) budget.sessionCostCapUsd = session;
	if (enabled && monthly !== undefined && alert.enabled) {
		budget.alertThresholdPercent = snapAlertPercent(alert.percent);
	}
	return budget;
}

function withBudget(
	config: AgentJsonConfig | null,
	budget: BudgetGuardrailConfig,
): Partial<AgentJsonConfig> {
	return {
		config: {
			...config?.config,
			guardrails: {
				...config?.config?.guardrails,
				budget,
			},
		},
	};
}

export function monthlyBudgetSave(
	config: AgentJsonConfig | null,
	monthlyInput: number | undefined,
	alert: BudgetAlertInput,
): Partial<AgentJsonConfig> {
	const current = config?.config?.guardrails?.budget;
	return withBudget(
		config,
		buildBudget(
			parseBudgetAmount(monthlyInput),
			parseBudgetAmount(current?.sessionCostCapUsd),
			alert,
		),
	);
}

export function sessionCapSave(
	config: AgentJsonConfig | null,
	sessionInput: number | undefined,
): Partial<AgentJsonConfig> {
	const current = config?.config?.guardrails?.budget;
	return withBudget(
		config,
		buildBudget(parseBudgetAmount(current?.monthlyBudgetUsd), parseBudgetAmount(sessionInput), {
			enabled: current?.alertThresholdPercent !== undefined,
			percent: current?.alertThresholdPercent ?? ALERT_DEFAULT,
		}),
	);
}

/**
 * Writes one raised cap and keeps the other saved amounts. Increase-only:
 * rejects an empty or negative amount, and one at or below the current cap —
 * saving it would lift the stop only for the next run to stop again.
 */
export function increasedBudgetConfig(
	config: AgentJsonConfig | null,
	field: BudgetAmountField,
	amount: number,
): Partial<AgentJsonConfig> | undefined {
	const next = parseBudgetAmount(amount);
	if (next === undefined) return undefined;
	const current = config?.config?.guardrails?.budget;
	const currentValue = current?.[field];
	if (currentValue !== undefined && next <= currentValue) return undefined;
	const monthly = field === 'monthlyBudgetUsd' ? next : current?.monthlyBudgetUsd;
	const session = field === 'sessionCostCapUsd' ? next : current?.sessionCostCapUsd;
	return withBudget(
		config,
		buildBudget(parseBudgetAmount(monthly), parseBudgetAmount(session), {
			enabled: current?.alertThresholdPercent !== undefined,
			percent: current?.alertThresholdPercent ?? ALERT_DEFAULT,
		}),
	);
}

/**
 * Caps whose raise or removal lifts a budget stop. A lowered or unchanged cap
 * keeps the stop: the next run would stop against it again.
 */
export function raisedBudgetCaps(
	before: BudgetGuardrailConfig | undefined,
	after: BudgetGuardrailConfig | undefined,
): BudgetAmountField[] {
	const raised: BudgetAmountField[] = [];
	for (const field of ['monthlyBudgetUsd', 'sessionCostCapUsd'] as const) {
		const prev = before?.[field];
		const next = after?.[field];
		if (next === undefined ? prev !== undefined : prev !== undefined && next > prev) {
			raised.push(field);
		}
	}
	return raised;
}

export function isBudgetStopCode(code: string): code is 'budget.monthly' | 'budget.session' {
	return code === 'budget.monthly' || code === 'budget.session';
}

/** Notice codes a persisted change to one cap resolves. The alert rides with the monthly cap. */
export function budgetNoticeCodesForField(field: BudgetAmountField): BudgetNoticeCode[] {
	return field === 'sessionCostCapUsd' ? ['budget.session'] : ['budget.monthly', 'budget.alert'];
}
