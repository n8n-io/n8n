import type { GuardrailModelCallContext, TokenUsage } from '../../../types';
import { computeSideCallCost } from '../../loop/side-call-cost';
import { budgetMonthKey, chargeModelSpend, createBudgetGuardrail } from '../budget-guardrail';
import { spendLedger } from './spend-ledger';

vi.mock('../../loop/side-call-cost', () => ({
	computeSideCallCost: vi.fn(),
}));

const usage = (cost?: number): TokenUsage => ({
	promptTokens: 1,
	completionTokens: 1,
	totalTokens: 2,
	...(cost !== undefined ? { cost } : {}),
});

function ctx(callId: string): GuardrailModelCallContext {
	return { callId, model: 'openai/gpt-4o-mini', source: 'turn' };
}

function monthKey(agentId: string): string {
	return budgetMonthKey(agentId);
}

describe('createBudgetGuardrail', () => {
	it('records usage.cost on the session key and the month key when the call is under the cap', async () => {
		const ledger = spendLedger();
		const guardrail = createBudgetGuardrail({
			ledger,
			sessionId: 'session-1',
			agentId: 'agent-1',
			sessionCostCapUsd: 5,
			monthlyBudgetUsd: 20,
		});

		await expect(guardrail.before?.(ctx('call-1'))).resolves.toEqual({ action: 'allow' });
		await guardrail.after?.(ctx('call-1'), usage(0.25));

		expect(await ledger.read('session-1')).toBe(0.25);
		expect(await ledger.read(monthKey('agent-1'))).toBe(0.25);
	});

	it('records the crossing call and stops the next before', async () => {
		const ledger = spendLedger();
		const guardrail = createBudgetGuardrail({
			ledger,
			sessionId: 'session-1',
			agentId: 'agent-1',
			sessionCostCapUsd: 1,
			monthlyBudgetUsd: 100,
		});

		await guardrail.after?.(ctx('call-1'), usage(1.5));

		expect(await ledger.read('session-1')).toBe(1.5);
		await expect(guardrail.before?.(ctx('call-2'))).resolves.toEqual({
			action: 'stop',
			code: 'budget.session',
		});
	});

	it('stops with budget.monthly when the month is spent and the session cap is not', async () => {
		const ledger = spendLedger();
		const guardrail = createBudgetGuardrail({
			ledger,
			sessionId: 'session-1',
			agentId: 'agent-1',
			sessionCostCapUsd: 100,
			monthlyBudgetUsd: 1,
		});

		await guardrail.after?.(ctx('call-1'), usage(1.5));

		await expect(guardrail.before?.(ctx('call-2'))).resolves.toEqual({
			action: 'stop',
			code: 'budget.monthly',
		});
	});

	it('leaves the totals unchanged when usage.cost is missing', async () => {
		const ledger = spendLedger();
		const guardrail = createBudgetGuardrail({
			ledger,
			sessionId: 'session-1',
			agentId: 'agent-1',
			sessionCostCapUsd: 1,
			monthlyBudgetUsd: 1,
		});

		await guardrail.after?.(ctx('call-1'), usage());

		expect(await ledger.read('session-1')).toBe(0);
		expect(await ledger.read(monthKey('agent-1'))).toBe(0);
		await expect(guardrail.before?.(ctx('call-2'))).resolves.toEqual({ action: 'allow' });
	});

	it('fires onNotice once when the month total crosses the alert line', async () => {
		const ledger = spendLedger();
		const onNotice = vi.fn();
		const guardrail = createBudgetGuardrail({
			ledger,
			sessionId: 'session-1',
			agentId: 'agent-1',
			monthlyBudgetUsd: 100,
			alertThresholdPercent: 80,
			onNotice,
		});

		await guardrail.after?.(ctx('call-1'), usage(70));
		await guardrail.after?.(ctx('call-2'), usage(20));
		await guardrail.after?.(ctx('call-2'), usage(20));
		await guardrail.after?.(ctx('call-3'), usage(5));

		expect(onNotice).toHaveBeenCalledTimes(1);
		expect(onNotice).toHaveBeenCalledWith({ code: 'budget.alert' });
	});

	it('does not stop or record when a budget is 0', async () => {
		const ledger = spendLedger();
		const guardrail = createBudgetGuardrail({
			ledger,
			sessionId: 'session-1',
			agentId: 'agent-1',
			sessionCostCapUsd: 0,
			monthlyBudgetUsd: 0,
		});

		await expect(guardrail.before?.(ctx('call-1'))).resolves.toEqual({ action: 'allow' });
		await guardrail.after?.(ctx('call-1'), usage(5));
		expect(await ledger.read('session-1')).toBe(0);
		expect(await ledger.read(monthKey('agent-1'))).toBe(0);
	});

	it('charges a guardrail call onto the session and the month, once per call id', async () => {
		vi.mocked(computeSideCallCost).mockResolvedValue(6);
		const ledger = spendLedger();
		const onNotice = vi.fn();
		const budget = {
			ledger,
			sessionId: 'session-1',
			agentId: 'agent-1',
			sessionCostCapUsd: 1,
			monthlyBudgetUsd: 10,
			alertThresholdPercent: 50,
			onNotice,
		};
		const usage = { inputTokens: 6, outputTokens: 0, totalTokens: 6 };

		await chargeModelSpend({ modelId: 'openai/gpt-4o-mini', usage, callId: 'call-1', budget });
		await chargeModelSpend({ modelId: 'openai/gpt-4o-mini', usage, callId: 'call-1', budget });

		expect(computeSideCallCost).toHaveBeenCalledWith(
			'openai/gpt-4o-mini',
			expect.objectContaining({ promptTokens: 6, completionTokens: 0 }),
		);
		expect(await ledger.read('session-1')).toBe(6);
		expect(await ledger.read(monthKey('agent-1'))).toBe(6);
		expect(onNotice).toHaveBeenCalledTimes(1);
		expect(onNotice).toHaveBeenCalledWith({ code: 'budget.alert' });

		const guardrail = createBudgetGuardrail(budget);
		await expect(guardrail.before?.(ctx('call-2'))).resolves.toEqual({
			action: 'stop',
			code: 'budget.session',
		});
	});

	it('adds nothing when the model has no price', async () => {
		vi.mocked(computeSideCallCost).mockResolvedValueOnce(undefined);
		const ledger = spendLedger();
		await chargeModelSpend({
			modelId: 'openai/gpt-4o-mini',
			usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
			callId: 'call-1',
			budget: {
				ledger,
				sessionId: 'session-1',
				agentId: 'agent-1',
				sessionCostCapUsd: 1,
				monthlyBudgetUsd: 1,
			},
		});

		expect(await ledger.read('session-1')).toBe(0);
		expect(await ledger.read(monthKey('agent-1'))).toBe(0);
	});

	it('adds nothing when pricing throws', async () => {
		vi.mocked(computeSideCallCost).mockRejectedValueOnce(new Error('catalog down'));
		const ledger = spendLedger();
		await chargeModelSpend({
			modelId: 'openai/gpt-4o-mini',
			usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
			callId: 'call-1',
			budget: {
				ledger,
				sessionId: 'session-1',
				agentId: 'agent-1',
				sessionCostCapUsd: 1,
			},
		});

		expect(await ledger.read('session-1')).toBe(0);
	});

	it('stops with budget.misconfigured when a limit has no id', async () => {
		const ledger = spendLedger();
		const missingSession = createBudgetGuardrail({ ledger, sessionCostCapUsd: 1 });
		const missingAgent = createBudgetGuardrail({ ledger, monthlyBudgetUsd: 1 });

		await expect(missingSession.before?.(ctx('call-1'))).resolves.toEqual({
			action: 'stop',
			code: 'budget.misconfigured',
		});
		await expect(missingAgent.before?.(ctx('call-1'))).resolves.toEqual({
			action: 'stop',
			code: 'budget.misconfigured',
		});
	});
});
