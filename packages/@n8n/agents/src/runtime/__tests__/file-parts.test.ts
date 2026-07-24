/**
 * File-reference content parts: hydration, persistence stripping, and the
 * text-metadata degrade for parts the model cannot receive as bytes.
 */
import { describe, it, expect, vi } from 'vitest';

import type { BuiltFileStore } from '../../types/sdk/file-store';
import type { AgentDbMessage, ContentFile, Message } from '../../types/sdk/message';
import { stripHydratedFileData } from '../../types/sdk/message';
import { hydrateFileParts } from '../loop/hydrate-file-parts';
import { toAiMessages } from '../model/messages';

const bytes = new Uint8Array([1, 2, 3]);

function refFileBlock(overrides: Partial<ContentFile> = {}): ContentFile {
	return {
		type: 'file',
		mediaType: 'image/png',
		fileRef: { id: 'att-1', fileName: 'photo.png', sizeBytes: 1_258_291 },
		...overrides,
	};
}

function userMessage(content: Message['content']): AgentDbMessage {
	return { id: 'm-1', createdAt: new Date(), role: 'user', content };
}

describe('hydrateFileParts', () => {
	it('loads bytes into reference-only file blocks', async () => {
		const block = refFileBlock();
		const store: BuiltFileStore = { load: vi.fn().mockResolvedValue(bytes) };

		await hydrateFileParts([userMessage([block])], store);

		expect(store.load).toHaveBeenCalledWith(block.fileRef);
		expect(block.data).toBe(bytes);
	});

	it('leaves blocks reference-only when the media type is unsupported', async () => {
		const block = refFileBlock({ mediaType: 'audio/ogg' });
		const store: BuiltFileStore = {
			load: vi.fn().mockResolvedValue(bytes),
			isMediaTypeSupported: (mediaType) => mediaType?.startsWith('image/') === true,
		};

		await hydrateFileParts([userMessage([block])], store);

		expect(store.load).not.toHaveBeenCalled();
		expect(block.data).toBeUndefined();
	});

	it('leaves blocks reference-only when the store cannot resolve or throws', async () => {
		const missing = refFileBlock();
		const failing = refFileBlock({ fileRef: { id: 'att-2' } });
		const store: BuiltFileStore = {
			load: vi.fn().mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('storage down')),
		};

		await hydrateFileParts([userMessage([missing]), userMessage([failing])], store);

		expect(missing.data).toBeUndefined();
		expect(failing.data).toBeUndefined();
	});

	it('skips blocks that already have data and messages without content', async () => {
		const hydrated = refFileBlock({ data: bytes });
		const custom: AgentDbMessage = {
			id: 'm-2',
			createdAt: new Date(),
			type: 'custom',
			data: { dummy: 'x' },
		};
		const store: BuiltFileStore = { load: vi.fn() };

		await hydrateFileParts([userMessage([hydrated]), custom], store);

		expect(store.load).not.toHaveBeenCalled();
	});

	it('is a no-op without a file store', async () => {
		const block = refFileBlock();
		await hydrateFileParts([userMessage([block])], undefined);
		expect(block.data).toBeUndefined();
	});
});

describe('stripHydratedFileData', () => {
	it('removes data from file blocks that carry a fileRef, without mutating the original', () => {
		const block = refFileBlock({ data: bytes });
		const message = userMessage([{ type: 'text', text: 'look' }, block]);

		const stripped = stripHydratedFileData(message);

		const strippedFile = (stripped as Message).content[1] as ContentFile;
		expect(strippedFile.data).toBeUndefined();
		expect(strippedFile.fileRef).toEqual(block.fileRef);
		// Original block untouched — the live message list keeps its bytes.
		expect(block.data).toBe(bytes);
	});

	it('keeps inline data on file blocks without a fileRef', () => {
		const inline: ContentFile = { type: 'file', mediaType: 'image/png', data: bytes };
		const message = userMessage([inline]);

		const stripped = stripHydratedFileData(message);

		expect(stripped).toBe(message);
		expect((stripped as Message).content[0]).toBe(inline);
	});

	it('passes through custom messages', () => {
		const custom: AgentDbMessage = {
			id: 'm-3',
			createdAt: new Date(),
			type: 'custom',
			data: { dummy: 'x' },
		};
		expect(stripHydratedFileData(custom)).toBe(custom);
	});
});

describe('toAiMessages — file parts', () => {
	it('emits hydrated file blocks as AI SDK file parts', () => {
		const input: Message[] = [{ role: 'user', content: [refFileBlock({ data: bytes })] }];

		const [message] = toAiMessages(input);

		expect(message.content).toEqual([{ type: 'file', data: bytes, mediaType: 'image/png' }]);
	});

	it('degrades reference-only file blocks to a text metadata part', () => {
		const input: Message[] = [
			{ role: 'user', content: [{ type: 'text', text: 'listen to this' }, refFileBlock()] },
		];

		const [message] = toAiMessages(input);
		const parts = message.content as Array<{ type: string; text?: string }>;

		expect(parts).toHaveLength(2);
		expect(parts[1].type).toBe('text');
		expect(parts[1].text).toContain('photo.png');
		expect(parts[1].text).toContain('image/png');
		expect(parts[1].text).toContain('1.2 MB');
		expect(parts[1].text).toContain('fileId: att-1');
	});
});
