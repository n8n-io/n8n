import type { Logger } from '@n8n/backend-common';
import type { BinaryDataService } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import type { AgentChatAttachment } from '../entities/agent-chat-attachment.entity';
import type { AgentChatAttachmentRepository } from '../repositories/agent-chat-attachment.repository';

describe('AgentChatAttachmentService', () => {
	let binaryDataService = mock<BinaryDataService>();
	let repository = mock<AgentChatAttachmentRepository>();
	let service: AgentChatAttachmentService;

	beforeEach(() => {
		vi.clearAllMocks();
		binaryDataService = mock<BinaryDataService>();
		repository = mock<AgentChatAttachmentRepository>();
		service = new AgentChatAttachmentService(mock<Logger>(), binaryDataService, repository);
	});

	describe('storeInbound', () => {
		it('stores bytes via BinaryDataService and persists a scoped row', async () => {
			binaryDataService.store.mockResolvedValue({
				id: 'filesystem-v2:agent-chat-attachments/project-1/att-1/x',
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
			expect(repository.save).toHaveBeenCalledTimes(1);
			expect(stored.binaryDataId).toBe('filesystem-v2:agent-chat-attachments/project-1/att-1/x');
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
		it('deletes rows and bytes for the thread', async () => {
			binaryDataService.deleteManyByBinaryDataId.mockResolvedValue(undefined as never);
			repository.findByThreadId.mockResolvedValue([
				{ id: 'att-1', binaryDataId: 'filesystem-v2:a' },
				{ id: 'att-2', binaryDataId: 'filesystem-v2:b' },
			] as AgentChatAttachment[]);

			await service.deleteByThread('thread-1');

			expect(repository.delete).toHaveBeenCalledWith(['att-1', 'att-2']);
			expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledWith([
				'filesystem-v2:a',
				'filesystem-v2:b',
			]);
		});

		it('is a no-op for threads without attachments', async () => {
			repository.findByThreadId.mockResolvedValue([]);
			await service.deleteByThread('thread-1');
			expect(repository.delete).not.toHaveBeenCalled();
		});
	});
});
