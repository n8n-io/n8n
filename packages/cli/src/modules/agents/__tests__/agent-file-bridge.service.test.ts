import { MAX_AGENT_TOOL_OUTPUT_FILE_BYTES } from '@n8n/api-types';
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
			id: expect.any(String),
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
			skippedFiles: [],
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

	it('names a binary without a file name after its file ID', async () => {
		const { fileName: _fileName, ...binary } = pngBinary;
		attachmentService.storeInbound.mockImplementation(async (params) =>
			mock<AgentChatAttachment>({ id: params.id, fileSizeBytes: PNG.byteLength }),
		);

		const result = await bridge.adoptFromItems([{ json: {}, binary: { data: binary } }], scope);

		const { id, fileName } = attachmentService.storeInbound.mock.calls[0][0];
		expect(id).toEqual(expect.any(String));
		expect(fileName).toBe(`${id}.png`);
		expect(result.files[0]).toMatchObject({ fileId: id, fileName: `${id}.png` });
	});

	describe('size limit', () => {
		it('reports a file over the limit as skipped and does not read it', async () => {
			binaryDataService.getMetadata.mockResolvedValue({
				fileSize: MAX_AGENT_TOOL_OUTPUT_FILE_BYTES + 1,
			});

			const result = await bridge.adoptFromItems(
				[{ json: {}, binary: { data: pngBinary } }],
				scope,
			);

			expect(binaryDataService.getMetadata).toHaveBeenCalledWith(pngBinary.id);
			expect(binaryDataService.getAsBuffer).not.toHaveBeenCalled();
			expect(attachmentService.storeInbound).not.toHaveBeenCalled();
			expect(result).toEqual({
				items: [{ json: {}, binary: {} }],
				files: [],
				skippedFiles: [{ fileName: 'cat.png', reason: 'larger than 50 MB' }],
			});
		});

		it('lists a too-large binary that many items and calls pass on one time', async () => {
			binaryDataService.getMetadata.mockResolvedValue({
				fileSize: MAX_AGENT_TOOL_OUTPUT_FILE_BYTES + 1,
			});
			const items = [
				{ json: {}, binary: { data: pngBinary } },
				{ json: {}, binary: { data: pngBinary } },
			];
			const stored = new Map();
			const skipped = new Set<string>();

			const first = await bridge.adoptFromItems(items, scope, stored, skipped);
			const second = await bridge.adoptFromItems(items, scope, stored, skipped);

			expect(first.skippedFiles).toEqual([{ fileName: 'cat.png', reason: 'larger than 50 MB' }]);
			expect(second.skippedFiles).toEqual([]);
			expect(binaryDataService.getMetadata).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledTimes(1);
		});

		it('stores a file at the limit', async () => {
			const result = await bridge.adoptFromItems(
				[{ json: {}, binary: { data: { ...pngBinary, bytes: MAX_AGENT_TOOL_OUTPUT_FILE_BYTES } } }],
				scope,
			);

			expect(attachmentService.storeInbound).toHaveBeenCalled();
			expect(result.files).toHaveLength(1);
			expect(result.skippedFiles).toEqual([]);
		});
	});

	describe('file names', () => {
		const storedName = async (binary: Partial<typeof pngBinary>) => {
			await bridge.adoptFromItems(
				[{ json: {}, binary: { data: { ...pngBinary, ...binary } } }],
				scope,
			);
			const { id, fileName } = attachmentService.storeInbound.mock.calls[0][0];
			return { id, fileName };
		};

		it('replaces a name without an extension with the file ID and an extension', async () => {
			const { id, fileName } = await storedName({ fileName: 'data' });

			expect(fileName).toBe(`${id}.png`);
		});

		it('keeps a name that has an extension', async () => {
			const { fileName } = await storedName({ fileName: 'report.pdf' });

			expect(fileName).toBe('report.pdf');
		});

		it('uses the file ID when no extension is known', async () => {
			binaryDataService.getAsBuffer.mockResolvedValue(Buffer.from('plain'));

			const { id, fileName } = await storedName({
				fileName: 'README',
				mimeType: 'application/x-unknown',
			});

			expect(fileName).toBe(id);
		});

		it('uses the file ID for an empty name when no extension is known', async () => {
			binaryDataService.getAsBuffer.mockResolvedValue(Buffer.from('plain'));

			const { id, fileName } = await storedName({
				fileName: '',
				mimeType: 'application/x-unknown',
			});

			expect(fileName).toBe(id);
		});

		it('replaces a name longer than the column with the file ID and an extension', async () => {
			const { id, fileName } = await storedName({ fileName: `${'a'.repeat(296)}.png` });

			expect(fileName).toBe(`${id}.png`);
		});
	});

	describe('toBinary', () => {
		const readScope = { projectId: 'project-1', threadId: 'thread-1' };
		const inputFile = {
			fileId: 'aid-1',
			fileName: 'cat.png',
			mimeType: 'image/png',
			sizeBytes: 68,
		};
		const readable = () =>
			attachmentService.getReadable.mockResolvedValue(
				mock<AgentChatAttachment>({
					binaryDataId: 'filesystem-v2:agents/a/attachments/aid-1',
					mimeType: 'image/png',
					fileName: 'cat.png',
					fileSizeBytes: 68,
				}),
			);

		it('resolves readable file IDs to binary entries that point to the stored bytes', async () => {
			readable();

			await expect(bridge.toBinary({ data: 'aid-1' }, readScope)).resolves.toEqual({
				binary: {
					data: {
						id: 'filesystem-v2:agents/a/attachments/aid-1',
						data: 'filesystem-v2',
						mimeType: 'image/png',
						fileName: 'cat.png',
						fileExtension: 'png',
						bytes: 68,
					},
				},
				stored: new Map([['filesystem-v2:agents/a/attachments/aid-1', inputFile]]),
			});
			expect(attachmentService.getReadable).toHaveBeenCalledWith('aid-1', readScope);
			expect(binaryDataService.getAsBuffer).not.toHaveBeenCalled();
		});

		it('keeps the file ID of an input file that the tool returns unchanged', async () => {
			readable();
			const input = await bridge.toBinary({ data: 'aid-1' }, readScope);

			const result = await bridge.adoptFromItems(
				[{ json: {}, binary: input!.binary }],
				scope,
				input!.stored,
			);

			expect(attachmentService.storeInbound).not.toHaveBeenCalled();
			expect(result).toEqual({
				items: [{ json: {}, binary: { data: 'aid-1' } }],
				files: [],
				skippedFiles: [],
			});
		});

		it('replaces the binary ID in the json of an unchanged input file', async () => {
			readable();
			const input = await bridge.toBinary({ data: 'aid-1' }, readScope);
			const binaryId = 'filesystem-v2:agents/a/attachments/aid-1';

			const result = await bridge.adoptFromItems(
				[{ json: { image: { id: binaryId } }, binary: input!.binary }],
				scope,
				input!.stored,
			);

			expect(attachmentService.storeInbound).not.toHaveBeenCalled();
			expect(result.items).toEqual([
				{ json: { image: { id: 'aid-1' } }, binary: { data: 'aid-1' } },
			]);
		});

		it('stores a changed binary as a new file', async () => {
			readable();
			attachmentService.storeInbound.mockResolvedValue(
				mock<AgentChatAttachment>({ id: 'aid-2', fileSizeBytes: PNG.byteLength }),
			);
			const input = await bridge.toBinary({ data: 'aid-1' }, readScope);

			const result = await bridge.adoptFromItems(
				[{ json: {}, binary: { data: pngBinary } }],
				scope,
				input!.stored,
			);

			expect(attachmentService.storeInbound).toHaveBeenCalledTimes(1);
			expect(result.items).toEqual([{ json: {}, binary: { data: 'aid-2' } }]);
		});

		it('fails for a file that the thread cannot read', async () => {
			attachmentService.getReadable.mockResolvedValue(null);

			await expect(bridge.toBinary({ data: 'other' }, readScope)).rejects.toThrow(
				'File "other" not found in this conversation',
			);
		});

		it('fails when the run has no thread', async () => {
			await expect(bridge.toBinary({ data: 'aid-1' }, { projectId: 'project-1' })).rejects.toThrow(
				'Files can only be passed to tools in a conversation',
			);
			expect(attachmentService.getReadable).not.toHaveBeenCalled();
		});

		it('returns undefined when no files are passed', async () => {
			await expect(bridge.toBinary(undefined, readScope)).resolves.toBeUndefined();
			await expect(bridge.toBinary({}, readScope)).resolves.toBeUndefined();
		});
	});
});
