import type { SerializableAgentState } from '@n8n/agents';
import { N8N_CHAT_ACTION_TOOL_NAME, type AgentPersistedMessageDto } from '@n8n/api-types';

import { withOpenSuspensions } from '../utils/messages-envelope';

const persisted: AgentPersistedMessageDto[] = [
	{ id: 'm1', role: 'user', content: [{ type: 'text', text: 'hi' }] },
];

describe('withOpenSuspensions', () => {
	it('returns messages as-is with no checkpoint', () => {
		const result = withOpenSuspensions(persisted, null);
		expect(result).toEqual({ messages: persisted, openSuspensions: [] });
	});

	it('appends checkpoint-only messages and lists suspended tool calls', () => {
		const checkpoint = {
			status: 'suspended',
			pendingToolCalls: {
				'tc-1': { toolCallId: 'tc-1', runId: 'run-1', suspended: true },
				'tc-2': { toolCallId: 'tc-2', runId: 'run-1', suspended: false },
			},
			messageList: {
				messages: [
					{ id: 'm1', role: 'user', content: [{ type: 'text', text: 'hi' }] },
					{ id: 'm2', role: 'assistant', content: [{ type: 'text', text: 'hello' }] },
				],
			},
		} as unknown as SerializableAgentState;

		const result = withOpenSuspensions(persisted, checkpoint);
		expect(result.openSuspensions).toEqual([{ toolCallId: 'tc-1', runId: 'run-1' }]);
		expect(result.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
	});

	it('uses the checkpoint copy of same-id messages when it carries an open suspended tool call', () => {
		const cardInput = {
			action: 'respond',
			input: {
				message: {
					card: {
						components: [{ type: 'button', label: 'Approve', value: 'approve' }],
					},
				},
			},
		};
		const stalePersisted: AgentPersistedMessageDto[] = [
			{ id: 'm1', role: 'user', content: [{ type: 'text', text: 'hi' }] },
			{
				id: 'm2',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: N8N_CHAT_ACTION_TOOL_NAME,
						toolCallId: 'tc-1',
						state: 'pending',
					},
				],
			},
		];
		const checkpoint = {
			status: 'suspended',
			pendingToolCalls: {
				'tc-1': { toolCallId: 'tc-1', runId: 'run-1', suspended: true },
			},
			messageList: {
				messages: [
					{ id: 'm1', role: 'user', content: [{ type: 'text', text: 'hi' }] },
					{
						id: 'm2',
						role: 'assistant',
						content: [
							{
								type: 'tool-call',
								toolName: N8N_CHAT_ACTION_TOOL_NAME,
								toolCallId: 'tc-1',
								input: cardInput,
								state: 'pending',
							},
						],
					},
				],
			},
		} as unknown as SerializableAgentState;

		const result = withOpenSuspensions(stalePersisted, checkpoint);

		expect(result.openSuspensions).toEqual([{ toolCallId: 'tc-1', runId: 'run-1' }]);
		expect(result.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
		expect(result.messages[1].content[0]).toMatchObject({ input: cardInput });
	});
});
