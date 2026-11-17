import type { AgentPersistedMessageDto } from '@n8n/api-types';

import { convertDbMessages } from '../messageMappers';

describe('convertDbMessages — host events', () => {
	it('maps host-event parts to host events on the assistant message, in order', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm-1',
				role: 'assistant',
				content: [
					{ type: 'host-event', name: 'test.first', payload: { n: 1 } },
					{ type: 'text', text: 'Done' },
					{ type: 'host-event', name: 'test.second' },
				],
			},
		];

		const [message] = convertDbMessages(dbMessages);

		expect(message.content).toBe('Done');
		expect(message.renderParts).toEqual([{ type: 'text', text: 'Done' }]);
		expect(message.hostEvents).toEqual([
			{ id: 'm-1:host-event:0', name: 'test.first', payload: { n: 1 } },
			{ id: 'm-1:host-event:2', name: 'test.second', payload: null },
		]);
	});

	it('keeps the key of a keyed host event', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm-1',
				role: 'assistant',
				content: [
					{ type: 'host-event', name: 'test.progress', key: 'build', payload: { done: 1 } },
				],
			},
		];

		const [message] = convertDbMessages(dbMessages);

		expect(message.hostEvents).toEqual([
			{ id: 'm-1:host-event:0', name: 'test.progress', key: 'build', payload: { done: 1 } },
		]);
	});

	it('ignores host-event parts without a name and on user messages', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{ id: 'm-1', role: 'assistant', content: [{ type: 'host-event', payload: { n: 1 } }] },
			{
				id: 'm-2',
				role: 'user',
				content: [
					{ type: 'text', text: 'hi' },
					{ type: 'host-event', name: 'test.first' },
				],
			},
		];

		const [assistant, user] = convertDbMessages(dbMessages);

		expect(assistant.hostEvents).toBeUndefined();
		expect(user.hostEvents).toBeUndefined();
	});
});
