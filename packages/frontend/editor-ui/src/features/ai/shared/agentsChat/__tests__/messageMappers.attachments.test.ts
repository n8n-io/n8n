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

describe('convertDbMessages — reply files', () => {
	const file = {
		fileId: 'att-1',
		fileName: 'report.pdf',
		mimeType: 'application/pdf',
		sizeBytes: 2048,
	};

	it('shows the files of an n8n Chat respond on the assistant message', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm-1',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'tc-1',
						toolName: 'chat_action',
						input: {
							action: 'respond',
							input: { message: { text: 'Report' }, fileIds: ['att-1'] },
						},
						state: 'resolved',
						output: { ok: true, files: [file] },
					},
					{ type: 'text', text: 'Here is the report.' },
				],
			},
		];

		const [message] = convertDbMessages(dbMessages);

		expect(message.attachments).toEqual([file]);
	});

	it('reads the files of a batched respond', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm-1',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'tc-1',
						toolName: 'chat_action',
						input: {},
						state: 'resolved',
						output: {
							ok: true,
							results: [{ action: 'respond', result: { ok: true, files: [file] } }],
						},
					},
				],
			},
		];

		const [message] = convertDbMessages(dbMessages);

		expect(message.attachments).toEqual([file]);
	});

	it('shows a file one time when respond results repeat it', () => {
		const respond = (toolCallId: string) => ({
			type: 'tool-call' as const,
			toolCallId,
			toolName: 'chat_action',
			input: {},
			state: 'resolved' as const,
			output: {
				ok: true,
				results: [
					{ action: 'respond', result: { ok: true, files: [file] } },
					{ action: 'respond', result: { ok: true, files: [file] } },
				],
			},
		});
		const dbMessages: AgentPersistedMessageDto[] = [
			{ id: 'm-1', role: 'assistant', content: [respond('tc-1'), respond('tc-2')] },
		];

		const [message] = convertDbMessages(dbMessages);

		expect(message.attachments).toEqual([file]);
	});

	it('ignores the files of other tools', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm-1',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'tc-1',
						toolName: 'make_report',
						input: {},
						state: 'resolved',
						output: { ok: true, files: [file] },
					},
				],
			},
		];

		const [message] = convertDbMessages(dbMessages);

		expect(message.attachments).toBeUndefined();
	});
});
