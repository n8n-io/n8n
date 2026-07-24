import type { Message } from '@n8n/agents';

import { buildInboundUserMessage, resolveInboundMimeType } from '../inbound-attachments';

// Minimal real PNG header (magic bytes + IHDR chunk) so file-type can sniff it.
const PNG_BYTES = Buffer.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
	0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
	0x89,
]);

const TEXT_BYTES = Buffer.from('just some text, no magic bytes');

describe('buildInboundUserMessage', () => {
	it('emits one text part followed by reference-only file parts', () => {
		const [message] = buildInboundUserMessage('look at these', [
			{ id: 'att-1', fileName: 'photo.png', mimeType: 'image/png', sizeBytes: 33 },
			{ id: 'att-2', fileName: 'voice.ogg', mimeType: 'audio/ogg', sizeBytes: 100 },
		]) as Message[];

		expect(message.role).toBe('user');
		expect(message.content).toEqual([
			{ type: 'text', text: 'look at these' },
			{
				type: 'file',
				mediaType: 'image/png',
				fileRef: { id: 'att-1', fileName: 'photo.png', sizeBytes: 33 },
			},
			{
				type: 'file',
				mediaType: 'audio/ogg',
				fileRef: { id: 'att-2', fileName: 'voice.ogg', sizeBytes: 100 },
			},
		]);
	});

	it('omits the text part for attachment-only sends', () => {
		const [message] = buildInboundUserMessage('', [
			{ id: 'att-1', fileName: 'photo.png', mimeType: 'image/png', sizeBytes: 33 },
		]) as Message[];

		expect(message.content).toHaveLength(1);
		expect(message.content[0].type).toBe('file');
	});
});

describe('resolveInboundMimeType', () => {
	it('confirms a declared image type against magic bytes', async () => {
		expect(await resolveInboundMimeType('image/png', PNG_BYTES)).toBe('image/png');
	});

	it('demotes a model-eligible declaration that magic bytes contradict', async () => {
		expect(await resolveInboundMimeType('image/png', TEXT_BYTES)).toBe('application/octet-stream');
	});

	it('passes through declarations that never reach the model as bytes', async () => {
		expect(await resolveInboundMimeType('text/csv', TEXT_BYTES)).toBe('text/csv');
	});

	it('sniffs the type when no declaration is provided', async () => {
		expect(await resolveInboundMimeType(undefined, PNG_BYTES)).toBe('image/png');
		expect(await resolveInboundMimeType(undefined, TEXT_BYTES)).toBe('application/octet-stream');
	});
});
