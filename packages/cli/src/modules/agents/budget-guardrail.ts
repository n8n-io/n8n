import {
	createBudgetGuardrail,
	InMemorySpendLedger,
	type ExecutionOptions,
	type RunOptions,
	type SpendLedger,
} from '@n8n/agents';
import type { BudgetGuardrailConfig } from '@n8n/api-types';
import { Container, Service } from '@n8n/di';

/** One ledger for this process. Queue mode and multi-main need a later adapter. */
@Service()
export class AgentSpendLedger {
	readonly ledger: SpendLedger = new InMemorySpendLedger();
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

	const ledger = input.ledger ?? Container.get(AgentSpendLedger).ledger;
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
