import type { ExecutionOptions, RunOptions, SpendLedger } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { AiGatewayService } from '@/services/ai-gateway.service';
import { AiService } from '@/services/ai.service';
import { OwnershipService } from '@/services/ownership.service';

import { AgentBudgetAlertService } from '../agent-budget-alert.service';
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
	const budgetAlert = mock<AgentBudgetAlertService>();

	beforeEach(() => {
		budgetAlert.notifyMonthlyThreshold.mockReset();
		Container.set(AgentBudgetAlertService, budgetAlert);
	});

	afterEach(() => {
		Container.reset();
	});

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

describe('withBudgetGuardrail wallet preflight', () => {
	const gateway = mock<AiGatewayService>();
	const callCtx = { callId: 'call-1', model: 'openai/gpt-4o-mini', source: 'turn' as const };

	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(AiGatewayService, gateway);
		Container.set(Logger, mock<Logger>());
	});

	afterEach(() => {
		Container.reset();
	});

	it('attaches the preflight with no budget bucket when the model runs on Gateway credits', () => {
		const attached = withBudgetGuardrail(base, {
			sessionId: 'thread-1',
			agentId: 'agent-1',
			gatewayWallet: { userId: 'user-1' },
		});

		expect(attached).not.toBe(base);
		expect(attached.guardrails?.hooks).toHaveLength(1);
	});

	it('stops the next model call with budget.credits when the wallet is empty', async () => {
		gateway.resolveWalletOwner.mockResolvedValue('user-1');
		gateway.getWallet.mockResolvedValue({ budget: 10, balance: 0, hasEverToppedUp: true });
		const attached = withBudgetGuardrail(base, {
			sessionId: 'thread-1',
			agentId: 'agent-1',
			gatewayWallet: { userId: 'user-1', projectId: 'project-1' },
		});
		const hook = attached.guardrails?.hooks[0];
		if (!hook?.before) throw new Error('Expected a wallet preflight hook');

		await expect(hook.before(callCtx)).resolves.toEqual({
			action: 'stop',
			code: 'budget.credits',
		});
		expect(gateway.resolveWalletOwner).toHaveBeenCalledWith({
			userId: 'user-1',
			projectId: 'project-1',
		});
		expect(gateway.getWallet).toHaveBeenCalledWith('user-1');
	});

	it('lets the call run when the wallet has a balance', async () => {
		gateway.resolveWalletOwner.mockResolvedValue('user-1');
		gateway.getWallet.mockResolvedValue({ budget: 10, balance: 0.5, hasEverToppedUp: true });
		const attached = withBudgetGuardrail(base, {
			sessionId: 'thread-1',
			agentId: 'agent-1',
			gatewayWallet: { userId: 'user-1' },
		});
		const hook = attached.guardrails?.hooks[0];
		if (!hook?.before) throw new Error('Expected a wallet preflight hook');

		await expect(hook.before(callCtx)).resolves.toEqual({ action: 'allow' });
	});

	it('runs the preflight before the cap checks when a bucket is on', async () => {
		gateway.resolveWalletOwner.mockResolvedValue('user-1');
		gateway.getWallet.mockResolvedValue({ budget: 10, balance: 0, hasEverToppedUp: true });
		const attached = withBudgetGuardrail(base, {
			ledger: spendLedger(),
			budget: { enabled: true, monthlyBudgetUsd: 20 },
			sessionId: 'thread-1',
			agentId: 'agent-1',
			gatewayWallet: { userId: 'user-1' },
		});

		expect(attached.guardrails?.hooks).toHaveLength(2);
		const hook = attached.guardrails?.hooks[0];
		if (!hook?.before) throw new Error('Expected a wallet preflight hook');
		await expect(hook.before(callCtx)).resolves.toEqual({
			action: 'stop',
			code: 'budget.credits',
		});
	});

	it('lets the call run when no wallet owner can be resolved', async () => {
		gateway.resolveWalletOwner.mockResolvedValue(undefined);
		const attached = withBudgetGuardrail(base, {
			sessionId: 'thread-1',
			agentId: 'agent-1',
			gatewayWallet: { projectId: 'project-1' },
		});
		const hook = attached.guardrails?.hooks[0];
		if (!hook?.before) throw new Error('Expected a wallet preflight hook');

		await expect(hook.before(callCtx)).resolves.toEqual({ action: 'allow' });
		expect(gateway.getWallet).not.toHaveBeenCalled();
	});

	it('lets the call run when the wallet read fails', async () => {
		gateway.resolveWalletOwner.mockResolvedValue('user-1');
		gateway.getWallet.mockRejectedValue(new Error('gateway unreachable'));
		const attached = withBudgetGuardrail(base, {
			sessionId: 'thread-1',
			agentId: 'agent-1',
			gatewayWallet: { userId: 'user-1' },
		});
		const hook = attached.guardrails?.hooks[0];
		if (!hook?.before) throw new Error('Expected a wallet preflight hook');

		await expect(hook.before(callCtx)).resolves.toEqual({ action: 'allow' });
		expect(Container.get(Logger).warn).toHaveBeenCalledWith(
			'Gateway credits wallet check failed; letting the call run',
			{ error: 'gateway unreachable' },
		);
	});

	it('attaches nothing for an own-key agent with no budget bucket', () => {
		const attached = withBudgetGuardrail(base, {
			sessionId: 'thread-1',
			agentId: 'agent-1',
		});

		expect(attached).toBe(base);
		expect(attached.guardrails).toBeUndefined();
	});
});

