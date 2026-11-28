import type { ExecutionOptions, RunOptions, SpendLedger } from '@n8n/agents';
import { Container } from '@n8n/di';
import { APICallError } from 'ai';
import { mock } from 'vitest-mock-extended';

import { classifyGatewayError } from '../utils/gateway-error-classifier';

import { AgentBudgetAlertService } from '../agent-budget-alert.service';
import { budgetSessionKey, withBudgetGuardrail } from '../budget-guardrail';

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
	const budgetAlert = mock<AgentBudgetAlertService>();

	beforeEach(() => {
		budgetAlert.notifyMonthlyThreshold.mockReset();
		Container.set(AgentBudgetAlertService, budgetAlert);
	});

	afterEach(() => {
		Container.reset();
	});

	it('attaches nothing for an own-key run when budget is missing or turned off', () => {
		const noBudget = withBudgetGuardrail(base, {
			ledger,
			sessionId: 'thread-1',
			agentId: 'agent-1',
		});
		expect(noBudget.guardrails).toBeUndefined();
		expect(noBudget.classifyModelError).toBeUndefined();

		const off = withBudgetGuardrail(base, {
			ledger,
			budget: saved,
			sessionId: 'thread-1',
			agentId: 'agent-1',
		});
		expect(off.guardrails).toBeUndefined();
		expect(off.classifyModelError).toBeUndefined();
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
		expect(attached.classifyModelError).toBeUndefined();
		expect(attached).toBe(base);
	});

	it('attaches the classifier only for a Gateway credits model', () => {
		const ownKey = withBudgetGuardrail(base, {
			ledger,
			sessionId: 'thread-1',
			agentId: 'agent-1',
		});
		expect(ownKey.classifyModelError).toBeUndefined();

		const gateway = withBudgetGuardrail(base, {
			ledger,
			sessionId: 'thread-1',
			agentId: 'agent-1',
			modelCredentialGatewayManaged: true,
		});
		expect(gateway.classifyModelError).toBe(classifyGatewayError);
	});

	it('maps a gateway 402 to a budget.credits stop through the attached classifier', () => {
		const attached = withBudgetGuardrail(base, {
			ledger,
			sessionId: 'thread-1',
			agentId: 'agent-1',
			modelCredentialGatewayManaged: true,
		});

		const depleted = new APICallError({
			message: 'Payment Required',
			url: 'https://gateway.example/v1/responses',
			requestBodyValues: {},
			statusCode: 402,
			responseBody: '{"error":"Your Gateway credits have been depleted"}',
		});
		expect(attached.classifyModelError?.(depleted)).toEqual({ code: 'budget.credits' });

		const other = new APICallError({
			message: 'Internal Server Error',
			url: 'https://gateway.example/v1/responses',
			requestBodyValues: {},
			statusCode: 500,
		});
		expect(attached.classifyModelError?.(other)).toBeUndefined();
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
		expect(budgetAlert.notifyMonthlyThreshold).not.toHaveBeenCalled();

		// 10 + 8 = 18 crosses the line. One email, on that crossing only.
		await hook.after(ctx('call-2'), usage(8));
		expect(onNotice).toHaveBeenCalledOnce();
		expect(onNotice).toHaveBeenCalledWith({ code: 'budget.alert' });
		expect(budgetAlert.notifyMonthlyThreshold).toHaveBeenCalledOnce();
		expect(budgetAlert.notifyMonthlyThreshold).toHaveBeenCalledWith({
			agentId: 'agent-1',
			alertThresholdPercent: 80,
		});

		// Already past the line. A later request does not send again.
		await hook.after(ctx('call-3'), usage(1));
		expect(onNotice).toHaveBeenCalledOnce();
		expect(budgetAlert.notifyMonthlyThreshold).toHaveBeenCalledOnce();

		// A retry of the crossing call does not send again.
		await hook.after(ctx('call-2'), usage(8));
		expect(budgetAlert.notifyMonthlyThreshold).toHaveBeenCalledOnce();
	});

	it('installs the notice sink without a hook when no budget bucket is on', () => {
		const onNotice = vi.fn();
		const attached = withBudgetGuardrail(base, {
			ledger,
			sessionId: 'thread-1',
			agentId: 'agent-1',
			onNotice,
		});

		expect(attached).not.toBe(base);
		expect(attached.guardrails?.hooks).toEqual([]);
		const sink = attached.guardrails?.onNotice;
		expect(sink).toBeDefined();
		sink?.({ code: 'budget.alert', agentId: 'child-1' });
		expect(onNotice).toHaveBeenCalledWith({ code: 'budget.alert', agentId: 'child-1' });
		sink?.({ code: 'pii.block' });
		expect(onNotice).toHaveBeenCalledTimes(1);
	});

	it('exposes a notice sink that forwards budget codes and drops others', () => {
		const onNotice = vi.fn();
		const attached = withBudgetGuardrail(base, {
			ledger,
			budget: { ...saved, enabled: true },
			sessionId: 'thread-1',
			agentId: 'agent-1',
			onNotice,
		});

		const sink = attached.guardrails?.onNotice;
		expect(sink).toBeDefined();
		sink?.({ code: 'budget.session', agentId: 'child-1' });
		expect(onNotice).toHaveBeenCalledWith({ code: 'budget.session', agentId: 'child-1' });
		sink?.({ code: 'pii.block' });
		expect(onNotice).toHaveBeenCalledTimes(1);
	});

	it('adds no sink when no input notice is given', () => {
		const attached = withBudgetGuardrail(base, {
			ledger,
			budget: { ...saved, enabled: true },
			sessionId: 'thread-1',
			agentId: 'agent-1',
		});

		expect(attached.guardrails?.onNotice).toBeUndefined();
	});

	it('keeps an existing guardrails onNotice when no input notice is given', () => {
		const existing = vi.fn();
		const attached = withBudgetGuardrail(
			{ ...base, guardrails: { hooks: [], onNotice: existing } },
			{
				ledger,
				budget: { ...saved, enabled: true },
				sessionId: 'thread-1',
				agentId: 'agent-1',
			},
		);

		expect(attached.guardrails?.onNotice).toBe(existing);
	});

	it('emails the saved agent when a workflow run crosses the alert on a telemetry id', async () => {
		const freshLedger = spendLedger();
		const attached = withBudgetGuardrail(base, {
			ledger: freshLedger,
			budget: { enabled: true, monthlyBudgetUsd: 20, alertThresholdPercent: 80 },
			sessionId: 'thread-1',
			agentId: 'inline:wf-1:Message an Agent',
			alertAgentId: 'agent-1',
		});
		const hook = attached.guardrails?.hooks[0];
		if (!hook?.after) throw new Error('Expected a budget guardrail hook');

		await hook.after(
			{ callId: 'call-1', model: 'openai/gpt-4o-mini', source: 'turn' },
			{ promptTokens: 1, completionTokens: 1, totalTokens: 2, cost: 17 },
		);

		expect(budgetAlert.notifyMonthlyThreshold).toHaveBeenCalledOnce();
		expect(budgetAlert.notifyMonthlyThreshold).toHaveBeenCalledWith({
			agentId: 'agent-1',
			alertThresholdPercent: 80,
		});
	});

	it('sends no alert email for an inline workflow run', async () => {
		const freshLedger = spendLedger();
		const attached = withBudgetGuardrail(base, {
			ledger: freshLedger,
			budget: { enabled: true, monthlyBudgetUsd: 20, alertThresholdPercent: 80 },
			sessionId: 'thread-1',
			agentId: 'inline:wf-1:Message an Agent',
		});
		const hook = attached.guardrails?.hooks[0];
		if (!hook?.after) throw new Error('Expected a budget guardrail hook');

		await hook.after(
			{ callId: 'call-1', model: 'openai/gpt-4o-mini', source: 'turn' },
			{ promptTokens: 1, completionTokens: 1, totalTokens: 2, cost: 17 },
		);

		expect(budgetAlert.notifyMonthlyThreshold).not.toHaveBeenCalled();
	});

	it('sends no alert email when the alert percent is off', async () => {
		const freshLedger = spendLedger();
		const attached = withBudgetGuardrail(base, {
			ledger: freshLedger,
			budget: { enabled: true, monthlyBudgetUsd: 20 },
			sessionId: 'thread-1',
			agentId: 'agent-1',
		});
		const hook = attached.guardrails?.hooks[0];
		if (!hook?.after) throw new Error('Expected a budget guardrail hook');

		await hook.after(
			{ callId: 'call-1', model: 'openai/gpt-4o-mini', source: 'turn' },
			{ promptTokens: 1, completionTokens: 1, totalTokens: 2, cost: 20 },
		);

		expect(budgetAlert.notifyMonthlyThreshold).not.toHaveBeenCalled();
	});
});

