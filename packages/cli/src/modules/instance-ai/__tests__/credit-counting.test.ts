import type { z as zType } from 'zod';

// Manual mocks — must be declared before any imports that touch the mocked modules.
jest.mock('@n8n/instance-ai', () => {
	const { z } = jest.requireActual<{ z: typeof zType }>('zod');
	return {
		McpClientManager: class {
			disconnect = jest.fn();
		},
		createDomainAccessTracker: jest.fn(),
		BuilderSandboxFactory: class {},
		SnapshotManager: class {},
		createSandbox: jest.fn(),
		createWorkspace: jest.fn(),
		workflowBuildOutcomeSchema: z.object({}),
		handleBuildOutcome: jest.fn(),
		handleVerificationVerdict: jest.fn(),
		createInstanceAgent: jest.fn(),
		createAllTools: jest.fn(),
		createMemory: jest.fn(),
		mapMastraChunkToEvent: jest.fn(),
	};
});
jest.mock('@mastra/core/agent', () => ({}));
jest.mock('@mastra/core/storage', () => ({
	MemoryStorage: class {},
	MastraCompositeStore: class {},
	WorkflowsStorage: class {},
}));
jest.mock('@mastra/memory', () => ({
	Memory: class {},
}));
jest.mock('@mastra/core/workflows', () => ({}));

import type { User } from '@n8n/db';

import { InstanceAiService } from '../instance-ai.service';
import type { InstanceAiThreadRepository } from '../repositories/instance-ai-thread.repository';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createService(deps: {
	threadRepo: Partial<InstanceAiThreadRepository>;
	aiService: { isProxyEnabled: jest.Mock; getClient: jest.Mock };
	push: { sendToUsers: jest.Mock };
}) {
	// Bypass the constructor (it needs GlobalConfig, DI, etc.) by creating
	// from prototype and assigning only the fields countCreditsIfFirst uses.
	const service = Object.create(InstanceAiService.prototype) as InstanceType<
		typeof InstanceAiService
	>;
	Object.assign(service, {
		threadRepo: deps.threadRepo,
		aiService: deps.aiService,
		push: deps.push,
		creditedThreads: new Set<string>(),
		logger: { warn: jest.fn(), debug: jest.fn() },
	});
	return service;
}

function createMockThreadRepo(
	thread?: { id: string; metadata: Record<string, unknown> | null } | null,
) {
	return {
		findOneBy: jest.fn().mockResolvedValue(thread ?? null),
		save: jest.fn().mockImplementation(async (entity: unknown) => entity),
	};
}

function createMockAiService(opts: { proxyEnabled?: boolean; creditInfo?: unknown } = {}) {
	const { proxyEnabled = true, creditInfo = { creditsQuota: 100, creditsClaimed: 1 } } = opts;
	return {
		isProxyEnabled: jest.fn().mockReturnValue(proxyEnabled),
		getClient: jest.fn().mockResolvedValue({
			getBuilderApiProxyToken: jest
				.fn()
				.mockResolvedValue({ tokenType: 'Bearer', accessToken: 'tok' }),
			markBuilderSuccess: jest.fn().mockResolvedValue(creditInfo),
		}),
	};
}

const fakeUser = { id: 'user-1' } as User;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('countCreditsIfFirst', () => {
	const callCountCredits = async (service: InstanceType<typeof InstanceAiService>) =>
		await (service as unknown as Record<string, Function>)['countCreditsIfFirst'](
			fakeUser,
			't1',
			'run-1',
		);

	it('should call markBuilderSuccess and persist creditCounted in metadata', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
		const ai = createMockAiService();
		const push = { sendToUsers: jest.fn() };

		const service = createService({ threadRepo, aiService: ai, push });
		await callCountCredits(service);

		const client = await ai.getClient();
		expect(client.markBuilderSuccess).toHaveBeenCalledTimes(1);
		expect(threadRepo.save).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: expect.objectContaining({ creditCounted: true }),
			}),
		);
		expect(push.sendToUsers).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'updateInstanceAiCredits' }),
			['user-1'],
		);
	});

	it('should skip markBuilderSuccess when thread metadata already has creditCounted', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: { creditCounted: true } });
		const ai = createMockAiService();
		const push = { sendToUsers: jest.fn() };

		const service = createService({ threadRepo, aiService: ai, push });
		await callCountCredits(service);

		const client = await ai.getClient();
		expect(client.markBuilderSuccess).not.toHaveBeenCalled();
	});

	it('should skip credit counting entirely when thread is not found in DB', async () => {
		const threadRepo = createMockThreadRepo(null);
		const ai = createMockAiService();
		const push = { sendToUsers: jest.fn() };

		const service = createService({ threadRepo, aiService: ai, push });
		await callCountCredits(service);

		// Neither API call nor save should happen for a missing thread
		const client = await ai.getClient();
		expect(client.markBuilderSuccess).not.toHaveBeenCalled();
		expect(threadRepo.save).not.toHaveBeenCalled();
	});

	it('should preserve existing metadata keys when marking as credited', async () => {
		const existingMeta = { someKey: 'value', nested: { a: 1 } };
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: { ...existingMeta } });
		const ai = createMockAiService();
		const push = { sendToUsers: jest.fn() };

		const service = createService({ threadRepo, aiService: ai, push });
		await callCountCredits(service);

		expect(threadRepo.save).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: {
					someKey: 'value',
					nested: { a: 1 },
					creditCounted: true,
				},
			}),
		);
	});

	it('should return early without DB or API calls when proxy is disabled', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
		const ai = createMockAiService({ proxyEnabled: false });
		const push = { sendToUsers: jest.fn() };

		const service = createService({ threadRepo, aiService: ai, push });
		await callCountCredits(service);

		expect(threadRepo.findOneBy).not.toHaveBeenCalled();
		expect(ai.getClient).not.toHaveBeenCalled();
	});

	it('should skip markBuilderSuccess on second call for the same thread (in-memory guard)', async () => {
		const threadRepo = createMockThreadRepo({ id: 't1', metadata: {} });
		const ai = createMockAiService();
		const push = { sendToUsers: jest.fn() };

		const service = createService({ threadRepo, aiService: ai, push });
		await callCountCredits(service);
		await callCountCredits(service);

		const client = await ai.getClient();
		expect(client.markBuilderSuccess).toHaveBeenCalledTimes(1);
	});
});
