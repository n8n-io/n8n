import type { Mock } from 'vitest';
import type { User } from '@n8n/db';
import type { BuilderUsageItem } from '@n8n/instance-ai';

import { InstanceAiCreditService } from '../instance-ai-credit.service';
import type { InstanceAiThreadRepository } from '../repositories/instance-ai-thread.repository';

// Skip the real backoff sleeps so retry tests run instantly.
vi.mock('n8n-workflow', async () => ({
	...(await vi.importActual<typeof import('n8n-workflow')>('n8n-workflow')),
	sleep: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createService(deps: {
	threadRepo: Partial<InstanceAiThreadRepository>;
	aiService: { isProxyEnabled: Mock; getClient: Mock };
	push: { sendToUsers: Mock };
	telemetry: { track: Mock };
}) {
	const scopedLogger = { warn: vi.fn(), debug: vi.fn() };
	const logger = { scoped: vi.fn().mockReturnValue(scopedLogger) };
	return new InstanceAiCreditService(
		logger as never,
		deps.aiService as never,
		deps.telemetry as never,
		{ instanceId: 'inst-1' } as never,
		deps.push as never,
		deps.threadRepo as never,
	);
}

function claimedRunIds(service: InstanceAiCreditService) {
	return (service as unknown as { claimedRunIds: Set<string> }).claimedRunIds;
}

function createMockThreadRepo(
	thread?: { id: string; metadata: Record<string, unknown> | null } | null,
) {
	return {
		findOneBy: vi.fn().mockResolvedValue(thread ?? null),
		save: vi.fn().mockImplementation(async (entity: unknown) => entity),
	};
}

function createMockAiService(
	opts: {
		proxyEnabled?: boolean;
		claimResult?: unknown;
		claimError?: Error;
		failuresBeforeSuccess?: number;
	} = {},
) {
	const {
		proxyEnabled = true,
		claimResult = { delta: 0.5, creditsClaimed: 5.5, creditsQuota: 100 },
		claimError,
		failuresBeforeSuccess = 0,
	} = opts;
	let markBuilderTokenUsage: Mock;
	if (claimError) {
		markBuilderTokenUsage = vi.fn().mockRejectedValue(claimError);
	} else if (failuresBeforeSuccess > 0) {
		let calls = 0;
		markBuilderTokenUsage = vi.fn().mockImplementation(async () => {
			calls += 1;
			if (calls <= failuresBeforeSuccess) throw new Error('transient');
			return claimResult;
		});
	} else {
		markBuilderTokenUsage = vi.fn().mockResolvedValue(claimResult);
	}
	return {
		isProxyEnabled: vi.fn().mockReturnValue(proxyEnabled),
		getClient: vi.fn().mockResolvedValue({
			getBuilderApiProxyToken: vi
				.fn()
				.mockResolvedValue({ tokenType: 'Bearer', accessToken: 'tok' }),
			markBuilderTokenUsage,
		}),
		__markBuilderTokenUsage: markBuilderTokenUsage,
	};
}

const fakeUser = { id: 'user-1' } as User;
const usage: BuilderUsageItem[] = [
	{
		type: 'llmTokens',
		model: 'anthropic/claude-sonnet-4-6',
		uncachedInput: 1500,
		cacheRead: 0,
		cacheWrite: 0,
		output: 0,
	},
];

async function callClaim(
	service: InstanceAiCreditService,
	args: {
		threadId?: string;
		dedupeId?: string;
		usage?: BuilderUsageItem[];
		status?: 'completed' | 'cancelled' | 'errored';
	} = {},
) {
	return await service.claimRunUsage(
		fakeUser,
		args.threadId ?? 't1',
		args.dedupeId ?? 'run-1',
		args.usage ?? usage,
		args.status ?? 'completed',
	);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('claimRunUsage', () => {
	it('claims token usage and accumulates the delta into thread metadata', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: { creditsUsed: 2 } });
		const ai = createMockAiService({
			claimResult: { delta: 0.5, creditsClaimed: 5.5, creditsQuota: 100 },
		});
		const push = { sendToUsers: vi.fn() };
		const telemetry = { track: vi.fn() };

		const service = createService({ threadRepo, aiService: ai, push, telemetry });
		const delta = await callClaim(service);

		expect(ai.__markBuilderTokenUsage).toHaveBeenCalledWith(
			{ id: 'user-1' },
			{ Authorization: 'Bearer tok' },
			{ dedupeId: 'run-1', usage },
		);
		expect(threadRepo.save).toHaveBeenCalledWith(
			expect.objectContaining({ metadata: expect.objectContaining({ creditsUsed: 2.5 }) }),
		);
		expect(push.sendToUsers).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'updateInstanceAiCredits',
				data: {
					creditsQuota: 100,
					creditsClaimed: 5.5,
					creditsPerThread: { threadId: 't1', totalCreditsUsed: 2.5 },
				},
			}),
			['user-1'],
		);
		expect(delta).toBe(0.5);
	});

	it('fires the "Builder credits claimed" event with success true on the happy path', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
		const ai = createMockAiService();
		const push = { sendToUsers: vi.fn() };
		const telemetry = { track: vi.fn() };

		const service = createService({ threadRepo, aiService: ai, push, telemetry });
		await callClaim(service, { status: 'completed' });

		expect(telemetry.track).toHaveBeenCalledWith(
			'Builder credits claimed',
			expect.objectContaining({
				instance_id: 'inst-1',
				user_id: 'user-1',
				thread_id: 't1',
				agent_run_id: 'run-1',
				status: 'completed',
				success: true,
				credits_used: 0.5,
			}),
		);
	});

	it('bills on a cancelled run and records the status', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
		const ai = createMockAiService();
		const push = { sendToUsers: vi.fn() };
		const telemetry = { track: vi.fn() };

		const service = createService({ threadRepo, aiService: ai, push, telemetry });
		await callClaim(service, { status: 'cancelled' });

		expect(ai.__markBuilderTokenUsage).toHaveBeenCalledTimes(1);
		expect(telemetry.track).toHaveBeenCalledWith(
			'Builder credits claimed',
			expect.objectContaining({ status: 'cancelled', success: true }),
		);
	});

	it('is idempotent per dedupeId within the process', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
		const ai = createMockAiService();
		const push = { sendToUsers: vi.fn() };
		const telemetry = { track: vi.fn() };

		const service = createService({ threadRepo, aiService: ai, push, telemetry });
		await callClaim(service, { dedupeId: 'run-1' });
		await callClaim(service, { dedupeId: 'run-1' });

		expect(ai.__markBuilderTokenUsage).toHaveBeenCalledTimes(1);
	});

	it('caps the in-memory dedup guard, evicting the oldest run ids', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
		const ai = createMockAiService();
		const push = { sendToUsers: vi.fn() };
		const telemetry = { track: vi.fn() };

		const service = createService({ threadRepo, aiService: ai, push, telemetry });
		const cap = InstanceAiCreditService.CLAIM_DEDUPE_CACHE_SIZE;
		for (let i = 0; i < cap + 5; i++) {
			await callClaim(service, { dedupeId: `run-${i}` });
		}

		const ids = claimedRunIds(service);
		expect(ids.size).toBe(cap);
		expect(ids.has('run-0')).toBe(false); // oldest evicted
		expect(ids.has(`run-${cap + 4}`)).toBe(true); // most recent retained
	});

	it('releases the in-memory lock when the claim ultimately fails', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
		const ai = createMockAiService({ claimError: new Error('network') });
		const push = { sendToUsers: vi.fn() };
		const telemetry = { track: vi.fn() };

		const service = createService({ threadRepo, aiService: ai, push, telemetry });
		await callClaim(service, { dedupeId: 'run-1' });

		// Lock released so a later invocation can re-attempt the claim.
		expect(claimedRunIds(service).has('run-1')).toBe(false);
	});

	it('retries a transient claim failure and succeeds on a later attempt', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
		const ai = createMockAiService({
			failuresBeforeSuccess: 1,
			claimResult: { delta: 0.5, creditsClaimed: 5.5, creditsQuota: 100 },
		});
		const push = { sendToUsers: vi.fn() };
		const telemetry = { track: vi.fn() };

		const service = createService({ threadRepo, aiService: ai, push, telemetry });
		const delta = await callClaim(service);

		expect(ai.__markBuilderTokenUsage).toHaveBeenCalledTimes(2);
		expect(delta).toBe(0.5);
		expect(telemetry.track).toHaveBeenCalledWith(
			'Builder credits claimed',
			expect.objectContaining({ success: true }),
		);
	});

	it('gives up after the maximum number of attempts', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
		const ai = createMockAiService({ claimError: new Error('network') });
		const push = { sendToUsers: vi.fn() };
		const telemetry = { track: vi.fn() };

		const service = createService({ threadRepo, aiService: ai, push, telemetry });
		const delta = await callClaim(service);

		expect(ai.__markBuilderTokenUsage).toHaveBeenCalledTimes(3);
		expect(delta).toBeUndefined();
		expect(telemetry.track).toHaveBeenCalledWith(
			'Builder credits claimed',
			expect.objectContaining({ success: false }),
		);
		expect(push.sendToUsers).not.toHaveBeenCalled();
	});

	it('keeps the claim successful when persisting the thread total fails', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: { creditsUsed: 2 } });
		threadRepo.save = vi.fn().mockRejectedValue(new Error('db down'));
		const ai = createMockAiService({
			claimResult: { delta: 0.5, creditsClaimed: 5.5, creditsQuota: 100 },
		});
		const push = { sendToUsers: vi.fn() };
		const telemetry = { track: vi.fn() };

		const service = createService({ threadRepo, aiService: ai, push, telemetry });
		const delta = await callClaim(service);

		// The authoritative claim succeeded, so the delta and lock are retained.
		expect(delta).toBe(0.5);
		expect(claimedRunIds(service).has('run-1')).toBe(true);
		// Instance-level credits still update, but the per-thread total is omitted.
		expect(push.sendToUsers).toHaveBeenCalledWith(
			{
				type: 'updateInstanceAiCredits',
				data: { creditsQuota: 100, creditsClaimed: 5.5 },
			},
			['user-1'],
		);
		expect(telemetry.track).toHaveBeenCalledWith(
			'Builder credits claimed',
			expect.objectContaining({ success: true }),
		);
		expect(telemetry.track).not.toHaveBeenCalledWith(
			'Builder credits claimed',
			expect.objectContaining({ success: false }),
		);
	});

	it('fires the "Builder credits claimed" event with success false when the claim throws', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
		const ai = createMockAiService({ claimError: new Error('network') });
		const push = { sendToUsers: vi.fn() };
		const telemetry = { track: vi.fn() };

		const service = createService({ threadRepo, aiService: ai, push, telemetry });
		await callClaim(service);

		expect(telemetry.track).toHaveBeenCalledWith(
			'Builder credits claimed',
			expect.objectContaining({ success: false }),
		);
		expect(push.sendToUsers).not.toHaveBeenCalled();
	});

	it('does nothing when the usage array is empty', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
		const ai = createMockAiService();
		const push = { sendToUsers: vi.fn() };
		const telemetry = { track: vi.fn() };

		const service = createService({ threadRepo, aiService: ai, push, telemetry });
		await callClaim(service, { usage: [] });

		expect(ai.getClient).not.toHaveBeenCalled();
		expect(push.sendToUsers).not.toHaveBeenCalled();
	});

	it('does nothing when the proxy is disabled', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
		const ai = createMockAiService({ proxyEnabled: false });
		const push = { sendToUsers: vi.fn() };
		const telemetry = { track: vi.fn() };

		const service = createService({ threadRepo, aiService: ai, push, telemetry });
		await callClaim(service);

		expect(ai.getClient).not.toHaveBeenCalled();
	});

	it('ignores a malformed claim response with a non-numeric delta', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
		const ai = createMockAiService({ claimResult: { creditsClaimed: 5, creditsQuota: 100 } });
		const push = { sendToUsers: vi.fn() };
		const telemetry = { track: vi.fn() };

		const service = createService({ threadRepo, aiService: ai, push, telemetry });
		const result = await callClaim(service);

		expect(threadRepo.save).not.toHaveBeenCalled();
		expect(push.sendToUsers).not.toHaveBeenCalled();
		expect(result).toBeUndefined();
	});

	describe('User exhausted assistant quota', () => {
		it('fires once when usage crosses from under to over quota', async () => {
			const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
			// claimedCount 100 >= quota 100, and was under before (100 - 0.5 = 99.5 < 100)
			const ai = createMockAiService({
				claimResult: { delta: 0.5, creditsClaimed: 100, creditsQuota: 100 },
			});
			const push = { sendToUsers: vi.fn() };
			const telemetry = { track: vi.fn() };

			const service = createService({ threadRepo, aiService: ai, push, telemetry });
			await callClaim(service);

			expect(telemetry.track).toHaveBeenCalledWith('User exhausted assistant quota', {
				instance_id: 'inst-1',
				user_id: 'user-1',
			});
		});

		it('does not fire when already over quota before this claim', async () => {
			const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
			// was already over: 120 - 0.5 = 119.5 >= 100
			const ai = createMockAiService({
				claimResult: { delta: 0.5, creditsClaimed: 120, creditsQuota: 100 },
			});
			const push = { sendToUsers: vi.fn() };
			const telemetry = { track: vi.fn() };

			const service = createService({ threadRepo, aiService: ai, push, telemetry });
			await callClaim(service);

			expect(telemetry.track).not.toHaveBeenCalledWith(
				'User exhausted assistant quota',
				expect.anything(),
			);
		});
	});

	describe('invalid quota', () => {
		it('throws when the proxy returns a negative credits quota', async () => {
			const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
			// A negative quota (e.g. UNLIMITED_CREDITS -1) is never valid in the billing
			// path — the proxy is enabled here, so a real quota is always expected.
			const ai = createMockAiService({
				claimResult: { delta: 0.5, creditsClaimed: 5.5, creditsQuota: -1 },
			});
			const push = { sendToUsers: vi.fn() };
			const telemetry = { track: vi.fn() };

			const service = createService({ threadRepo, aiService: ai, push, telemetry });

			await expect(callClaim(service)).rejects.toThrow();
			// The bad quota is surfaced before any best-effort display work runs.
			expect(push.sendToUsers).not.toHaveBeenCalled();
		});
	});
});