describe('budgetSessionKey', () => {
	const day = new Date('2026-11-27T23:59:00.000Z');

	it.each([
		['a Preview chat', 'draft-chat:user-1'],
		['an integration chat', 'integration:slack:U1'],
		['a task run', 'task:task-1'],
		['a run without a resource', undefined],
	])('uses the root thread for %s', (_, resourceId) => {
		expect(budgetSessionKey({ agentId: 'agent-1', threadId: 'thread-1', resourceId }, day)).toBe(
			'thread-1',
		);
	});

	it('uses one key for every thread of an app visitor on one UTC day', () => {
		const resourceId = 'app:app-1:user:user-1';
		const first = budgetSessionKey({ agentId: 'agent-1', threadId: 'thread-1', resourceId }, day);
		const second = budgetSessionKey({ agentId: 'agent-1', threadId: 'thread-2', resourceId }, day);

		expect(first).toMatch(/^agent-1:app-visitor:[\w-]{43}:2026-11-27$/);
		expect(second).toBe(first);
	});

	it('starts a new app visitor key on the next UTC day', () => {
		const scope = { agentId: 'agent-1', threadId: 'thread-1', resourceId: 'app:app-1:user:user-1' };
		const nextDay = new Date('2026-11-28T00:00:00.000Z');

		const next = budgetSessionKey(scope, nextDay);

		expect(next).toMatch(/^agent-1:app-visitor:[\w-]{43}:2026-11-28$/);
		expect(next).not.toBe(budgetSessionKey(scope, day));
	});

	it('keeps the key of another agent or visitor apart', () => {
		const key = (agentId: string, resourceId: string) =>
			budgetSessionKey({ agentId, threadId: 'thread-1', resourceId }, day);

		expect(key('agent-2', 'app:app-1:user:user-1')).not.toBe(
			key('agent-1', 'app:app-1:user:user-1'),
		);
		expect(key('agent-1', 'app:app-1:user:user-2')).not.toBe(
			key('agent-1', 'app:app-1:user:user-1'),
		);
	});

	it('fits the ledger key column for the longest agent id', () => {
		const uuid = '0190a8d6-4a2e-4000-8000-000000000001';
		// The agents table allows a 36-character id.
		const key = budgetSessionKey(
			{ agentId: uuid, threadId: 'thread-1', resourceId: `app:${uuid}:user:${uuid}` },
			day,
		);

		expect(key.length).toBeLessThanOrEqual(128);
	});
});
