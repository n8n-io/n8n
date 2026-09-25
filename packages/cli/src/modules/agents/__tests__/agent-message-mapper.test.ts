import type { AgentDbMessage } from '@n8n/agents';

import { messageToDto } from '../agent-message-mapper';

describe('agent-message-mapper — file parts', () => {
	it('maps fileRef file parts to reference metadata, never bytes', () => {
		const createdAt = new Date('2024-01-15T10:00:00.000Z');
		const message: AgentDbMessage = {
			id: 'm-1',
			createdAt,
			role: 'user',
			content: [
				{ type: 'text', text: 'look' },
				{
					type: 'file',
					mediaType: 'image/png',
					data: new Uint8Array([1, 2, 3]),
					fileRef: { id: 'att-1', fileName: 'photo.png', sizeBytes: 3 },
				},
			],
		};

		const dto = messageToDto(message);

		expect(dto?.createdAt).toBe(createdAt.toISOString());
		expect(dto?.content[1]).toEqual({
			type: 'file',
			fileId: 'att-1',
			fileName: 'photo.png',
			mimeType: 'image/png',
			sizeBytes: 3,
		});
	});

	it('exposes no file fields for file parts without a fileRef', () => {
		const createdAt = new Date('2024-01-15T10:00:00.000Z');
		const message: AgentDbMessage = {
			id: 'm-1',
			createdAt,
			role: 'assistant',
			content: [{ type: 'file', mediaType: 'image/png', data: new Uint8Array([1]) }],
		};

		const dto = messageToDto(message);

		expect(dto?.createdAt).toBe(createdAt.toISOString());
		expect(dto?.content[0]).toEqual({ type: 'file' });
	});
});

describe('agent-message-mapper — createdAt', () => {
	// Checkpoint state is JSON-parsed, so a suspended turn reaches the mapper
	// with an ISO string, or with no createdAt at all on older states.
	function message(createdAt: unknown): AgentDbMessage {
		return {
			id: 'm-1',
			role: 'user',
			content: [{ type: 'text', text: 'hi' }],
			createdAt,
		} as unknown as AgentDbMessage;
	}

	it('maps an ISO string through, and omits createdAt when it is unusable', () => {
		expect(messageToDto(message('2024-01-15T10:00:00.000Z'))?.createdAt).toBe(
			'2024-01-15T10:00:00.000Z',
		);
		expect(messageToDto(message(undefined))?.createdAt).toBeUndefined();
		expect(messageToDto(message('not a date'))?.createdAt).toBeUndefined();
	});
});
