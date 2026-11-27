import type { AgentPersistedMessageDto } from '@n8n/api-types';

import { convertDbMessages } from '../messageMappers';

const redaction = {
	isRedacted: true as const,
	reason: 'workflow_redaction_policy',
	canReveal: false,
};

describe('convertDbMessages — redacted turns', () => {
	it('marks the message and the tool calls of a redacted turn', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'exec-1:assistant',
				role: 'assistant',
				content: [{ type: 'tool-call', toolName: 'lookup', toolCallId: 'tc-1', state: 'resolved' }],
				executionId: 'exec-1',
				executionStatus: 'success',
				redaction,
			},
		];

		const [message] = convertDbMessages(dbMessages);

		expect(message).toMatchObject({ role: 'assistant', content: '', redacted: true });
		expect(message.toolCalls?.[0]).toMatchObject({ tool: 'lookup', redacted: true });
		expect(message.toolCalls?.[0].input).toBeUndefined();
		expect(message.toolCalls?.[0].output).toBeUndefined();
	});

	it('drops the fallback error of a failed call in a redacted turn', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'exec-1:assistant',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'lookup',
						toolCallId: 'tc-1',
						state: 'rejected',
						error: 'Tool "lookup" failed',
					},
				],
				executionId: 'exec-1',
				redaction,
			},
		];

		const [message] = convertDbMessages(dbMessages);

		expect(message.toolCalls?.[0]).toMatchObject({ state: 'error', redacted: true });
		expect(message.toolCalls?.[0].output).toBeUndefined();
	});

	it('leaves messages of other turns unmarked', () => {
		const [message] = convertDbMessages([
			{ id: 'm1', role: 'assistant', content: [{ type: 'text', text: 'Hi' }] },
		]);

		expect(message.redacted).toBeUndefined();
	});
});
