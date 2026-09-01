import type { Logger } from '@n8n/backend-common';
import type {
	AiBuilderTemporaryWorkflow,
	AiBuilderTemporaryWorkflowRepository,
	User,
	UserRepository,
} from '@n8n/db';
import type { InstanceAiContext } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import type { InstanceAiThread } from '../entities/instance-ai-thread.entity';
import type { InstanceAiThreadRepository } from '../repositories/instance-ai-thread.repository';

// The adapter service (a value dependency of the service under test) pulls in
// the heavy AI runtime at module-load time; stub it out.
vi.mock('@n8n/instance-ai', () => ({
	BuilderTemplatesService: class {},
	builderTemplatesOptionsFromEnv: vi.fn(),
	wrapUntrustedData: vi.fn((value: unknown) => value),
}));

import type { InstanceAiAdapterService } from '../instance-ai.adapter.service';
import { InstanceAiTemporaryWorkflowService } from '../instance-ai-temporary-workflow.service';

const fakeUser = mock<User>({ id: 'user-1' });

function marked(...workflowIds: string[]): AiBuilderTemporaryWorkflow[] {
	return workflowIds.map((workflowId) => mock<AiBuilderTemporaryWorkflow>({ workflowId }));
}

function createService() {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const adapterService = mock<InstanceAiAdapterService>();
	const threadRepo = mock<InstanceAiThreadRepository>();
	const userRepository = mock<UserRepository>();
	const aiBuilderTemporaryWorkflowRepository = mock<AiBuilderTemporaryWorkflowRepository>();

	const archiveIfAiTemporary = vi.fn(async (_workflowId: string) => true);
	const context = mock<InstanceAiContext>();
	context.workflowService.archiveIfAiTemporary = archiveIfAiTemporary;
	adapterService.createContext.mockReturnValue(context);

	const service = new InstanceAiTemporaryWorkflowService(
		logger,
		adapterService,
		threadRepo,
		userRepository,
		aiBuilderTemporaryWorkflowRepository,
	);

	return {
		service,
		logger,
		adapterService,
		threadRepo,
		userRepository,
		aiBuilderTemporaryWorkflowRepository,
		archiveIfAiTemporary,
	};
}

