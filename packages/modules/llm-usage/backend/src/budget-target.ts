import { LLM_BUDGET_DIMENSIONS, type LlmBudgetDimension } from '@n8n/api-types';
import type { LlmCallPolicyContext } from '@n8n/decorators';

import type { LlmBudget } from './llm-budget.entity';
import type { LlmUsage } from './llm-usage.entity';

/** Budgets count only the calls of workflow nodes and agents (spec D7). */
export const BUDGETED_CALLERS = ['node', 'agent'];

/** The value of a call for each dimension. A missing value matches no budget that sets it. */
export type CallValues = Partial<Record<LlmBudgetDimension, string>>;

type BudgetShape = Pick<LlmBudget, 'target' | 'timeWindow' | 'managedBy'>;

/** Gateway credits have no credential, so they count as one credential: `managed:aiGateway`. */
const credentialValue = (credential: { id: string } | { managedBy: string } | null) => {
	if (!credential) return undefined;
	return 'id' in credential ? credential.id : `managed:${credential.managedBy}`;
};

/** The values of a call that is about to be sent. */
export function callValues(
	context: LlmCallPolicyContext,
	accountableUserId: string | undefined,
): CallValues {
	return {
		workflow: context.workflowId ?? undefined,
		agent: context.agentId ?? undefined,
		project: context.projectId ?? undefined,
		user: accountableUserId,
		credential: credentialValue(context.credential),
	};
}

/** The values of a recorded call, the same as {@link callValues} gives for it before it is sent. */
export function rowValues(row: Partial<LlmUsage>): CallValues {
	const credential = row.credentialId
		? { id: row.credentialId }
		: row.managedBy
			? { managedBy: row.managedBy }
			: null;
	return {
		workflow: row.workflowId ?? undefined,
		agent: row.agentId ?? undefined,
		project: row.projectId ?? undefined,
		user: row.accountableUserId ?? undefined,
		credential: credentialValue(credential),
	};
}

/** The counter of the call in this budget, or `undefined` when the budget does not apply to it. */
export function counterKey({ target }: BudgetShape, values: CallValues): string | undefined {
	const parts: string[] = [];
	for (const name of LLM_BUDGET_DIMENSIONS) {
		const filter = target[name];
		if (!filter) continue;
		const value = values[name];
		if (value === undefined || (filter.match === 'ids' && !filter.ids.includes(value))) {
			return undefined;
		}
		parts.push(`${name}=${value}`);
	}
	return parts.join('&');
}

/** The dimensions of a budget, as the spend query takes them. */
export function spendDimensions({ target }: BudgetShape) {
	const dimensions: Partial<Record<LlmBudgetDimension, 'all' | string[]>> = {};
	for (const name of LLM_BUDGET_DIMENSIONS) {
		const filter = target[name];
		if (filter) dimensions[name] = filter.match === 'all' ? 'all' : filter.ids;
	}
	return dimensions;
}

/** Budgets compete only with budgets of the same dimensions, window and owner. */
function familyOf({ target, timeWindow, managedBy }: BudgetShape) {
	const dimensions = LLM_BUDGET_DIMENSIONS.filter((name) => target[name]);
	const timezone = timeWindow.kind === 'calendar' ? (timeWindow.timezone ?? 'instance') : '';
	return [managedBy ?? '', dimensions.join(','), timeWindow.kind, timeWindow.unit, timezone].join(
		'|',
	);
}

/**
 * `b` overtakes `a` when it is at least as specific on every dimension, and more specific on
 * one. A list of IDs is more specific than `all`. Both budgets are in the same family.
 */
function overtakes(b: BudgetShape, a: BudgetShape) {
	let more = false;
	for (const name of LLM_BUDGET_DIMENSIONS) {
		const specificity = (budget: BudgetShape) => (budget.target[name]?.match === 'ids' ? 1 : 0);
		if (specificity(b) < specificity(a)) return false;
		if (specificity(b) > specificity(a)) more = true;
	}
	return more;
}

/**
 * The budgets that apply to a call: those that match it, less those that a more specific budget
 * of the same family overtakes. So "user X: $100" lifts "all users: $20" for X only.
 */
export function applicableBudgets<T extends BudgetShape>(
	budgets: readonly T[],
	values: CallValues,
) {
	const matching = budgets.filter((budget) => counterKey(budget, values) !== undefined);
	return matching.filter(
		(budget) =>
			!matching.some((other) => familyOf(other) === familyOf(budget) && overtakes(other, budget)),
	);
}