describe('withBudgetGuardrail free AI credits preflight', () => {
	const callCtx = { callId: 'call-1', model: 'openai/gpt-5', source: 'turn' as const };
	const getBuilderInstanceCredits = vi.fn();
	const ownership = {
		getPersonalProjectOwnerCached: vi.fn(),
		getInstanceOwner: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(AiService, { getClient: async () => ({ getBuilderInstanceCredits }) });
		Container.set(OwnershipService, ownership);
		Container.set(Logger, mock<Logger>());
	});

	afterEach(() => {
		Container.reset();
	});

	it('attaches the preflight with no budget bucket when the model runs on free credits', () => {
		const attached = withBudgetGuardrail(base, {
			sessionId: 'thread-1',
			agentId: 'agent-1',
			freeAiCredits: { userId: 'user-1' },
		});

		expect(attached).not.toBe(base);
		expect(attached.guardrails?.hooks).toHaveLength(1);
	});

	it('stops the next model call with budget.freeCredits when the quota is exhausted', async () => {
		getBuilderInstanceCredits.mockResolvedValue({ creditsQuota: 100, creditsClaimed: 100 });
		const attached = withBudgetGuardrail(base, {
			sessionId: 'thread-1',
			agentId: 'agent-1',
			freeAiCredits: { userId: 'user-1' },
		});
		const hook = attached.guardrails?.hooks[0];
		if (!hook?.before) throw new Error('Expected a free-credits preflight hook');

		await expect(hook.before(callCtx)).resolves.toEqual({
			action: 'stop',
			code: 'budget.freeCredits',
		});
		expect(getBuilderInstanceCredits).toHaveBeenCalledWith({ id: 'user-1' });
	});

	it('lets the call run while quota remains', async () => {
		getBuilderInstanceCredits.mockResolvedValue({ creditsQuota: 100, creditsClaimed: 99.5 });
		const attached = withBudgetGuardrail(base, {
			sessionId: 'thread-1',
			agentId: 'agent-1',
			freeAiCredits: { userId: 'user-1' },
		});
		const hook = attached.guardrails?.hooks[0];
		if (!hook?.before) throw new Error('Expected a free-credits preflight hook');

		await expect(hook.before(callCtx)).resolves.toEqual({ action: 'allow' });
	});

	it('lets the call run on an unlimited quota', async () => {
		getBuilderInstanceCredits.mockResolvedValue({ creditsQuota: -1, creditsClaimed: 500 });
		const attached = withBudgetGuardrail(base, {
			sessionId: 'thread-1',
			agentId: 'agent-1',
			freeAiCredits: { userId: 'user-1' },
		});
		const hook = attached.guardrails?.hooks[0];
		if (!hook?.before) throw new Error('Expected a free-credits preflight hook');

		await expect(hook.before(callCtx)).resolves.toEqual({ action: 'allow' });
	});

	it('resolves the personal project owner when the run has no user', async () => {
		ownership.getPersonalProjectOwnerCached.mockResolvedValue({ id: 'owner-1' });
		getBuilderInstanceCredits.mockResolvedValue({ creditsQuota: 100, creditsClaimed: 100 });
		const attached = withBudgetGuardrail(base, {
			sessionId: 'thread-1',
			agentId: 'agent-1',
			freeAiCredits: { projectId: 'project-1' },
		});
		const hook = attached.guardrails?.hooks[0];
		if (!hook?.before) throw new Error('Expected a free-credits preflight hook');

		await expect(hook.before(callCtx)).resolves.toEqual({
			action: 'stop',
			code: 'budget.freeCredits',
		});
		expect(getBuilderInstanceCredits).toHaveBeenCalledWith({ id: 'owner-1' });
	});

	it('lets the call run when the quota read fails', async () => {
		getBuilderInstanceCredits.mockRejectedValue(new Error('proxy unreachable'));
		const attached = withBudgetGuardrail(base, {
			sessionId: 'thread-1',
			agentId: 'agent-1',
			freeAiCredits: { userId: 'user-1' },
		});
		const hook = attached.guardrails?.hooks[0];
		if (!hook?.before) throw new Error('Expected a free-credits preflight hook');

		await expect(hook.before(callCtx)).resolves.toEqual({ action: 'allow' });
		expect(Container.get(Logger).warn).toHaveBeenCalledWith(
			'Free AI credits quota check failed; letting the call run',
			{ error: 'proxy unreachable' },
		);
	});
});
