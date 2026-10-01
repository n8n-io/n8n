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
}

interface ResolvedBudgetLimits {
	sessionId?: string;
	agentId?: string;
	sessionCostCapUsd?: number;
	monthlyBudgetUsd?: number;
	alertThresholdPercent?: number;
}

function resolveBudgetLimits(input: BudgetAttachInput): ResolvedBudgetLimits | undefined {
	if (input.useRootSessionCap) {
		const childOn = input.budget?.enabled === true;
		if (!childOn && input.rootSessionCapUsd === undefined) return undefined;
		return {
			sessionId: input.sessionId,
			agentId: input.agentId,
			sessionCostCapUsd: input.rootSessionCapUsd,
			monthlyBudgetUsd: childOn ? input.budget?.monthlyBudgetUsd : undefined,
			alertThresholdPercent: childOn ? input.budget?.alertThresholdPercent : undefined,
		};
	}

	if (input.budget?.enabled !== true) return undefined;
	return {
		sessionId: input.sessionId,
		agentId: input.agentId,
		sessionCostCapUsd: input.budget.sessionCostCapUsd,
		monthlyBudgetUsd: input.budget.monthlyBudgetUsd,
		alertThresholdPercent: input.budget.alertThresholdPercent,
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
	const hook = createBudgetGuardrail({ ledger, ...limits });
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
