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

	it('keeps delegated tool input while redacting its approval display payload', () => {
		const delegateInput = {
			subAgentId: 'inline',
			taskName: 'research_api',
			goal: 'Research the requested API',
			context: 'Use the configured research agent',
		};
		const suspendPayload = {
			type: 'approval',
			toolName: 'http_request',
			args: { url: 'https://example.com/data', password: 'secret' },
		};
		const checkpoint = {
			status: 'suspended',
			pendingToolCalls: {
				'parent-tool-call-1': {
					toolCallId: 'parent-tool-call-1',
					runId: 'parent-run-1',
					suspended: true,
					suspendPayload,
				},
			},
			messageList: {
				messages: [
					{
						id: 'assistant-delegate',
						role: 'assistant',
						content: [
							{
								type: 'tool-call',
								toolName: 'delegate_subagent',
								toolCallId: 'parent-tool-call-1',
								input: delegateInput,
								state: 'pending',
							},
						],
					},
				],
			},
		} as unknown as SerializableAgentState;

		const result = withOpenSuspensions([], checkpoint);

		expect(result.messages[0].content[0]).toMatchObject({ input: delegateInput });
		expect(result.openSuspensions).toEqual([
			{
				toolCallId: 'parent-tool-call-1',
				runId: 'parent-run-1',
				suspendPayload: {
					...suspendPayload,
					args: { url: 'https://example.com/data', password: '[REDACTED]' },
				},
			},
		]);
		expect(suspendPayload.args.password).toBe('secret');
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

	describe('when a tool call id repeats in the thread', () => {
		const REUSED_ID = 'toolu_1';
		const proposalPayload = { message: 'Turn on "Daily digest"?', automationProposal: {} };
		const buildPart = {
			type: 'tool-call',
			toolName: 'build-workflow',
			toolCallId: REUSED_ID,
			state: 'resolved',
			output: { workflowId: 'wf-1' },
		};
		const waitingProposalPart = {
			type: 'tool-call',
			toolName: 'propose_automation',
			toolCallId: REUSED_ID,
			input: { workflowId: 'wf-1' },
			state: 'pending',
		};
		/** The history as the execution records give it: the earlier build and the waiting proposal. */
		const history = (): AgentPersistedMessageDto[] => [
			{ id: 'build:user', role: 'user', content: [{ type: 'text', text: 'Build it' }] },
			{ id: 'build:assistant', role: 'assistant', content: [{ ...buildPart }] },
			{ id: 'propose:user', role: 'user', content: [{ type: 'text', text: 'Propose it' }] },
			{
				id: 'propose:assistant',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'propose_automation',
						toolCallId: REUSED_ID,
						input: { workflowId: 'wf-1' },
						suspendPayload: proposalPayload,
					},
				],
			},
		];
		/** The checkpoint of the proposal turn: it holds the thread history and the waiting call. */
		const proposalCheckpoint = (pendingToolName: string | null = 'propose_automation') =>
			({
				status: 'suspended',
				pendingToolCalls: {
					[REUSED_ID]: {
						toolCallId: REUSED_ID,
						...(pendingToolName ? { toolName: pendingToolName } : {}),
						runId: 'run-propose',
						suspended: true,
						suspendPayload: proposalPayload,
					},
				},
				messageList: {
					messages: [
						{ id: 'sdk-build-user', role: 'user', content: [{ type: 'text', text: 'Build it' }] },
						{ id: 'sdk-build', role: 'assistant', content: [{ ...buildPart }] },
						{
							id: 'sdk-propose-user',
							role: 'user',
							content: [{ type: 'text', text: 'Propose it' }],
						},
						{ id: 'sdk-propose', role: 'assistant', content: [{ ...waitingProposalPart }] },
					],
				},
			}) as unknown as SerializableAgentState;

		it('re-arms the waiting call and leaves the earlier call of another tool as it was', () => {
			const result = withOpenSuspensions(history(), proposalCheckpoint(), {
				appendInactiveCheckpointMessages: false,
			});

			expect(result.messages.map((m) => m.id)).toEqual([
				'build:user',
				'build:assistant',
				'propose:user',
				'propose:assistant',
			]);
			expect(result.messages[1].content).toEqual([buildPart]);
			expect(result.messages[3].content).toEqual([
				{ ...waitingProposalPart, suspendPayload: proposalPayload },
			]);
			expect(result.openSuspensions).toEqual([
				{ toolCallId: REUSED_ID, runId: 'run-propose', suspendPayload: proposalPayload },
			]);
		});

		it('adds the waiting call from the checkpoint when the history has only the earlier call', () => {
			const withoutProposal = history().slice(0, 3);

			const result = withOpenSuspensions(withoutProposal, proposalCheckpoint(), {
				appendInactiveCheckpointMessages: false,
			});

			expect(result.messages.map((m) => m.id)).toEqual([
				'build:user',
				'build:assistant',
				'propose:user',
				'sdk-propose',
			]);
			expect(result.messages[1].content).toEqual([buildPart]);
			expect(result.messages[3].content).toEqual([waitingProposalPart]);
		});

		it('takes no settled copy of an earlier call of the same tool from the checkpoint', () => {
			const earlierRun = { ...buildPart, toolName: 'executions', output: { ran: true } };
			const waitingRun = { ...waitingProposalPart, toolName: 'executions' };
			const runHistory: AgentPersistedMessageDto[] = [
				{ id: 'first:assistant', role: 'assistant', content: [{ ...earlierRun }] },
				{
					id: 'second:assistant',
					role: 'assistant',
					content: [{ type: 'tool-call', toolName: 'executions', toolCallId: REUSED_ID }],
				},
			];
			const checkpoint = proposalCheckpoint('executions');
			checkpoint.messageList.messages = [
				{ id: 'sdk-first', role: 'assistant', content: [{ ...earlierRun }] },
				{ id: 'sdk-second', role: 'assistant', content: [{ ...waitingRun }] },
			] as unknown as SerializableAgentState['messageList']['messages'];

			const result = withOpenSuspensions(runHistory, checkpoint);

			expect(result.messages.map((m) => m.id)).toEqual(['first:assistant', 'second:assistant']);
			expect(result.messages[0].content).toEqual([earlierRun]);
			expect(result.messages[1].content).toEqual([waitingRun]);
		});

		it('matches by id alone when the checkpoint entry names no tool', () => {
			const result = withOpenSuspensions(history().slice(0, 3), proposalCheckpoint(null), {
				appendInactiveCheckpointMessages: false,
			});

			// Without a tool name, the settled build call counts as the open call, as before.
			expect(result.messages.map((m) => m.id)).toEqual([
				'build:user',
				'build:assistant',
				'propose:user',
			]);
			expect(result.messages[1].content).toEqual([buildPart]);
		});
	});
});
