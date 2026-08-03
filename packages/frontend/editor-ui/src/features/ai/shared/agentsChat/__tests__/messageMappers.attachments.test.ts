import type { AgentPersistedMessageDto } from '@n8n/api-types';

import { convertDbMessages } from '../messageMappers';

describe('convertDbMessages — file parts', () => {
	it('maps file parts to message attachments', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm-1',
				role: 'user',
				content: [
					{ type: 'text', text: 'look at this' },
					{
						type: 'file',
						fileId: 'att-1',
						fileName: 'photo.png',
						mimeType: 'image/png',
						sizeBytes: 33,
					},
				],
			},
		];

		const [message] = convertDbMessages(dbMessages);

		expect(message.content).toBe('look at this');
		expect(message.attachments).toEqual([
			{ fileId: 'att-1', fileName: 'photo.png', mimeType: 'image/png', sizeBytes: 33 },
		]);
	});

	it('applies fallbacks and skips file parts without a fileId', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm-1',
				role: 'user',
				content: [{ type: 'file', fileId: 'att-1' }, { type: 'file' }],
			},
		];

		const [message] = convertDbMessages(dbMessages);

		expect(message.attachments).toEqual([
			{
				fileId: 'att-1',
				fileName: 'attachment',
				mimeType: 'application/octet-stream',
				sizeBytes: undefined,
			},
		]);
	});

	it('leaves attachments undefined for messages without file parts', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{ id: 'm-1', role: 'user', content: [{ type: 'text', text: 'hi' }] },
		];

		const [message] = convertDbMessages(dbMessages);

		expect(message.attachments).toBeUndefined();
	});
});
