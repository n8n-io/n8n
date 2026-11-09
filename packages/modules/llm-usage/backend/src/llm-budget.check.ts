import { POLICY_VIOLATION_KIND, POLICY_VIOLATION_SUBJECT_TYPE } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import {
	PolicyCheck,
	type LlmCallPolicyContext,
	type PolicyCheckResult,
	type RegisteredPolicyCheck,
} from '@n8n/decorators';
import { UnexpectedError } from '@n8n/errors';

import { applicableBudgets, BUDGETED_CALLERS, callValues, counterKey } from './budget-target';
import { describeWindow } from './budget-window';
import { LlmBudgetSpendService } from './llm-budget-spend.service';
import { WorkflowPublisherCache } from './workflow-publisher-cache';

const NO_VIOLATIONS: PolicyCheckResult = { violations: [] };

/** Cents, or two significant digits below a cent, so a small spend or limit does not read $0.00. */
const usd = (amount: number) =>
	`$${amount >= 0.01 || amount === 0 ? amount.toFixed(2) : amount.toPrecision(2)}`;

/** Blocks an LLM call when a `block` budget that applies to it is spent. Reads memory only. */
@PolicyCheck()
export class LlmBudgetCheck implements RegisteredPolicyCheck {
	readonly id = 'llm-budget';

	constructor(
		private readonly spend: LlmBudgetSpendService,
		private readonly publishers: WorkflowPublisherCache,
		private readonly licenseState: LicenseState,
	) {}

	async onLlmCall(context: LlmCallPolicyContext): Promise<PolicyCheckResult> {
		if (!BUDGETED_CALLERS.includes(context.callerType)) return NO_VIOLATIONS;
		// An expired license stops enforcing, like the type availability policies.
		if (!this.licenseState.isLicensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)) {
			return NO_VIOLATIONS;
		}
		// Budgets that are not loaded yet are not budgets that passed: the call fails closed.
		if (!this.spend.ready) throw new UnexpectedError('LLM budgets are not loaded yet');

		const accountableUserId = this.publishers.accountableUserId({
			userId: context.accountableUserId,
			workflowId: context.workflowId,
		});
		const values = callValues(context, accountableUserId);
		const violations = applicableBudgets(this.spend.enabledBudgets, values).flatMap((budget) => {
			if (budget.action !== 'block') return [];
			const spent = this.spend.spent(budget.id, counterKey(budget, values) ?? '');
			if (spent < budget.limitAmount) return [];
			return [
				{
					kind: POLICY_VIOLATION_KIND.llmBudgetExceeded,
					checkId: this.id,
					message: `LLM budget "${budget.name}" reached: ${usd(spent)} of ${usd(budget.limitAmount)} ${describeWindow(budget.timeWindow)} (LLM usage estimate)`,
					subject: budget.id,
					subjectType: POLICY_VIOLATION_SUBJECT_TYPE.llmBudget,
					scope: 'instance',
				},
			];
		});
		return { violations };
	}
}
