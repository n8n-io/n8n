import type { Logger } from '@n8n/backend-common';
import type { BinaryDataService } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import { AgentFileBridge } from '../agent-file-bridge.service';
import type { AgentChatAttachment } from '../entities/agent-chat-attachment.entity';

// A real 1x1 PNG, so the magic-byte check keeps the declared type.
const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
	'base64',
);

const pngBinary = {
	id: 'filesystem-v2:x',
	data: 'filesystem-v2',
	mimeType: 'image/png',
	fileName: 'cat.png',
};

describe('AgentFileBridge', () => {
	const scope = { agentId: 'agent-1', projectId: 'project-1', threadId: 'thread-1' };
	const logger = mock<Logger>();
	const binaryDataService = mock<BinaryDataService>();
	const attachmentService = mock<AgentChatAttachmentService>();
	const bridge = new AgentFileBridge(logger, binaryDataService, attachmentService);

	beforeEach(() => {
		vi.resetAllMocks();
		binaryDataService.getAsBuffer.mockResolvedValue(PNG);
		attachmentService.storeInbound.mockResolvedValue(
			mock<AgentChatAttachment>({ id: 'aid-1', fileSizeBytes: PNG.byteLength }),
		);
	});

	it('stores item binary as tool attachments and replaces it with file IDs', async () => {
		const result = await bridge.adoptFromItems(
			[{ json: { a: 1 } }, { json: { prompt: 'cat' }, binary: { data: pngBinary } }],
			scope,
		);

		expect(attachmentService.storeInbound).toHaveBeenCalledWith({
			...scope,
			source: 'tool',
			fileName: 'cat.png',
			mimeType: 'image/png',
			data: PNG,
		});
		expect(result.items).toEqual([
			{ json: { a: 1 } },
			{ json: { prompt: 'cat' }, binary: { data: 'aid-1' } },
		]);
		expect(result.files).toEqual([
			{ fileId: 'aid-1', fileName: 'cat.png', mimeType: 'image/png', sizeBytes: PNG.byteLength },
		]);
	});

	it('stores a binary one time when the calls share the stored map', async () => {
		const stored = new Map();
		const item = { json: {}, binary: { data: pngBinary } };

		const first = await bridge.adoptFromItems([item], scope, stored);
		const second = await bridge.adoptFromItems([item], scope, stored);

		expect(attachmentService.storeInbound).toHaveBeenCalledTimes(1);
		expect(first.files).toHaveLength(1);
		expect(second.files).toEqual([]);
		expect(second.items).toEqual([{ json: {}, binary: { data: 'aid-1' } }]);
	});

	it('leaves out a file that it cannot store', async () => {
		attachmentService.storeInbound.mockRejectedValue(new Error('storage down'));

		const result = await bridge.adoptFromItems(
			[{ json: { prompt: 'cat', id: pngBinary.id }, binary: { data: pngBinary } }],
			scope,
		);

		expect(result).toEqual({
			items: [{ json: { prompt: 'cat', id: pngBinary.id }, binary: {} }],
			files: [],
		});
		expect(logger.warn).toHaveBeenCalled();
	});

	describe('binary IDs in json', () => {
		it('replaces a json value that equals the binary ID with the file ID', async () => {
			const json = { ...pngBinary, data: undefined };

			const result = await bridge.adoptFromItems([{ json, binary: { data: pngBinary } }], scope);

			expect(result.items[0].json).toEqual({ ...json, id: 'aid-1' });
			expect(json.id).toBe(pngBinary.id);
		});

		it('replaces a nested value', async () => {
			const result = await bridge.adoptFromItems(
				[{ json: { images: [{ ref: { id: pngBinary.id } }] }, binary: { data: pngBinary } }],
				scope,
			);

			expect(result.items[0].json).toEqual({ images: [{ ref: { id: 'aid-1' } }] });
		});

		it('keeps a string that only contains the binary ID', async () => {
			const text = `see ${pngBinary.id}`;

			const result = await bridge.adoptFromItems(
				[{ json: { text }, binary: { data: pngBinary } }],
				scope,
			);

			expect(result.items[0].json).toEqual({ text });
		});
	});
});
