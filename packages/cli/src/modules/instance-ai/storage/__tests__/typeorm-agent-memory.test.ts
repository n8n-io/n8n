import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import type { InstanceAiMessage } from '../../entities/instance-ai-message.entity';
import type { InstanceAiThread } from '../../entities/instance-ai-thread.entity';
import type { InstanceAiMessageRepository } from '../../repositories/instance-ai-message.repository';
import type { InstanceAiResourceRepository } from '../../repositories/instance-ai-resource.repository';
import type { InstanceAiThreadRepository } from '../../repositories/instance-ai-thread.repository';
import { TypeORMAgentMemory } from '../typeorm-agent-memory';

function makeMessageRow(overrides: Partial<InstanceAiMessage> = {}): InstanceAiMessage {
	return {
		id: 'message-1',
		threadId: 'thread-1',
		resourceId: 'user-1',
		content: '{"not":"an-agent-message"}',
		role: 'unknown',
		type: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as InstanceAiMessage;
}

describe('TypeORMAgentMemory', () => {
	it('logs and skips invalid native message rows', async () => {
		const scopedLogger = mock<Logger>();
		const logger = mock<Logger>({
			scoped: jest.fn(() => scopedLogger),
		});
		const messageRepo = mock<InstanceAiMessageRepository>();
		messageRepo.find.mockResolvedValueOnce([makeMessageRow()]);
		const memory = new TypeORMAgentMemory(
			mock<InstanceAiThreadRepository>(),
			messageRepo,
			mock<InstanceAiResourceRepository>(),
			logger,
		);

		await expect(memory.getMessages('thread-1')).resolves.toEqual([]);

		expect(scopedLogger.warn).toHaveBeenCalledWith(
			'Skipping invalid Instance AI message row',
			expect.objectContaining({
				messageId: 'message-1',
				threadId: 'thread-1',
				resourceId: 'user-1',
			}),
		);
	});

	it('deletes hidden sub-agent threads and associated working-memory resources by resource prefix', async () => {
		const logger = mock<Logger>({
			scoped: jest.fn(() => mock<Logger>()),
		});
		const threadRepo = mock<InstanceAiThreadRepository>();
		const resourceRepo = mock<InstanceAiResourceRepository>();
		threadRepo.find.mockResolvedValueOnce([
			{
				id: '00000000-0000-4000-8000-000000000002',
				resourceId: 'instance-ai-subagent:00000000-0000-4000-8000-000000000001:builder',
			},
		] as InstanceAiThread[]);
		const memory = new TypeORMAgentMemory(
			threadRepo,
			mock<InstanceAiMessageRepository>(),
			resourceRepo,
			logger,
		);

		await memory.deleteThreadsByResourceIdPrefix(
			'instance-ai-subagent:00000000-0000-4000-8000-000000000001:',
		);

		expect(threadRepo.find).toHaveBeenCalledWith({
			where: { resourceId: expect.anything() },
		});
		expect(resourceRepo.delete).toHaveBeenCalledTimes(2);
		expect(threadRepo.delete).toHaveBeenCalledWith({ id: expect.anything() });
	});
});
