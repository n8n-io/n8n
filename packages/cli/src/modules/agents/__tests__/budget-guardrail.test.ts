import { InMemorySpendLedger, type ExecutionOptions, type RunOptions } from '@n8n/agents';

import { withBudgetGuardrail } from '../budget-guardrail';

const base: RunOptions & ExecutionOptions = {
	persistence: { threadId: 'thread-1', resourceId: 'user-1' },
};
const saved = {
	enabled: false as const,
	monthlyBudgetUsd: 20,
	alertThresholdPercent: 80,
	sessionCostCapUsd: 2,
};

describe('withBudgetGuardrail', () => {
	const ledger = new InMemorySpendLedger();

	it('attaches nothing when budget is missing or turned off', () => {
		expect(
			withBudgetGuardrail(base, { ledger, sessionId: 'thread-1', agentId: 'agent-1' }).guardrails,
		).toBeUndefined();

		const off = withBudgetGuardrail(base, {
			ledger,
			budget: saved,
			sessionId: 'thread-1',
			agentId: 'agent-1',
		});
		expect(off.guardrails).toBeUndefined();
		expect(off).toBe(base);
	});

	it('attaches nothing when every amount is 0', () => {
		const attached = withBudgetGuardrail(base, {
			ledger,
			budget: { enabled: true, monthlyBudgetUsd: 0, sessionCostCapUsd: 0 },
			sessionId: 'thread-1',
			agentId: 'agent-1',
		});

		expect(attached.guardrails).toBeUndefined();
		expect(attached).toBe(base);
	});

	it('attaches one hook when the guardrail is on', () => {
		const attached = withBudgetGuardrail(base, {
			ledger,
			budget: { ...saved, enabled: true },
			sessionId: 'thread-1',
			agentId: 'agent-1',
		});

		expect(attached.guardrails?.hooks).toHaveLength(1);
	});
});
