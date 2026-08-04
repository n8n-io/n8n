import type { AgentDbMessage } from '@n8n/agents';

import { messageToDto } from '../agent-message-mapper';

describe('agent-message-mapper — file parts', () => {
	it('maps fileRef file parts to reference metadata, never bytes', () => {
		const message: AgentDbMessage = {
			id: 'm-1',
			createdAt: new Date(),
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

		expect(dto?.content[1]).toEqual({
			type: 'file',
			fileId: 'att-1',
			fileName: 'photo.png',
			mimeType: 'image/png',
			sizeBytes: 3,
		});
	});

	it('exposes no file fields for file parts without a fileRef', () => {
		const message: AgentDbMessage = {
			id: 'm-1',
			createdAt: new Date(),
			role: 'assistant',
			content: [{ type: 'file', mediaType: 'image/png', data: new Uint8Array([1]) }],
		};

		const dto = messageToDto(message);

		expect(dto?.content[0]).toEqual({ type: 'file' });
	});
});
