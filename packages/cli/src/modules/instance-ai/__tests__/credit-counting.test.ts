import type { z as zType } from 'zod';

// Manual mocks — must be declared before any imports that touch the mocked modules.
jest.mock('@n8n/instance-ai', () => {
	const { z } = jest.requireActual<{ z: typeof zType }>('zod');
	return {
		McpClientManager: class {
			getRegularTools = jest.fn().mockResolvedValue({});
			disconnect = jest.fn();
		},
		createDomainAccessTracker: jest.fn(),
		createSandbox: jest.fn(),
		createWorkspace: jest.fn(),
		createLazyRuntimeWorkspace: jest.fn(),
		createLazyWorkspaceRuntimeSkillSource: jest.fn(({ source }) => source),
		loadInstanceAiRuntimeSkillSource: jest.fn(() => ({
			registry: { skillsHash: 'runtime-skills-hash', skills: [] },
			loadSkill: jest.fn(),
		})),
		workflowBuildOutcomeSchema: z.object({}),
		handleBuildOutcome: jest.fn(),
		handleVerificationVerdict: jest.fn(),
		createInstanceAgent: jest.fn(),
		createAllTools: jest.fn(),
	};
});

import type { User } from '@n8n/db';
import type { BuilderUsageItem } from '@n8n/instance-ai';

import { InstanceAiService } from '../instance-ai.service';
import type { InstanceAiThreadRepository } from '../repositories/instance-ai-thread.repository';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createService(deps: {
	threadRepo: Partial<InstanceAiThreadRepository>;
	aiService: { isProxyEnabled: jest.Mock; getClient: jest.Mock };
	push: { sendToUsers: jest.Mock };
	telemetry: { track: jest.Mock };
}) {
	const service = Object.create(InstanceAiService.prototype) as InstanceType<
		typeof InstanceAiService
	>;
	Object.assign(service, {
		threadRepo: deps.threadRepo,
		aiService: deps.aiService,
		push: deps.push,
		telemetry: deps.telemetry,
		instanceSettings: { instanceId: 'inst-1' },
		claimedRunIds: new Set<string>(),
		logger: { warn: jest.fn(), debug: jest.fn() },
		// Skip real backoff sleeps so retry tests run instantly.
		wait: jest.fn().mockResolvedValue(undefined),
	});
	return service;
}

function claimedRunIds(service: InstanceType<typeof InstanceAiService>) {
	return (service as unknown as { claimedRunIds: Set<string> }).claimedRunIds;
}

function createMockThreadRepo(
	thread?: { id: string; metadata: Record<string, unknown> | null } | null,
) {
	return {
		findOneBy: jest.fn().mockResolvedValue(thread ?? null),
		save: jest.fn().mockImplementation(async (entity: unknown) => entity),
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
	let markBuilderTokenUsage: jest.Mock;
	if (claimError) {
		markBuilderTokenUsage = jest.fn().mockRejectedValue(claimError);
	} else if (failuresBeforeSuccess > 0) {
		let calls = 0;
		markBuilderTokenUsage = jest.fn().mockImplementation(async () => {
			calls += 1;
			if (calls <= failuresBeforeSuccess) throw new Error('transient');
			return claimResult;
		});
	} else {
		markBuilderTokenUsage = jest.fn().mockResolvedValue(claimResult);
	}
	return {
		isProxyEnabled: jest.fn().mockReturnValue(proxyEnabled),
		getClient: jest.fn().mockResolvedValue({
			getBuilderApiProxyToken: jest
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

function callClaim(
	service: InstanceType<typeof InstanceAiService>,
	args: {
		threadId?: string;
		dedupeId?: string;
		usage?: BuilderUsageItem[];
		status?: 'completed' | 'cancelled' | 'errored';
	} = {},
) {
	return (service as unknown as Record<string, Function>)['claimCreditsForRun'](
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

describe('claimCreditsForRun', () => {
	it('claims token usage and accumulates the delta into thread metadata', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: { creditsUsed: 2 } });
		const ai = createMockAiService({
			claimResult: { delta: 0.5, creditsClaimed: 5.5, creditsQuota: 100 },
		});
		const push = { sendToUsers: jest.fn() };
		const telemetry = { track: jest.fn() };

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
		const push = { sendToUsers: jest.fn() };
		const telemetry = { track: jest.fn() };

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
		const push = { sendToUsers: jest.fn() };
		const telemetry = { track: jest.fn() };

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
		const push = { sendToUsers: jest.fn() };
		const telemetry = { track: jest.fn() };

		const service = createService({ threadRepo, aiService: ai, push, telemetry });
		await callClaim(service, { dedupeId: 'run-1' });
		await callClaim(service, { dedupeId: 'run-1' });

		expect(ai.__markBuilderTokenUsage).toHaveBeenCalledTimes(1);
	});

	it('caps the in-memory dedup guard, evicting the oldest run ids', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
		const ai = createMockAiService();
		const push = { sendToUsers: jest.fn() };
		const telemetry = { track: jest.fn() };

		const service = createService({ threadRepo, aiService: ai, push, telemetry });
		const cap = InstanceAiService.CLAIM_DEDUPE_CACHE_SIZE;
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
		const push = { sendToUsers: jest.fn() };
		const telemetry = { track: jest.fn() };

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
		const push = { sendToUsers: jest.fn() };
		const telemetry = { track: jest.fn() };

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
		const push = { sendToUsers: jest.fn() };
		const telemetry = { track: jest.fn() };

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
		threadRepo.save = jest.fn().mockRejectedValue(new Error('db down'));
		const ai = createMockAiService({
			claimResult: { delta: 0.5, creditsClaimed: 5.5, creditsQuota: 100 },
		});
		const push = { sendToUsers: jest.fn() };
		const telemetry = { track: jest.fn() };

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
		const push = { sendToUsers: jest.fn() };
		const telemetry = { track: jest.fn() };

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
		const push = { sendToUsers: jest.fn() };
		const telemetry = { track: jest.fn() };

		const service = createService({ threadRepo, aiService: ai, push, telemetry });
		await callClaim(service, { usage: [] });

		expect(ai.getClient).not.toHaveBeenCalled();
		expect(push.sendToUsers).not.toHaveBeenCalled();
	});

	it('does nothing when the proxy is disabled', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
		const ai = createMockAiService({ proxyEnabled: false });
		const push = { sendToUsers: jest.fn() };
		const telemetry = { track: jest.fn() };

		const service = createService({ threadRepo, aiService: ai, push, telemetry });
		await callClaim(service);

		expect(ai.getClient).not.toHaveBeenCalled();
	});

	it('ignores a malformed claim response with a non-numeric delta', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
		const ai = createMockAiService({ claimResult: { creditsClaimed: 5, creditsQuota: 100 } });
		const push = { sendToUsers: jest.fn() };
		const telemetry = { track: jest.fn() };

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
			const push = { sendToUsers: jest.fn() };
			const telemetry = { track: jest.fn() };

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
			const push = { sendToUsers: jest.fn() };
			const telemetry = { track: jest.fn() };

			const service = createService({ threadRepo, aiService: ai, push, telemetry });
			await callClaim(service);

			expect(telemetry.track).not.toHaveBeenCalledWith(
				'User exhausted assistant quota',
				expect.anything(),
			);
		});
	});
});
