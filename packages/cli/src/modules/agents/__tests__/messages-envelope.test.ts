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

	it('appends checkpoint messages when there is no persisted history yet', () => {
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

		const result = withOpenSuspensions([], checkpoint);
		expect(result.openSuspensions).toEqual([{ toolCallId: 'tc-1', runId: 'run-1' }]);
		expect(result.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
	});

	it('does not append checkpoint-only display cards after persisted history', () => {
		const displayCardInput = {
			action: 'respond',
			input: {
				message: {
					card: {
						components: [{ type: 'fields', fields: [{ label: 'ARR', value: '$1m' }] }],
					},
				},
			},
		};
		const activeCardInput = {
			action: 'respond',
			input: {
				message: {
					card: {
						components: [{ type: 'button', label: 'Approve', value: 'approve' }],
					},
				},
			},
		};
		const history: AgentPersistedMessageDto[] = [
			{ id: 'execution-1:user', role: 'user', content: [{ type: 'text', text: 'previous' }] },
			{
				id: 'execution-1:assistant',
				role: 'assistant',
				content: [{ type: 'text', text: 'already persisted' }],
			},
		];
		const checkpoint = {
			status: 'suspended',
			pendingToolCalls: {
				'tc-active': { toolCallId: 'tc-active', runId: 'run-active', suspended: true },
			},
			messageList: {
				messages: [
					{
						id: 'sdk-display-card',
						role: 'assistant',
						content: [
							{
								type: 'tool-call',
								toolName: N8N_CHAT_ACTION_TOOL_NAME,
								toolCallId: 'tc-display',
								input: displayCardInput,
								state: 'resolved',
								output: { ok: true },
							},
						],
					},
					{
						id: 'sdk-active-card',
						role: 'assistant',
						content: [
							{
								type: 'tool-call',
								toolName: N8N_CHAT_ACTION_TOOL_NAME,
								toolCallId: 'tc-active',
								input: activeCardInput,
								state: 'pending',
							},
						],
					},
				],
			},
		} as unknown as SerializableAgentState;

		const result = withOpenSuspensions(history, checkpoint, {
			appendInactiveCheckpointMessages: false,
		});

		expect(result.messages.map((m) => m.id)).toEqual([
			'execution-1:user',
			'execution-1:assistant',
			'sdk-active-card',
		]);
		expect(result.messages[2].content[0]).toMatchObject({ toolCallId: 'tc-active' });
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

	it('enriches execution-derived messages by suspended tool call id without appending checkpoint duplicates', () => {
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
		const executionHistory: AgentPersistedMessageDto[] = [
			{ id: 'execution-1:user', role: 'user', content: [{ type: 'text', text: 'hi' }] },
			{
				id: 'execution-1:assistant',
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
					{ id: 'sdk-user', role: 'user', content: [{ type: 'text', text: 'hi' }] },
					{
						id: 'sdk-assistant',
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

		const result = withOpenSuspensions(executionHistory, checkpoint);

		expect(result.openSuspensions).toEqual([{ toolCallId: 'tc-1', runId: 'run-1' }]);
		expect(result.messages.map((m) => m.id)).toEqual(['execution-1:user', 'execution-1:assistant']);
		expect(result.messages[1].content[0]).toMatchObject({ input: cardInput });
	});

	it('does not reopen a suspended card when persisted history already has a resolved choice', () => {
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
		const executionHistory: AgentPersistedMessageDto[] = [
			{ id: 'execution-1:user', role: 'user', content: [{ type: 'text', text: 'hi' }] },
			{
				id: 'execution-1:assistant',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: N8N_CHAT_ACTION_TOOL_NAME,
						toolCallId: 'tc-1',
						input: cardInput,
						state: 'resolved',
						output: { type: 'button', value: 'approve' },
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
					{ id: 'sdk-user', role: 'user', content: [{ type: 'text', text: 'hi' }] },
					{
						id: 'sdk-assistant',
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

		const result = withOpenSuspensions(executionHistory, checkpoint);

		expect(result.messages.map((m) => m.id)).toEqual(['execution-1:user', 'execution-1:assistant']);
		expect(result.messages[1].content[0]).toMatchObject({
			state: 'resolved',
			output: { type: 'button', value: 'approve' },
		});
	});
});
