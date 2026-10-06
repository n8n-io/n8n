import { MAX_SESSION_ATTACHMENT_PERSIST_BYTES } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { BinaryDataService } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { InstanceAiChatAttachmentService } from '../instance-ai-chat-attachment.service';
import type { InstanceAiChatAttachment } from '../entities/instance-ai-chat-attachment.entity';
import type { InstanceAiChatAttachmentRepository } from '../repositories/instance-ai-chat-attachment.repository';

describe('InstanceAiChatAttachmentService', () => {
	let binaryDataService = mock<BinaryDataService>();
	let repository = mock<InstanceAiChatAttachmentRepository>();
	let service: InstanceAiChatAttachmentService;

	beforeEach(() => {
		vi.clearAllMocks();
		binaryDataService = mock<BinaryDataService>();
		repository = mock<InstanceAiChatAttachmentRepository>();
		repository.sumFileSizeBytesByThread.mockResolvedValue(0);
		service = new InstanceAiChatAttachmentService(mock<Logger>(), binaryDataService, repository);
	});

	describe('storeInbound', () => {
		it('stores bytes via BinaryDataService and persists a scoped row', async () => {
			binaryDataService.store.mockResolvedValue({
				id: 'filesystem-v2:instance-ai/thread-1/attachments/att-1/x',
				data: 'filesystem-v2',
				mimeType: 'image/png',
			});
			repository.create.mockImplementation((input) => input as InstanceAiChatAttachment);
			repository.save.mockImplementation(async (input) => input as InstanceAiChatAttachment);

			const stored = await service.storeInbound({
				threadId: 'thread-1',
				messageId: 'msg-1',
				fileName: 'photo.png',
				mimeType: 'image/png',
				data: Buffer.from([1, 2, 3]),
			});

			expect(binaryDataService.store).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'custom',
					pathSegments: ['instance-ai', 'thread-1', 'attachments', expect.any(String)],
				}),
				expect.anything(),
				expect.anything(),
			);
			expect(stored.fileSizeBytes).toBe(3);
			expect(stored.messageId).toBe('msg-1');
		});

		it('rejects an upload that would exceed the Session persist cap', async () => {
			repository.sumFileSizeBytesByThread.mockResolvedValue(MAX_SESSION_ATTACHMENT_PERSIST_BYTES);

			await expect(
				service.storeInbound({
					threadId: 'thread-1',
					fileName: 'photo.png',
					mimeType: 'image/png',
					data: Buffer.from([1]),
				}),
			).rejects.toThrow('Session Attachments exceed 1.5 GB');
			expect(binaryDataService.store).not.toHaveBeenCalled();
		});
	});

	describe('listSessionFiles', () => {
		it('maps rows to previewable session file DTOs', async () => {
			repository.findByThread.mockResolvedValue([
				{
					id: 'att-1',
					fileName: 'notes.txt',
					mimeType: 'text/plain',
					fileSizeBytes: 5,
					createdAt: new Date('2026-01-01T00:00:00.000Z'),
				},
				{
					id: 'att-2',
					fileName: 'doc.pdf',
					mimeType: 'application/pdf',
					fileSizeBytes: 10,
					createdAt: new Date('2026-01-02T00:00:00.000Z'),
				},
			] as InstanceAiChatAttachment[]);

			await expect(service.listSessionFiles('thread-1')).resolves.toEqual([
				{
					id: 'att-1',
					kind: 'attachment',
					fileName: 'notes.txt',
					mimeType: 'text/plain',
					sizeBytes: 5,
					createdAt: '2026-01-01T00:00:00.000Z',
					previewable: true,
				},
				{
					id: 'att-2',
					kind: 'attachment',
					fileName: 'doc.pdf',
					mimeType: 'application/pdf',
					sizeBytes: 10,
					createdAt: '2026-01-02T00:00:00.000Z',
					previewable: false,
				},
			]);
		});
	});

	describe('deleteByThread', () => {
		it('deletes rows and bytes for the thread', async () => {
			binaryDataService.deleteManyByBinaryDataId.mockResolvedValue(undefined as never);
			repository.findByThread.mockResolvedValue([
				{ id: 'att-1', binaryDataId: 'filesystem-v2:a' },
			] as InstanceAiChatAttachment[]);

			await service.deleteByThread('thread-1');

			expect(repository.delete).toHaveBeenCalledWith(['att-1']);
			expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledWith(['filesystem-v2:a']);
		});
	});
});
