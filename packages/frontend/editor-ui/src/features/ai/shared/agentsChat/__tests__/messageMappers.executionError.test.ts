import type { AgentPersistedMessageDto } from '@n8n/api-types';

import { convertDbMessages } from '../messageMappers';

describe('convertDbMessages — execution errors', () => {
	it('renders the recorded run error as its own error bubble after the transcript', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'exec-1:assistant',
				role: 'assistant',
				content: [{ type: 'text', text: 'partial output' }],
				executionId: 'exec-1',
				executionStatus: 'error',
				executionError: 'The model stream stalled: no data received for 90 seconds.',
			},
		];

		const messages = convertDbMessages(dbMessages);

		expect(messages).toHaveLength(2);
		expect(messages[0]).toMatchObject({ content: 'partial output', status: 'error' });
		expect(messages[1]).toMatchObject({
			role: 'assistant',
			content: 'The model stream stalled: no data received for 90 seconds.',
			status: 'error',
			executionId: 'exec-1',
		});
	});

	it('renders an error bubble even when the errored turn produced no content', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'exec-1:assistant',
				role: 'assistant',
				content: [],
				executionId: 'exec-1',
				executionStatus: 'error',
				executionError: 'fetch failed',
			},
		];

		const messages = convertDbMessages(dbMessages);

		const errorBubble = messages.find((m) => m.content === 'fetch failed');
		expect(errorBubble).toMatchObject({ role: 'assistant', status: 'error' });
	});

	it('adds no error bubble to successful turns', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'exec-1:assistant',
				role: 'assistant',
				content: [{ type: 'text', text: 'all done' }],
				executionId: 'exec-1',
				executionStatus: 'success',
			},
		];

		expect(convertDbMessages(dbMessages)).toHaveLength(1);
	});
});
