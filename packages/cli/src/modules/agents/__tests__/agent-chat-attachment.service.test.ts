import type { Logger } from '@n8n/backend-common';
import type { BinaryDataService } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import type { AgentSessionLock } from '../agent-session-lock.service';
import type { AgentChatAttachment } from '../entities/agent-chat-attachment.entity';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import type { AgentChatAttachmentRepository } from '../repositories/agent-chat-attachment.repository';

describe('AgentChatAttachmentService', () => {
	let binaryDataService = mock<BinaryDataService>();
	let repository = mock<AgentChatAttachmentRepository>();
	let service: AgentChatAttachmentService;
	let threadRepository = mock<AgentExecutionThreadRepository>();
	let sessionLock = mock<AgentSessionLock>();

	beforeEach(() => {
		vi.clearAllMocks();
		binaryDataService = mock<BinaryDataService>();
		repository = mock<AgentChatAttachmentRepository>();
		threadRepository = mock<AgentExecutionThreadRepository>();
		sessionLock = mock<AgentSessionLock>();
		sessionLock.run.mockImplementation(async (_sessionId, fn) => await fn({}));
		service = new AgentChatAttachmentService(
			mock<Logger>(),
			binaryDataService,
			repository,
			threadRepository,
			sessionLock,
		);
	});

	it('checks attachment access through the session and falls back to its persisted resource', async () => {
		const scope = { agentId: 'agent-1', projectId: 'project-1', userId: 'user-1' };
		const attachment = mock<AgentChatAttachment>({
			threadId: 'thread-1',
			resourceId: 'draft-chat:user-1',
		});
		repository.findByIdForAgent.mockResolvedValue(attachment);
		const thread = mock<AgentExecutionThread>({
			agentId: scope.agentId,
			projectId: scope.projectId,
			accessScope: 'user',
			ownerId: scope.userId,
		});
		threadRepository.findOneBy.mockResolvedValue(thread);
		expect(await service.getForAgent('att-1', scope)).toEqual(attachment);
		expect(await service.getForAgent('att-1', { ...scope, userId: 'user-2' })).toBeNull();
		threadRepository.findOneBy.mockResolvedValue({ ...thread, ownerId: null });
		expect(await service.getForAgent('att-1', scope)).toBeNull();
		threadRepository.findOneBy.mockResolvedValue(null);
		expect(await service.getForAgent('att-1', scope)).toEqual(attachment);
		expect(await service.getForAgent('att-1', { ...scope, userId: 'user-2' })).toBeNull();
		threadRepository.findOneBy.mockResolvedValue({
			...thread,
			accessScope: 'project',
			ownerId: null,
		});
		expect(await service.getForAgent('att-1', { ...scope, userId: 'user-2' })).toEqual(attachment);
	});

	describe('storeInbound', () => {
		it('stores bytes via BinaryDataService and persists a scoped row', async () => {
			binaryDataService.store.mockResolvedValue({
				id: 'filesystem-v2:agents/agent-1/attachments/att-1/x',
				data: 'filesystem-v2',
				mimeType: 'image/png',
			});
			repository.create.mockImplementation((input) => input as AgentChatAttachment);
			repository.saveForSession.mockImplementation(async (input) => input as AgentChatAttachment);

			const stored = await service.storeInbound({
				agentId: 'agent-1',
				projectId: 'project-1',
				threadId: 'thread-1',
				resourceId: 'user-1',
				source: 'chat',
				fileName: 'photo.png',
				mimeType: 'image/png',
				data: Buffer.from([1, 2, 3]),
				access: { accessScope: 'user', ownerId: 'user-1' },
				sessionMode: 'new',
			});

			expect(binaryDataService.store).toHaveBeenCalledTimes(1);
			expect(binaryDataService.store).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'custom',
					pathSegments: ['agents', 'agent-1', 'attachments', expect.any(String)],
				}),
				expect.anything(),
				expect.anything(),
			);

			expect(repository.saveForSession).toHaveBeenCalledTimes(1);
			expect(sessionLock.run).toHaveBeenCalledWith('thread-1', expect.any(Function));
			expect(stored.binaryDataId).toBe('filesystem-v2:agents/agent-1/attachments/att-1/x');
			expect(stored.fileSizeBytes).toBe(3);
			expect(stored.source).toBe('chat');
		});

		it('throws when the binary storage mode does not persist ids (in-memory)', async () => {
			binaryDataService.store.mockResolvedValue({ data: 'abc', mimeType: 'image/png' });

			await expect(
				service.storeInbound({
					agentId: 'agent-1',
					projectId: 'project-1',
					threadId: 'thread-1',
					source: 'chat',
					fileName: 'photo.png',
					mimeType: 'image/png',
					data: Buffer.from([1]),
					access: { accessScope: 'user', ownerId: 'user-1' },
					sessionMode: 'new',
				}),
			).rejects.toThrow('persisted binary data storage mode');
		});

		it('cleans up stored bytes when the row insert fails', async () => {
			binaryDataService.deleteManyByBinaryDataId.mockResolvedValue(undefined as never);
			binaryDataService.store.mockResolvedValue({
				id: 'filesystem-v2:x',
				data: 'filesystem-v2',
				mimeType: 'image/png',
			});
			repository.create.mockImplementation((input) => input as AgentChatAttachment);
			repository.saveForSession.mockRejectedValue(new Error('db down'));

			await expect(
				service.storeInbound({
					agentId: 'agent-1',
					projectId: 'project-1',
					threadId: 'thread-1',
					source: 'chat',
					fileName: 'photo.png',
					mimeType: 'image/png',
					data: Buffer.from([1]),
					access: { accessScope: 'user', ownerId: 'user-1' },
					sessionMode: 'new',
				}),
			).rejects.toThrow('db down');
			expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledWith(['filesystem-v2:x']);
		});
	});

	describe('getFileStore', () => {
		it('loads bytes for attachments in scope', async () => {
			repository.findByIdForAgent.mockResolvedValue({
				id: 'att-1',
				binaryDataId: 'filesystem-v2:x',
				mimeType: 'image/png',
			} as AgentChatAttachment);
			binaryDataService.getAsBuffer.mockResolvedValue(Buffer.from([1, 2]));

			const store = service.getFileStore(
				{ agentId: 'agent-1', projectId: 'project-1' },
				'anthropic',
			);
			const bytes = await store.load({ id: 'att-1' });

			expect(repository.findByIdForAgent).toHaveBeenCalledWith('att-1', {
				agentId: 'agent-1',
				projectId: 'project-1',
			});
			expect(bytes).toEqual(Buffer.from([1, 2]));
		});

		it('scopes the lookup to the thread when the run provides one', async () => {
			repository.findByIdInThread.mockResolvedValue({
				id: 'att-1',
				binaryDataId: 'filesystem-v2:x',
				mimeType: 'image/png',
			} as AgentChatAttachment);
			binaryDataService.getAsBuffer.mockResolvedValue(Buffer.from([1, 2]));

			const store = service.getFileStore(
				{ agentId: 'agent-1', projectId: 'project-1' },
				'anthropic',
			);
			const bytes = await store.load({ id: 'att-1' }, { threadId: 'thread-1' });

			expect(repository.findByIdInThread).toHaveBeenCalledWith('att-1', {
				projectId: 'project-1',
				threadId: 'thread-1',
			});
			expect(repository.findByIdForAgent).not.toHaveBeenCalled();
			expect(bytes).toEqual(Buffer.from([1, 2]));
		});

		it('returns null for attachments outside the run thread', async () => {
			repository.findByIdInThread.mockResolvedValue(null);

			const store = service.getFileStore(
				{ agentId: 'agent-1', projectId: 'project-1' },
				'anthropic',
			);

			expect(await store.load({ id: 'att-1' }, { threadId: 'other-thread' })).toBeNull();
			expect(binaryDataService.getAsBuffer).not.toHaveBeenCalled();
		});

		it('returns null for attachments outside the agent/project scope', async () => {
			repository.findByIdForAgent.mockResolvedValue(null);

			const store = service.getFileStore(
				{ agentId: 'agent-2', projectId: 'project-1' },
				'anthropic',
			);
			expect(await store.load({ id: 'att-1' })).toBeNull();
			expect(binaryDataService.getAsBuffer).not.toHaveBeenCalled();
		});

		it('returns null instead of throwing when byte loading fails', async () => {
			repository.findByIdForAgent.mockResolvedValue({
				id: 'att-1',
				binaryDataId: 'filesystem-v2:x',
				mimeType: 'image/png',
			} as AgentChatAttachment);
			binaryDataService.getAsBuffer.mockRejectedValue(new Error('storage down'));

			const store = service.getFileStore(
				{ agentId: 'agent-1', projectId: 'project-1' },
				'anthropic',
			);
			expect(await store.load({ id: 'att-1' })).toBeNull();
		});

		it('gates media types by the provider capability map', () => {
			const anthropic = service.getFileStore(
				{ agentId: 'agent-1', projectId: 'project-1' },
				'anthropic',
			);
			expect(anthropic.isMediaTypeSupported?.('image/png')).toBe(true);
			expect(anthropic.isMediaTypeSupported?.('application/pdf')).toBe(true);
			expect(anthropic.isMediaTypeSupported?.('audio/ogg')).toBe(false);

			const google = service.getFileStore({ agentId: 'agent-1', projectId: 'project-1' }, 'google');
			expect(google.isMediaTypeSupported?.('audio/ogg')).toBe(true);

			const groq = service.getFileStore({ agentId: 'agent-1', projectId: 'project-1' }, 'groq');
			expect(groq.isMediaTypeSupported?.('image/png')).toBe(false);

			const unknown = service.getFileStore({ agentId: 'agent-1', projectId: 'project-1' }, 'nope');
			expect(unknown.isMediaTypeSupported?.('image/png')).toBe(false);
		});
	});

	describe('deleteByThread', () => {
		it('deletes rows and bytes for the thread within the given scope', async () => {
			binaryDataService.deleteManyByBinaryDataId.mockResolvedValue(undefined as never);
			repository.findByThread.mockResolvedValue([
				{ id: 'att-1', binaryDataId: 'filesystem-v2:a' },
				{ id: 'att-2', binaryDataId: 'filesystem-v2:b' },
			] as AgentChatAttachment[]);

			await service.deleteByThread('thread-1', { projectId: 'project-1' });

			expect(repository.findByThread).toHaveBeenCalledWith('thread-1', {
				projectId: 'project-1',
			});
			expect(repository.delete).toHaveBeenCalledWith(['att-1', 'att-2']);
			expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledWith([
				'filesystem-v2:a',
				'filesystem-v2:b',
			]);
		});

		it('is a no-op for threads without attachments', async () => {
			repository.findByThread.mockResolvedValue([]);
			await service.deleteByThread('thread-1', { agentId: 'agent-1' });
			expect(repository.delete).not.toHaveBeenCalled();
		});
	});
});
