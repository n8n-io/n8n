import { UNLIMITED_CREDITS } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { AiService } from '@/services/ai.service';
import type { Push } from '@/push';

import { InstanceAiModelService } from '../instance-ai-model.service';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';
import type { InstanceAiThreadRepository } from '../repositories/instance-ai-thread.repository';

const fakeUser = { id: 'user-1' } as User;

function createClient(opts: { creditInfo?: unknown } = {}) {
	const { creditInfo = { creditsQuota: 100, creditsClaimed: 1 } } = opts;
	return {
		getBuilderApiProxyToken: jest
			.fn()
			.mockResolvedValue({ tokenType: 'Bearer', accessToken: 'tok' }),
		markBuilderSuccess: jest.fn().mockResolvedValue(creditInfo),
		getBuilderInstanceCredits: jest
			.fn()
			.mockResolvedValue({ creditsQuota: 100, creditsClaimed: 5 }),
	};
}

describe('InstanceAiModelService', () => {
	const logger = mock<Logger>();
	const settingsService = mock<InstanceAiSettingsService>();
	const aiService = mock<AiService>();
	const push = mock<Push>();
	const threadRepo = mock<InstanceAiThreadRepository>();

	let service: InstanceAiModelService;

	beforeEach(() => {
		jest.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		service = new InstanceAiModelService(logger, settingsService, aiService, push, threadRepo);
	});

	describe('isProxyEnabled', () => {
		it('should mirror the AI service proxy state', () => {
			aiService.isProxyEnabled.mockReturnValue(true);
			expect(service.isProxyEnabled()).toBe(true);

			aiService.isProxyEnabled.mockReturnValue(false);
			expect(service.isProxyEnabled()).toBe(false);
		});
	});

	describe('getCredits', () => {
		it('should return unlimited credits when the proxy is disabled', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);

			await expect(service.getCredits(fakeUser)).resolves.toEqual({
				creditsQuota: UNLIMITED_CREDITS,
				creditsClaimed: 0,
			});
			expect(aiService.getClient).not.toHaveBeenCalled();
		});

		it('should fetch credits from the proxy client when enabled', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);
			const client = createClient();
			aiService.getClient.mockResolvedValue(client as never);

			await expect(service.getCredits(fakeUser)).resolves.toEqual({
				creditsQuota: 100,
				creditsClaimed: 5,
			});
			expect(client.getBuilderInstanceCredits).toHaveBeenCalledWith({ id: 'user-1' });
		});
	});

	describe('resolveAgentModelConfig', () => {
		it('should fall back to the settings model config when no proxy is active', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);
			settingsService.resolveModelConfig.mockResolvedValue('anthropic/claude' as never);

			await expect(service.resolveAgentModelConfig(fakeUser)).resolves.toBe('anthropic/claude');
		});
	});

	describe('countCreditsIfFirst', () => {
		const setupProxy = (creditInfo?: unknown) => {
			aiService.isProxyEnabled.mockReturnValue(true);
			const client = createClient({ creditInfo });
			aiService.getClient.mockResolvedValue(client as never);
			return client;
		};

		it('should mark success and persist creditCounted in metadata', async () => {
			const client = setupProxy();
			threadRepo.findOneBy.mockResolvedValue({ id: 't1', metadata: {} } as never);
			threadRepo.save.mockImplementation(async (entity: unknown) => entity as never);

			await service.countCreditsIfFirst(fakeUser, 't1', 'run-1');

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

		it('should skip marking success when thread metadata already has creditCounted', async () => {
			const client = setupProxy();
			threadRepo.findOneBy.mockResolvedValue({
				id: 't1',
				metadata: { creditCounted: true },
			} as never);

			await service.countCreditsIfFirst(fakeUser, 't1', 'run-1');

			expect(client.markBuilderSuccess).not.toHaveBeenCalled();
		});

		it('should skip credit counting entirely when the thread is not found', async () => {
			const client = setupProxy();
			threadRepo.findOneBy.mockResolvedValue(null);

			await service.countCreditsIfFirst(fakeUser, 't1', 'run-1');

			expect(client.markBuilderSuccess).not.toHaveBeenCalled();
			expect(threadRepo.save).not.toHaveBeenCalled();
		});

		it('should preserve existing metadata keys when marking as credited', async () => {
			setupProxy();
			threadRepo.findOneBy.mockResolvedValue({
				id: 't1',
				metadata: { someKey: 'value', nested: { a: 1 } },
			} as never);
			threadRepo.save.mockImplementation(async (entity: unknown) => entity as never);

			await service.countCreditsIfFirst(fakeUser, 't1', 'run-1');

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

		it('should return early without DB or API calls when the proxy is disabled', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);

			await service.countCreditsIfFirst(fakeUser, 't1', 'run-1');

			expect(threadRepo.findOneBy).not.toHaveBeenCalled();
			expect(aiService.getClient).not.toHaveBeenCalled();
		});

		it('should skip marking success on a second call for the same thread (in-memory guard)', async () => {
			const client = setupProxy();
			threadRepo.findOneBy.mockResolvedValue({ id: 't1', metadata: {} } as never);
			threadRepo.save.mockImplementation(async (entity: unknown) => entity as never);

			await service.countCreditsIfFirst(fakeUser, 't1', 'run-1');
			await service.countCreditsIfFirst(fakeUser, 't1', 'run-1');

			expect(client.markBuilderSuccess).toHaveBeenCalledTimes(1);
		});

		it('should allow a retry after a failed marking attempt', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);
			threadRepo.findOneBy.mockResolvedValue({ id: 't1', metadata: {} } as never);
			threadRepo.save.mockImplementation(async (entity: unknown) => entity as never);

			const failingClient = createClient();
			failingClient.markBuilderSuccess.mockRejectedValueOnce(new Error('boom'));
			const succeedingClient = createClient();
			aiService.getClient
				.mockResolvedValueOnce(failingClient as never)
				.mockResolvedValueOnce(succeedingClient as never);

			await service.countCreditsIfFirst(fakeUser, 't1', 'run-1');
			await service.countCreditsIfFirst(fakeUser, 't1', 'run-1');

			expect(failingClient.markBuilderSuccess).toHaveBeenCalledTimes(1);
			expect(succeedingClient.markBuilderSuccess).toHaveBeenCalledTimes(1);
		});
	});

	describe('clearThread', () => {
		it('should let a thread be credited again after its state is cleared', async () => {
			const client = setupCreditedThread();

			await service.countCreditsIfFirst(fakeUser, 't1', 'run-1');
			service.clearThread('t1');
			await service.countCreditsIfFirst(fakeUser, 't1', 'run-2');

			expect(client.markBuilderSuccess).toHaveBeenCalledTimes(2);
		});

		function setupCreditedThread() {
			aiService.isProxyEnabled.mockReturnValue(true);
			const client = createClient();
			aiService.getClient.mockResolvedValue(client as never);
			// Return a fresh thread row each lookup so a mutation from the first
			// run does not leak into the second.
			threadRepo.findOneBy.mockImplementation(async () => ({ id: 't1', metadata: {} }) as never);
			threadRepo.save.mockImplementation(async (entity: unknown) => entity as never);
			return client;
		}
	});
});
