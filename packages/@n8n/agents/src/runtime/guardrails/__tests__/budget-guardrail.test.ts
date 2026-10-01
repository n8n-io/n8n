import type { GuardrailModelCallContext, TokenUsage } from '../../../types';
import { createBudgetGuardrail, InMemorySpendLedger } from '../budget-guardrail';

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
	return `${agentId}:${new Date().toISOString().slice(0, 7)}`;
}

describe('InMemorySpendLedger', () => {
	it('does not increase totals when add repeats a callId', async () => {
		const ledger = new InMemorySpendLedger();

		await ledger.add('call-1', [
			{ key: 'session', usd: 1 },
			{ key: 'month', usd: 1 },
		]);
		const replay = await ledger.add('call-1', [
			{ key: 'session', usd: 1 },
			{ key: 'month', usd: 1 },
		]);

		expect(await ledger.read('session')).toBe(1);
		expect(await ledger.read('month')).toBe(1);
		expect(replay).toEqual([
			{ key: 'session', totalUsd: 1, previousUsd: 1 },
			{ key: 'month', totalUsd: 1, previousUsd: 1 },
		]);
	});
});

describe('createBudgetGuardrail', () => {
	it('records usage.cost on the session key and the month key when the call is under the cap', async () => {
		const ledger = new InMemorySpendLedger();
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
		const ledger = new InMemorySpendLedger();
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
		const ledger = new InMemorySpendLedger();
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
		const ledger = new InMemorySpendLedger();
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
		const ledger = new InMemorySpendLedger();
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

	it('stops with budget.misconfigured when a limit has no id', async () => {
		const ledger = new InMemorySpendLedger();
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