describe('InstanceAiTemporaryWorkflowService', () => {
	describe('reapForRun', () => {
		it('defers cleanup while background tasks are running', async () => {
			const { service, logger, aiBuilderTemporaryWorkflowRepository, adapterService } =
				createService();

			await expect(
				service.reapForRun('thread-a', fakeUser, new Set(['wf-created']), 1),
			).resolves.toEqual([]);

			expect(aiBuilderTemporaryWorkflowRepository.findByThread).not.toHaveBeenCalled();
			expect(adapterService.createContext).not.toHaveBeenCalled();
			expect(logger.debug).toHaveBeenCalledWith(
				'Deferring AI-builder temporary workflow cleanup until tasks settle',
				{ threadId: 'thread-a', runningTaskCount: 1 },
			);
		});

		it('archives marked and run-created workflows once tasks settle', async () => {
			const {
				service,
				aiBuilderTemporaryWorkflowRepository,
				adapterService,
				archiveIfAiTemporary,
			} = createService();
			aiBuilderTemporaryWorkflowRepository.findByThread.mockResolvedValue(marked('wf-marked'));

			await expect(
				service.reapForRun('thread-a', fakeUser, new Set(['wf-created']), 0),
			).resolves.toEqual(['wf-marked', 'wf-created']);

			expect(aiBuilderTemporaryWorkflowRepository.findByThread).toHaveBeenCalledWith('thread-a');
			expect(adapterService.createContext).toHaveBeenCalledWith(fakeUser, { threadId: 'thread-a' });
			expect(archiveIfAiTemporary).toHaveBeenNthCalledWith(1, 'wf-marked');
			expect(archiveIfAiTemporary).toHaveBeenNthCalledWith(2, 'wf-created');
		});

		it('only returns workflows that were actually archived', async () => {
			const { service, aiBuilderTemporaryWorkflowRepository, archiveIfAiTemporary } =
				createService();
			aiBuilderTemporaryWorkflowRepository.findByThread.mockResolvedValue(marked('wf-marked'));
			archiveIfAiTemporary.mockImplementation(
				async (workflowId: string) => workflowId === 'wf-created',
			);

			await expect(
				service.reapForRun('thread-a', fakeUser, new Set(['wf-created']), 0),
			).resolves.toEqual(['wf-created']);
		});

		it('returns an empty list and skips archiving when nothing is marked or created', async () => {
			const { service, aiBuilderTemporaryWorkflowRepository, adapterService } = createService();
			aiBuilderTemporaryWorkflowRepository.findByThread.mockResolvedValue([]);

			await expect(service.reapForRun('thread-a', fakeUser, undefined, 0)).resolves.toEqual([]);

			expect(adapterService.createContext).not.toHaveBeenCalled();
		});

		it('still folds in run-created workflows when the marker lookup fails', async () => {
			const { service, logger, aiBuilderTemporaryWorkflowRepository, archiveIfAiTemporary } =
				createService();
			aiBuilderTemporaryWorkflowRepository.findByThread.mockRejectedValue(new Error('db down'));

			await expect(
				service.reapForRun('thread-a', fakeUser, new Set(['wf-created']), 0),
			).resolves.toEqual(['wf-created']);

			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to inspect AI-builder temporary workflows during run finish',
				{ threadId: 'thread-a', error: 'db down' },
			);
			expect(archiveIfAiTemporary).toHaveBeenCalledWith('wf-created');
		});

		it('logs and continues when an individual archive fails', async () => {
			const { service, logger, aiBuilderTemporaryWorkflowRepository, archiveIfAiTemporary } =
				createService();
			aiBuilderTemporaryWorkflowRepository.findByThread.mockResolvedValue(marked('wf-a', 'wf-b'));
			archiveIfAiTemporary.mockImplementation(async (workflowId: string) => {
				if (workflowId === 'wf-a') throw new Error('archive failed');
				return true;
			});

			await expect(service.reapForRun('thread-a', fakeUser, undefined, 0)).resolves.toEqual([
				'wf-b',
			]);
			expect(logger.warn).toHaveBeenCalledWith('Failed to reap AI-builder temporary workflow', {
				threadId: 'thread-a',
				workflowId: 'wf-a',
				error: 'archive failed',
			});
		});
	});

	describe('reapForThreadCleanup', () => {
		it('archives all marked workflows for the resolved thread owner', async () => {
			const {
				service,
				aiBuilderTemporaryWorkflowRepository,
				threadRepo,
				userRepository,
				adapterService,
				archiveIfAiTemporary,
			} = createService();
			aiBuilderTemporaryWorkflowRepository.findByThread.mockResolvedValue(marked('wf-a', 'wf-b'));
			threadRepo.findOneBy.mockResolvedValue(mock<InstanceAiThread>({ resourceId: 'user-1' }));
			userRepository.findOneBy.mockResolvedValue(fakeUser);

			await service.reapForThreadCleanup('thread-a');

			expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: 'user-1' });
			expect(adapterService.createContext).toHaveBeenCalledWith(fakeUser, { threadId: 'thread-a' });
			expect(archiveIfAiTemporary).toHaveBeenCalledWith('wf-a');
			expect(archiveIfAiTemporary).toHaveBeenCalledWith('wf-b');
		});

		it('does nothing when no workflows are marked', async () => {
			const { service, aiBuilderTemporaryWorkflowRepository, threadRepo, adapterService } =
				createService();
			aiBuilderTemporaryWorkflowRepository.findByThread.mockResolvedValue([]);

			await service.reapForThreadCleanup('thread-a');

			expect(threadRepo.findOneBy).not.toHaveBeenCalled();
			expect(adapterService.createContext).not.toHaveBeenCalled();
		});

		it('skips cleanup when the thread has no owner', async () => {
			const { service, logger, aiBuilderTemporaryWorkflowRepository, threadRepo, userRepository } =
				createService();
			aiBuilderTemporaryWorkflowRepository.findByThread.mockResolvedValue(marked('wf-a'));
			threadRepo.findOneBy.mockResolvedValue(mock<InstanceAiThread>({ resourceId: '' }));

			await service.reapForThreadCleanup('thread-a');

			expect(userRepository.findOneBy).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipping AI-builder temporary workflow cleanup for thread without owner',
				{ threadId: 'thread-a', markedWorkflowCount: 1 },
			);
		});

		it('skips cleanup when the thread owner cannot be loaded', async () => {
			const {
				service,
				logger,
				aiBuilderTemporaryWorkflowRepository,
				threadRepo,
				userRepository,
				adapterService,
			} = createService();
			aiBuilderTemporaryWorkflowRepository.findByThread.mockResolvedValue(marked('wf-a'));
			threadRepo.findOneBy.mockResolvedValue(mock<InstanceAiThread>({ resourceId: 'user-1' }));
			userRepository.findOneBy.mockResolvedValue(null);

			await service.reapForThreadCleanup('thread-a');

			expect(adapterService.createContext).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipping AI-builder temporary workflow cleanup for missing thread owner',
				{ threadId: 'thread-a', userId: 'user-1', markedWorkflowCount: 1 },
			);
		});
	});
});
