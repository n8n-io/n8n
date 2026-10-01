import type { ExecutionOptions, RunOptions, SpendLedger } from '@n8n/agents';

import { withBudgetGuardrail } from '../budget-guardrail';

/** Ledger for these tests. `add` ignores a repeated `callId`. */
function spendLedger(): SpendLedger {
	const totals = new Map<string, number>();
	const appliedCallIds = new Set<string>();

	return {
		async add(callId, entries) {
			if (appliedCallIds.has(callId)) {
				return entries.map((entry) => {
					const totalUsd = totals.get(entry.key) ?? 0;
					return { key: entry.key, totalUsd, previousUsd: totalUsd };
				});
			}

			appliedCallIds.add(callId);
			return entries.map((entry) => {
				const previousUsd = totals.get(entry.key) ?? 0;
				const totalUsd = previousUsd + entry.usd;
				totals.set(entry.key, totalUsd);
				return { key: entry.key, totalUsd, previousUsd };
			});
		},
		async read(key) {
			return totals.get(key) ?? 0;
		},
	};
}

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
	const ledger = spendLedger();

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

	it('fires the attached onNotice once when the month total crosses the alert line', async () => {
		const freshLedger = spendLedger();
		const onNotice = vi.fn();
		const attached = withBudgetGuardrail(base, {
			ledger: freshLedger,
			budget: { enabled: true, monthlyBudgetUsd: 20, alertThresholdPercent: 80 },
			sessionId: 'thread-1',
			agentId: 'agent-1',
			onNotice,
		});
		const hook = attached.guardrails?.hooks[0];
		if (!hook?.after) throw new Error('Expected a budget guardrail hook');

		const ctx = (callId: string) => ({
			callId,
			model: 'openai/gpt-4o-mini',
			source: 'turn' as const,
		});
		const usage = (cost: number) => ({
			promptTokens: 1,
			completionTokens: 1,
			totalTokens: 2,
			cost,
		});

		// 10 stays below the alert line of 16 (80% of 20).
		await hook.after(ctx('call-1'), usage(10));
		expect(onNotice).not.toHaveBeenCalled();

		// 10 + 8 = 18 crosses the line.
		await hook.after(ctx('call-2'), usage(8));
		expect(onNotice).toHaveBeenCalledOnce();
		expect(onNotice).toHaveBeenCalledWith({ code: 'budget.alert' });

		// Already past the line — no second notice.
		await hook.after(ctx('call-3'), usage(1));
		expect(onNotice).toHaveBeenCalledOnce();
	});
});
