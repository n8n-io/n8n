import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import type { InstanceAiMessage } from '../../entities/instance-ai-message.entity';
import type { InstanceAiThread } from '../../entities/instance-ai-thread.entity';
import type { InstanceAiMessageRepository } from '../../repositories/instance-ai-message.repository';
import type { InstanceAiObservationCursorRepository } from '../../repositories/instance-ai-observation-cursor.repository';
import type { InstanceAiObservationLockRepository } from '../../repositories/instance-ai-observation-lock.repository';
import type { InstanceAiObservationRepository } from '../../repositories/instance-ai-observation.repository';
import type { InstanceAiResourceRepository } from '../../repositories/instance-ai-resource.repository';
import type { InstanceAiThreadRepository } from '../../repositories/instance-ai-thread.repository';
import { TypeORMAgentMemory } from '../typeorm-agent-memory';

function makeMemoryDeps(
	overrides: {
		threadRepo?: InstanceAiThreadRepository;
		messageRepo?: InstanceAiMessageRepository;
		resourceRepo?: InstanceAiResourceRepository;
		observationRepo?: InstanceAiObservationRepository;
		observationCursorRepo?: InstanceAiObservationCursorRepository;
		observationLockRepo?: InstanceAiObservationLockRepository;
		logger?: Logger;
	} = {},
) {
	const scopedLogger = mock<Logger>();
	const logger =
		overrides.logger ??
		mock<Logger>({
			scoped: jest.fn(() => scopedLogger),
		});
	return {
		memory: new TypeORMAgentMemory(
			overrides.threadRepo ?? mock<InstanceAiThreadRepository>(),
			overrides.messageRepo ?? mock<InstanceAiMessageRepository>(),
			overrides.resourceRepo ?? mock<InstanceAiResourceRepository>(),
			overrides.observationRepo ?? mock<InstanceAiObservationRepository>(),
			overrides.observationCursorRepo ?? mock<InstanceAiObservationCursorRepository>(),
			overrides.observationLockRepo ?? mock<InstanceAiObservationLockRepository>(),
			logger,
		),
		scopedLogger,
	};
}

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
		const messageRepo = mock<InstanceAiMessageRepository>();
		messageRepo.find.mockResolvedValueOnce([makeMessageRow()]);
		const { memory, scopedLogger } = makeMemoryDeps({ messageRepo });

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
		const threadRepo = mock<InstanceAiThreadRepository>();
		const resourceRepo = mock<InstanceAiResourceRepository>();
		const observationRepo = mock<InstanceAiObservationRepository>();
		const observationCursorRepo = mock<InstanceAiObservationCursorRepository>();
		const observationLockRepo = mock<InstanceAiObservationLockRepository>();
		threadRepo.find.mockResolvedValueOnce([
			{
				id: '00000000-0000-4000-8000-000000000002',
				resourceId: 'instance-ai-subagent:00000000-0000-4000-8000-000000000001:builder',
			},
		] as InstanceAiThread[]);
		const { memory } = makeMemoryDeps({
			threadRepo,
			resourceRepo,
			observationRepo,
			observationCursorRepo,
			observationLockRepo,
		});

		await memory.deleteThreadsByResourceIdPrefix(
			'instance-ai-subagent:00000000-0000-4000-8000-000000000001:',
		);

		expect(threadRepo.find).toHaveBeenCalledWith({
			where: { resourceId: expect.anything() },
		});
		expect(resourceRepo.delete).toHaveBeenCalledTimes(2);
		expect(threadRepo.delete).toHaveBeenCalledWith({ id: expect.anything() });
		expect(observationRepo.delete).toHaveBeenCalledWith({
			scopeKind: 'thread',
			scopeId: '00000000-0000-4000-8000-000000000002',
		});
	});

	it('deletes observation log state when deleting a thread', async () => {
		const threadRepo = mock<InstanceAiThreadRepository>();
		const observationRepo = mock<InstanceAiObservationRepository>();
		const observationCursorRepo = mock<InstanceAiObservationCursorRepository>();
		const observationLockRepo = mock<InstanceAiObservationLockRepository>();
		const { memory } = makeMemoryDeps({
			threadRepo,
			observationRepo,
			observationCursorRepo,
			observationLockRepo,
		});

		await memory.deleteThread('thread-1');

		const scope = { scopeKind: 'thread', scopeId: 'thread-1' };
		expect(observationRepo.delete).toHaveBeenCalledWith(scope);
		expect(observationCursorRepo.delete).toHaveBeenCalledWith(scope);
		expect(observationLockRepo.delete).toHaveBeenCalledWith(scope);
		expect(threadRepo.delete).toHaveBeenCalledWith({ id: 'thread-1' });
	});
});
