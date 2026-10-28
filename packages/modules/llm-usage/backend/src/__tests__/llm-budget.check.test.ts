import type { LicenseState } from '@n8n/backend-common';
import type { LlmCallPolicyContext } from '@n8n/decorators';
import { mock } from 'vitest-mock-extended';

import type { LlmBudgetSpendService } from '../llm-budget-spend.service';
import { LlmBudgetCheck } from '../llm-budget.check';
import type { LlmBudget } from '../llm-budget.entity';
import { WorkflowPublisherCache } from '../workflow-publisher-cache';

const budget = (overrides: Partial<LlmBudget> = {}) =>
	({
		id: 'budget-1',
		name: 'Daily per user',
		target: { user: { match: 'all' } },
		timeWindow: { kind: 'rolling', unit: 'day' },
		limitAmount: 5,
		action: 'block',
		managedBy: null,
		...overrides,
	}) as LlmBudget;

const call = (overrides: Partial<LlmCallPolicyContext> = {}): LlmCallPolicyContext => ({
	callerType: 'node',
	workflowId: 'wf-1',
	agentId: null,
	projectId: 'proj-1',
	accountableUserId: 'user-1',
	credential: { id: 'cred-1' },
	provider: 'openai',
	model: 'gpt-4o',
	...overrides,
});

describe('LlmBudgetCheck', () => {
	const licenseState = mock<LicenseState>();
	const publishers = mock<WorkflowPublisherCache>();
	let spend: LlmBudgetSpendService;
	let check: LlmBudgetCheck;

	const withSpend = (budgets: LlmBudget[], spent: Record<string, number>) => {
		spend = {
			ready: true,
			enabledBudgets: budgets,
			spent: (budgetId: string, key: string) => spent[`${budgetId}:${key}`] ?? 0,
		} as unknown as LlmBudgetSpendService;
		check = new LlmBudgetCheck(spend, publishers, licenseState);
	};

	beforeEach(() => {
		licenseState.isLicensed.mockReturnValue(true);
		publishers.accountableUserId.mockImplementation(
			WorkflowPublisherCache.prototype.accountableUserId,
		);
		publishers.get.mockReturnValue('publisher-1');
	});

	it('blocks the call of a user whose counter reached the limit', async () => {
		withSpend([budget()], { 'budget-1:user=user-1': 5.2 });

		const { violations } = await check.onLlmCall(call());

		expect(violations).toEqual([
			expect.objectContaining({
				kind: 'llm-budget-exceeded',
				checkId: 'llm-budget',
				subject: 'budget-1',
				message:
					'LLM budget "Daily per user" reached: $5.20 of $5.00 in the last 24 hours (LLM usage estimate)',
			}),
		]);
	});

	it('shows a spend and a limit below a cent with two significant digits', async () => {
		withSpend([budget({ limitAmount: 0.0001 })], { 'budget-1:user=user-1': 0.0041 });

		const [{ message }] = (await check.onLlmCall(call())).violations;

		expect(message).toContain('reached: $0.0041 of $0.00010 in the last 24 hours');
	});

	it('lets the call of another user go', async () => {
		withSpend([budget()], { 'budget-1:user=user-1': 5.2 });

		expect((await check.onLlmCall(call({ accountableUserId: 'user-2' }))).violations).toEqual([]);
	});

	it('counts a run without a user for the publisher of the workflow', async () => {
		withSpend([budget()], { 'budget-1:user=publisher-1': 5 });

		expect((await check.onLlmCall(call({ accountableUserId: null }))).violations).toHaveLength(1);
	});

	it('does not block for a warn budget', async () => {
		withSpend([budget({ action: 'warn' })], { 'budget-1:user=user-1': 9 });

		expect((await check.onLlmCall(call())).violations).toEqual([]);
	});

	it.each([
		['the license is off', () => licenseState.isLicensed.mockReturnValue(false), call()],
		['the caller is n8n Assistant', () => {}, call({ callerType: 'instance-ai' })],
	])('does not block when %s', async (_name, arrange, context) => {
		withSpend([budget()], { 'budget-1:user=user-1': 9 });
		arrange();

		expect((await check.onLlmCall(context)).violations).toEqual([]);
	});

	it('fails closed before the first spend load', async () => {
		check = new LlmBudgetCheck(
			{ ready: false } as unknown as LlmBudgetSpendService,
			publishers,
			licenseState,
		);

		await expect(check.onLlmCall(call())).rejects.toThrow('LLM budgets are not loaded yet');
	});
});
