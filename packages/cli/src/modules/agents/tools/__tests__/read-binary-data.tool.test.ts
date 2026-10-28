import { Readable } from 'node:stream';

import { MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import type { AgentChatAttachmentService } from '../../agent-chat-attachment.service';
import type { AgentChatAttachment } from '../../entities/agent-chat-attachment.entity';
import { createReadBinaryDataTool, MAX_TEXT_FILE_BYTES } from '../read-binary-data.tool';

describe('createReadBinaryDataTool', () => {
	const attachmentService = mock<AgentChatAttachmentService>();
	const ctx = { persistence: { threadId: 'thread-1', resourceId: 'user-1' } };

	function build(provider = 'anthropic') {
		return createReadBinaryDataTool({
			projectId: 'project-1',
			provider,
			attachmentService,
		}).build();
	}

	function file(overrides: Partial<AgentChatAttachment> = {}) {
		return mock<AgentChatAttachment>({
			id: 'file-1',
			fileName: 'photo.png',
			mimeType: 'image/png',
			fileSizeBytes: 3,
			...overrides,
		});
	}

	beforeEach(() => {
		vi.resetAllMocks();
		attachmentService.hasStoredData.mockResolvedValue(true);
	});

	it('returns an image as a file reference part for the runtime to load', async () => {
		attachmentService.getReadable.mockResolvedValue(file());
		const tool = build();

		const output = await tool.handler!({ fileId: 'file-1' }, ctx);

		expect(attachmentService.getReadable).toHaveBeenCalledWith('file-1', {
			projectId: 'project-1',
			threadId: 'thread-1',
		});
		expect(tool.toModelOutput!(output)).toEqual({
			type: 'content',
			value: [
				{ type: 'text', text: expect.stringContaining('"fileId":"file-1"') },
				{
					type: 'file',
					mediaType: 'image/png',
					fileRef: { id: 'file-1', fileName: 'photo.png', sizeBytes: 3 },
				},
			],
		});
	});

	it('marks its output as untrusted', () => {
		expect(build().outputTrust).toBe('untrusted');
	});

	it('reads a PDF', async () => {
		attachmentService.getReadable.mockResolvedValue(file({ mimeType: 'application/pdf' }));

		await expect(build().handler!({ fileId: 'file-1' }, ctx)).resolves.toMatchObject({
			mimeType: 'application/pdf',
		});
	});

	it.each(['text/csv', 'application/json'])(
		'returns a %s file as text in the tool result',
		async (mimeType) => {
			const attachment = file({ mimeType, fileName: 'data.csv' });
			attachmentService.getReadable.mockResolvedValue(attachment);
			attachmentService.getStream.mockResolvedValue(Readable.from([Buffer.from('a,b\n1,2')]));
			const tool = build();

			const output = await tool.handler!({ fileId: 'file-1' }, ctx);

			expect(attachmentService.getStream).toHaveBeenCalledWith(attachment);
			expect(tool.toModelOutput!(output)).toEqual({
				type: 'content',
				value: [
					{ type: 'text', text: expect.not.stringContaining('a,b') },
					{ type: 'text', text: 'a,b\n1,2' },
				],
			});
		},
	);

	it('rejects a file that the thread cannot read', async () => {
		attachmentService.getReadable.mockResolvedValue(null);

		await expect(build().handler!({ fileId: 'other' }, ctx)).rejects.toThrow(
			'File "other" not found in this conversation',
		);
	});

	it('rejects a file whose stored bytes are gone', async () => {
		attachmentService.getReadable.mockResolvedValue(file());
		attachmentService.hasStoredData.mockResolvedValue(false);

		await expect(build().handler!({ fileId: 'file-1' }, ctx)).rejects.toThrow(
			'File "file-1" is no longer available',
		);
	});

	it('rejects a run without a thread', async () => {
		await expect(build().handler!({ fileId: 'file-1' }, {})).rejects.toThrow(
			'Files can only be read in a conversation',
		);
		expect(attachmentService.getReadable).not.toHaveBeenCalled();
	});

	it('rejects other file types', async () => {
		attachmentService.getReadable.mockResolvedValue(file({ mimeType: 'application/zip' }));

		await expect(build().handler!({ fileId: 'file-1' }, ctx)).rejects.toThrow(
			'Cannot read files of type "application/zip". This tool reads images, PDFs and text files',
		);
	});

	it('rejects an image when the model cannot read images', async () => {
		attachmentService.getReadable.mockResolvedValue(file());

		await expect(build('unknown').handler!({ fileId: 'file-1' }, ctx)).rejects.toThrow(
			'This model cannot read files of type "image/png"',
		);
	});

	it.each(['image/tiff', 'image/heic'])(
		'rejects a %s image that the model cannot read',
		async (mimeType) => {
			attachmentService.getReadable.mockResolvedValue(file({ mimeType }));

			await expect(build().handler!({ fileId: 'file-1' }, ctx)).rejects.toThrow(
				expect.objectContaining({ message: expect.stringContaining(mimeType) }),
			);
		},
	);

	it.each(['image/png', 'application/pdf'])(
		'rejects a %s file that is too large',
		async (mimeType) => {
			attachmentService.getReadable.mockResolvedValue(
				file({ mimeType, fileSizeBytes: MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES + 1 }),
			);

			await expect(build().handler!({ fileId: 'file-1' }, ctx)).rejects.toThrow('too large');
		},
	);

	it('rejects a text file that is too large', async () => {
		attachmentService.getReadable.mockResolvedValue(
			file({ mimeType: 'text/plain', fileSizeBytes: MAX_TEXT_FILE_BYTES + 1 }),
		);

		await expect(build().handler!({ fileId: 'file-1' }, ctx)).rejects.toThrow('too large');
	});
});
