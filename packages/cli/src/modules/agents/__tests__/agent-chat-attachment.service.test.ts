import type { Logger } from '@n8n/backend-common';
import type { BinaryDataService } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import type { AgentChatAttachment } from '../entities/agent-chat-attachment.entity';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import type { AgentChatAttachmentRepository } from '../repositories/agent-chat-attachment.repository';
import type { AgentFileGrantRepository } from '../repositories/agent-file-grant.repository';

describe('AgentChatAttachmentService', () => {
	let binaryDataService = mock<BinaryDataService>();
	let repository = mock<AgentChatAttachmentRepository>();
	let service: AgentChatAttachmentService;
	let threadRepository = mock<AgentExecutionThreadRepository>();
	let grantRepository = mock<AgentFileGrantRepository>();

	/** Delegation tree: root (agent-1) → child (agent-2) → grandchild (agent-3). */
	const chains: Record<string, Array<{ id: string; agentId: string | null }>> = {
		root: [{ id: 'root', agentId: 'agent-1' }],
		child: [
			{ id: 'child', agentId: 'agent-2' },
			{ id: 'root', agentId: 'agent-1' },
		],
		grandchild: [
			{ id: 'grandchild', agentId: 'agent-3' },
			{ id: 'child', agentId: 'agent-2' },
			{ id: 'root', agentId: 'agent-1' },
		],
	};

	beforeEach(() => {
		vi.clearAllMocks();
		binaryDataService = mock<BinaryDataService>();
		repository = mock<AgentChatAttachmentRepository>();
		threadRepository = mock<AgentExecutionThreadRepository>();
		grantRepository = mock<AgentFileGrantRepository>();
		threadRepository.findDelegationChain.mockImplementation(
			async (threadId) => chains[threadId] ?? [{ id: threadId, agentId: null }],
		);
		service = new AgentChatAttachmentService(
			mock<Logger>(),
			binaryDataService,
			repository,
			threadRepository,
			grantRepository,
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
			repository.save.mockImplementation(async (input) => input as AgentChatAttachment);

			const stored = await service.storeInbound({
				agentId: 'agent-1',
				projectId: 'project-1',
				threadId: 'thread-1',
				resourceId: 'user-1',
				source: 'chat',
				fileName: 'photo.png',
				mimeType: 'image/png',
				data: Buffer.from([1, 2, 3]),
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

			expect(repository.save).toHaveBeenCalledTimes(1);
			expect(stored.binaryDataId).toBe('filesystem-v2:agents/agent-1/attachments/att-1/x');
			expect(stored.fileSizeBytes).toBe(3);
			expect(stored.source).toBe('chat');
			expect(stored.threadId).toBe('thread-1');
			expect(stored.createdByThreadId).toBe('thread-1');
		});

		it('stores a file that a sub-agent makes under the root thread', async () => {
			binaryDataService.store.mockResolvedValue({
				id: 'filesystem-v2:x',
				data: 'filesystem-v2',
				mimeType: 'image/png',
			});
			repository.create.mockImplementation((input) => input as AgentChatAttachment);
			repository.save.mockImplementation(async (input) => input as AgentChatAttachment);

			const stored = await service.storeInbound({
				agentId: 'agent-3',
				projectId: 'project-1',
				threadId: 'grandchild',
				source: 'tool',
				fileName: 'chart.png',
				mimeType: 'image/png',
				data: Buffer.from([1]),
			});

			expect(stored).toMatchObject({
				agentId: 'agent-1',
				threadId: 'root',
				createdByThreadId: 'grandchild',
			});
			expect(binaryDataService.store).toHaveBeenCalledWith(
				expect.objectContaining({
					pathSegments: ['agents', 'agent-1', 'attachments', expect.any(String)],
				}),
				expect.anything(),
				expect.anything(),
			);
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
			repository.save.mockRejectedValue(new Error('db down'));

			await expect(
				service.storeInbound({
					agentId: 'agent-1',
					projectId: 'project-1',
					threadId: 'thread-1',
					source: 'chat',
					fileName: 'photo.png',
					mimeType: 'image/png',
					data: Buffer.from([1]),
				}),
			).rejects.toThrow('db down');
			expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledWith(['filesystem-v2:x']);
		});
	});

	describe('grantToSubAgent', () => {
		const file = {
			id: 'att-1',
			threadId: 'root',
			createdByThreadId: 'root',
		} as AgentChatAttachment;

		it('grants files that the parent can read', async () => {
			repository.findByIdsInThread.mockResolvedValue([file]);

			await service.grantToSubAgent(['att-1'], {
				projectId: 'project-1',
				parentThreadId: 'root',
				childThreadId: 'child',
			});

			expect(repository.findByIdsInThread).toHaveBeenCalledWith(['att-1'], {
				projectId: 'project-1',
				threadId: 'root',
			});
			expect(grantRepository.findGrantedIds).not.toHaveBeenCalled();
			expect(grantRepository.grant).toHaveBeenCalledWith(['att-1'], 'child');
		});

		it('lets a sub-agent pass on files that it got granted', async () => {
			repository.findByIdsInThread.mockResolvedValue([file]);
			grantRepository.findGrantedIds.mockResolvedValue(new Set(['att-1']));

			await service.grantToSubAgent(['att-1'], {
				projectId: 'project-1',
				parentThreadId: 'child',
				childThreadId: 'grandchild',
			});

			expect(grantRepository.findGrantedIds).toHaveBeenCalledWith(['att-1'], 'child');
			expect(grantRepository.grant).toHaveBeenCalledWith(['att-1'], 'grandchild');
		});

		it('rejects a file outside the tree', async () => {
			repository.findByIdsInThread.mockResolvedValue([]);

			await expect(
				service.grantToSubAgent(['att-1'], {
					projectId: 'project-1',
					parentThreadId: 'root',
					childThreadId: 'child',
				}),
			).rejects.toThrow('File "att-1" not found in this conversation');
			expect(grantRepository.grant).not.toHaveBeenCalled();
		});

		it('rejects a thread that is not a sub-agent of the parent', async () => {
			await expect(
				service.grantToSubAgent(['att-1'], {
					projectId: 'project-1',
					parentThreadId: 'root',
					childThreadId: 'grandchild',
				}),
			).rejects.toThrow('sub-agent of this conversation');
			expect(grantRepository.grant).not.toHaveBeenCalled();
		});

		it('rejects a file that the parent cannot read', async () => {
			repository.findByIdsInThread.mockResolvedValue([file]);
			grantRepository.findGrantedIds.mockResolvedValue(new Set());

			await expect(
				service.grantToSubAgent(['att-1'], {
					projectId: 'project-1',
					parentThreadId: 'child',
					childThreadId: 'grandchild',
				}),
			).rejects.toThrow('File "att-1" not found in this conversation');
			expect(grantRepository.findGrantedIds).toHaveBeenCalledWith(['att-1'], 'child');
			expect(grantRepository.grant).not.toHaveBeenCalled();
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

		it('looks up the delegation chain once for each thread', async () => {
			repository.findByIdInThread.mockImplementation(
				async (id) =>
					({
						id,
						binaryDataId: `filesystem-v2:${id}`,
						mimeType: 'image/png',
						createdByThreadId: 'grandchild',
					}) as AgentChatAttachment,
			);
			binaryDataService.getAsBuffer.mockResolvedValue(Buffer.from([1]));

			const store = service.getFileStore(
				{ agentId: 'agent-1', projectId: 'project-1' },
				'anthropic',
			);
			await Promise.all(
				['att-1', 'att-2', 'att-3'].map(
					async (id) => await store.load({ id }, { threadId: 'grandchild' }),
				),
			);
			await store.load({ id: 'att-4' }, { threadId: 'grandchild' });

			expect(threadRepository.findDelegationChain).toHaveBeenCalledTimes(1);
			expect(repository.findByIdInThread).toHaveBeenCalledWith('att-4', {
				projectId: 'project-1',
				threadId: 'root',
			});

			await store.load({ id: 'att-1' }, { threadId: 'root' });
			expect(threadRepository.findDelegationChain).toHaveBeenCalledTimes(2);
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

	describe('deleteFromSourceCreatedBefore', () => {
		const BATCH_SIZE = 500;
		const scope = { agentId: 'agent-1', source: 'whatsapp' };
		const before = new Date('2026-01-01T00:00:00.000Z');

		const attachments = (count: number, prefix: string) =>
			Array.from({ length: count }, (_, i) => ({
				id: `${prefix}-${i}`,
				binaryDataId: `filesystem-v2:${prefix}-${i}`,
			})) as AgentChatAttachment[];

		beforeEach(() => {
			binaryDataService.deleteManyByBinaryDataId.mockResolvedValue(undefined as never);
		});

		it('deletes in batches until a batch is smaller than the batch size', async () => {
			repository.findFromSourceCreatedBefore
				.mockResolvedValueOnce(attachments(BATCH_SIZE, 'a'))
				.mockResolvedValueOnce(attachments(BATCH_SIZE, 'b'))
				.mockResolvedValueOnce(attachments(3, 'c'));

			const deleted = await service.deleteFromSourceCreatedBefore(scope, before);

			expect(deleted).toBe(BATCH_SIZE * 2 + 3);
			expect(repository.findFromSourceCreatedBefore).toHaveBeenCalledTimes(3);
			expect(repository.findFromSourceCreatedBefore).toHaveBeenCalledWith(
				scope,
				before,
				BATCH_SIZE,
			);
			expect(repository.delete).toHaveBeenCalledTimes(3);
			expect(repository.delete).toHaveBeenLastCalledWith(['c-0', 'c-1', 'c-2']);
			expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenLastCalledWith([
				'filesystem-v2:c-0',
				'filesystem-v2:c-1',
				'filesystem-v2:c-2',
			]);
		});

		it('queries again after a full batch and stops at an empty one', async () => {
			repository.findFromSourceCreatedBefore
				.mockResolvedValueOnce(attachments(BATCH_SIZE, 'a'))
				.mockResolvedValueOnce([]);

			expect(await service.deleteFromSourceCreatedBefore(scope, before)).toBe(BATCH_SIZE);
			expect(repository.findFromSourceCreatedBefore).toHaveBeenCalledTimes(2);
			expect(repository.delete).toHaveBeenCalledTimes(1);
		});

		it('returns 0 and deletes nothing when no file is overdue', async () => {
			repository.findFromSourceCreatedBefore.mockResolvedValueOnce([]);

			expect(await service.deleteFromSourceCreatedBefore(scope, before)).toBe(0);
			expect(repository.findFromSourceCreatedBefore).toHaveBeenCalledTimes(1);
			expect(repository.delete).not.toHaveBeenCalled();
			expect(binaryDataService.deleteManyByBinaryDataId).not.toHaveBeenCalled();
		});

		it('deletes the bytes before the rows', async () => {
			repository.findFromSourceCreatedBefore.mockResolvedValueOnce(attachments(2, 'a'));

			await service.deleteFromSourceCreatedBefore(scope, before);

			expect(binaryDataService.deleteManyByBinaryDataId.mock.invocationCallOrder[0]).toBeLessThan(
				repository.delete.mock.invocationCallOrder[0],
			);
		});

		it('keeps the rows and throws when the bytes cannot be deleted', async () => {
			repository.findFromSourceCreatedBefore.mockResolvedValueOnce(attachments(2, 'a'));
			binaryDataService.deleteManyByBinaryDataId.mockRejectedValueOnce(new Error('storage down'));

			await expect(service.deleteFromSourceCreatedBefore(scope, before)).rejects.toThrow(
				'storage down',
			);
			expect(repository.delete).not.toHaveBeenCalled();
		});

		it('stops between batches when the signal aborts', async () => {
			const controller = new AbortController();
			repository.findFromSourceCreatedBefore.mockImplementationOnce(async () => {
				controller.abort();
				return attachments(BATCH_SIZE, 'a');
			});

			const deleted = await service.deleteFromSourceCreatedBefore(scope, before, controller.signal);

			expect(deleted).toBe(BATCH_SIZE);
			expect(repository.findFromSourceCreatedBefore).toHaveBeenCalledTimes(1);
		});

		it('deletes nothing when the signal is already aborted', async () => {
			const controller = new AbortController();
			controller.abort();

			expect(await service.deleteFromSourceCreatedBefore(scope, before, controller.signal)).toBe(0);
			expect(repository.findFromSourceCreatedBefore).not.toHaveBeenCalled();
		});
	});
});
