import { mock } from 'vitest-mock-extended';

import type { AgentResourceRepository } from '../../repositories/agent-resource.repository';
import type { AgentThreadRepository } from '../../repositories/agent-thread.repository';
import type { AgentThreadEntity } from '../../entities/agent-thread.entity';
import { IntegrationMessageContextService } from '../integration-message-context.service';

describe('IntegrationMessageContextService session bind', () => {
	const threadRepository = mock<AgentThreadRepository>();
	const resourceRepository = mock<AgentResourceRepository>();
	const service = new IntegrationMessageContextService(threadRepository, resourceRepository);

	beforeEach(() => {
		vi.clearAllMocks();
		threadRepository.create.mockImplementation((value) => value as AgentThreadEntity);
		threadRepository.save.mockImplementation(async (value) => value as AgentThreadEntity);
		resourceRepository.existsBy.mockResolvedValue(true);
	});

	it('does not write when the derived thread is already the origin', async () => {
		await service.bindSession('task-1', { threadId: 'task-1', resourceId: 'task:task-1' });

		expect(threadRepository.findOneBy).not.toHaveBeenCalled();
		expect(threadRepository.save).not.toHaveBeenCalled();
	});

	it('stores continueAs on a new alias row', async () => {
		threadRepository.findOneBy.mockResolvedValue(null);

		await service.bindSession('agent-1:slack:D123', {
			threadId: 'task-1',
			resourceId: 'task:task-1',
		});

		expect(threadRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'agent-1:slack:D123',
				resourceId: 'task:task-1',
				metadata: JSON.stringify({
					continueAs: { threadId: 'task-1', resourceId: 'task:task-1' },
				}),
			}),
		);
	});

	it('does not overwrite an existing binding (first write wins)', async () => {
		threadRepository.findOneBy.mockResolvedValue({
			id: 'agent-1:slack:D123',
			resourceId: 'task:task-1',
			title: null,
			metadata: JSON.stringify({
				continueAs: { threadId: 'task-1', resourceId: 'task:task-1' },
			}),
		} as AgentThreadEntity);

		await service.bindSession('agent-1:slack:D123', {
			threadId: 'task-2',
			resourceId: 'task:task-2',
		});

		expect(threadRepository.save).not.toHaveBeenCalled();
		await expect(service.resolveSession('agent-1:slack:D123')).resolves.toEqual({
			threadId: 'task-1',
			resourceId: 'task:task-1',
		});
	});

	it('binds two different threads to independent sessions', async () => {
		threadRepository.findOneBy.mockResolvedValue(null);

		await service.bindSession('agent-1:slack:D123', {
			threadId: 'task-1',
			resourceId: 'task:task-1',
		});
		await service.bindSession('agent-1:slack:D456', {
			threadId: 'task-2',
			resourceId: 'task:task-2',
		});

		expect(threadRepository.save).toHaveBeenCalledTimes(2);
		expect(threadRepository.save).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				id: 'agent-1:slack:D123',
				metadata: JSON.stringify({
					continueAs: { threadId: 'task-1', resourceId: 'task:task-1' },
				}),
			}),
		);
		expect(threadRepository.save).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				id: 'agent-1:slack:D456',
				metadata: JSON.stringify({
					continueAs: { threadId: 'task-2', resourceId: 'task:task-2' },
				}),
			}),
		);
	});

	it('resolves continueAs and returns null when none is stored', async () => {
		threadRepository.findOneBy.mockResolvedValueOnce({
			id: 'agent-1:slack:D123',
			metadata: JSON.stringify({
				continueAs: { threadId: 'task-1', resourceId: 'task:task-1' },
			}),
		} as AgentThreadEntity);
		threadRepository.findOneBy.mockResolvedValueOnce({
			id: 'agent-1:slack:D456',
			metadata: JSON.stringify({ currentMessageContext: {} }),
		} as AgentThreadEntity);

		await expect(service.resolveSession('agent-1:slack:D123')).resolves.toEqual({
			threadId: 'task-1',
			resourceId: 'task:task-1',
		});
		await expect(service.resolveSession('agent-1:slack:D456')).resolves.toBeNull();
	});
});
