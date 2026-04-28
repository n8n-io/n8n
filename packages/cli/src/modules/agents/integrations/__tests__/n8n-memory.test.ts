import { LessThan } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import type { AgentThreadEntity } from '../../entities/agent-thread.entity';
import type { AgentMessageRepository } from '../../repositories/agent-message.repository';
import type { AgentResourceRepository } from '../../repositories/agent-resource.repository';
import type { AgentThreadRepository } from '../../repositories/agent-thread.repository';
import { N8nMemory } from '../n8n-memory';

describe('N8nMemory', () => {
	let memory: N8nMemory;
	let messageRepository: jest.Mocked<AgentMessageRepository>;
	let threadRepository: jest.Mocked<AgentThreadRepository>;
	let resourceRepository: jest.Mocked<AgentResourceRepository>;

	beforeEach(() => {
		jest.clearAllMocks();

		messageRepository = mock<AgentMessageRepository>();
		threadRepository = mock<AgentThreadRepository>();
		resourceRepository = mock<AgentResourceRepository>();

		memory = new N8nMemory(threadRepository, messageRepository, resourceRepository);
	});

	describe('getMessages — resourceId filter', () => {
		beforeEach(() => {
			messageRepository.find.mockResolvedValue([]);
		});

		it('includes resourceId in the where clause when provided', async () => {
			await memory.getMessages('thread-1', { resourceId: 'user-1' });

			expect(messageRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { threadId: 'thread-1', resourceId: 'user-1' },
				}),
			);
		});

		it('omits resourceId from the where clause when not provided', async () => {
			await memory.getMessages('thread-1');

			expect(messageRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { threadId: 'thread-1' },
				}),
			);
		});

		it('preserves an empty-string resourceId in the filter instead of dropping it', async () => {
			// Guard against the previous `...(opts?.resourceId && ...)` bug: a
			// falsy userId must NOT widen the query to every user's messages
			// on a shared thread.
			await memory.getMessages('thread-1', { resourceId: '' });

			expect(messageRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { threadId: 'thread-1', resourceId: '' },
				}),
			);
		});

		it('combines resourceId with the `before` filter', async () => {
			const before = new Date('2026-01-01');

			await memory.getMessages('thread-1', { resourceId: 'user-1', before });

			const call = messageRepository.find.mock.calls[0][0];
			expect(call?.where).toMatchObject({
				threadId: 'thread-1',
				resourceId: 'user-1',
				createdAt: LessThan(before),
			});
		});
	});

	describe('saveThread — existing row', () => {
		it('preserves the original resourceId instead of overwriting with the caller’s', async () => {
			// Shared threads (e.g. the test-chat thread keyed by agentId) are
			// written to by multiple users. The first writer owns the row;
			// subsequent saves must not re-stamp it with the current caller.
			const existing = {
				id: 'thread-1',
				resourceId: 'original-user',
				title: null,
				metadata: null,
			} as unknown as AgentThreadEntity;
			threadRepository.findOneBy.mockResolvedValue(existing);
			threadRepository.save.mockImplementation(async (e) => e as AgentThreadEntity);
			resourceRepository.existsBy.mockResolvedValue(true);

			await memory.saveThread({
				id: 'thread-1',
				resourceId: 'different-user',
				title: undefined,
				metadata: undefined,
			});

			expect(threadRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'thread-1', resourceId: 'original-user' }),
			);
		});

		it('still ensures the caller’s resource row exists (for message-level writes)', async () => {
			// resourceId on the thread is preserved, but messages saved afterwards
			// carry the current user's resourceId — that row must exist.
			const existing = {
				id: 'thread-1',
				resourceId: 'original-user',
				title: null,
				metadata: null,
			} as unknown as AgentThreadEntity;
			threadRepository.findOneBy.mockResolvedValue(existing);
			threadRepository.save.mockImplementation(async (e) => e as AgentThreadEntity);
			resourceRepository.existsBy.mockResolvedValue(false);

			await memory.saveThread({
				id: 'thread-1',
				resourceId: 'different-user',
				title: undefined,
				metadata: undefined,
			});

			expect(resourceRepository.existsBy).toHaveBeenCalledWith({ id: 'different-user' });
			expect(resourceRepository.save).toHaveBeenCalled();
		});
	});

	describe('deleteMessagesByThread', () => {
		it('deletes only the caller’s messages when resourceId is provided', async () => {
			await memory.deleteMessagesByThread('thread-1', 'user-1');

			expect(messageRepository.delete).toHaveBeenCalledWith({
				threadId: 'thread-1',
				resourceId: 'user-1',
			});
		});

		it('deletes every message on the thread when resourceId is omitted', async () => {
			await expect(memory.deleteMessagesByThread('thread-1', undefined as any)).rejects.toThrow(
				'Resource ID and thread ID are required',
			);
			expect(messageRepository.delete).not.toHaveBeenCalled();
		});

		it('does not widen the delete to all users when resourceId is an empty string', async () => {
			// Same security invariant as getMessages: an accidental falsy userId
			// must never fall through to "delete everyone's messages".
			await memory.deleteMessagesByThread('thread-1', '');

			expect(messageRepository.delete).toHaveBeenCalledWith({
				threadId: 'thread-1',
				resourceId: '',
			});
		});
	});
});
