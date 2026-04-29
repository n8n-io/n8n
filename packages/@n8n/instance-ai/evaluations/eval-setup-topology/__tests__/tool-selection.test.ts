import type { InstanceAiRichMessagesResponse } from '@n8n/api-types';

import type { CapturedEvent } from '../../types';
import { extractToolSelection } from '../tool-selection';

const missingFindings = [
	{
		severity: 'error',
		code: 'evals_tool_not_called',
		message: 'Instance AI did not call evals(action="propose")',
	},
	{
		severity: 'error',
		code: 'eval_setup_agent_not_called',
		message: 'Instance AI did not call eval-setup-with-agent after evals approval',
	},
] as const;

function capturedEvent(data: Record<string, unknown>, type = 'test-event'): CapturedEvent {
	return {
		timestamp: 1,
		type,
		data,
	};
}

function threadMessagesWithToolCalls(toolNames: string[]): InstanceAiRichMessagesResponse {
	return {
		threadId: 'thread-1',
		nextEventId: 1,
		messages: [
			{
				id: 'message-1',
				role: 'assistant',
				createdAt: '2026-04-29T00:00:00.000Z',
				content: '',
				reasoning: '',
				isStreaming: false,
				agentTree: {
					agentId: 'agent-1',
					role: 'builder',
					status: 'completed',
					textContent: '',
					reasoning: '',
					toolCalls: toolNames.map((toolName, index) => ({
						toolCallId: `tool-call-${index}`,
						toolName,
						args: {},
						isLoading: false,
					})),
					children: [],
					timeline: [],
				},
			},
		],
	};
}

describe('extractToolSelection', () => {
	it('does not treat arbitrary name and args in a non-tool event as a tool call', () => {
		const result = extractToolSelection({
			events: [capturedEvent({ payload: { name: 'evals', args: {} } }, 'test-event')],
		});

		expect(result).toEqual({
			evalsToolCalled: false,
			evalSetupAgentCalled: false,
			findings: missingFindings,
		});
	});

	it('does not count tool-result events as tool calls', () => {
		const result = extractToolSelection({
			events: [capturedEvent({ payload: { name: 'evals' } }, 'tool-result')],
		});

		expect(result).toEqual({
			evalsToolCalled: false,
			evalSetupAgentCalled: false,
			findings: missingFindings,
		});
	});

	it('does not count tool-error events as tool calls', () => {
		const result = extractToolSelection({
			events: [capturedEvent({ payload: { toolName: 'evals' } }, 'tool-error')],
		});

		expect(result).toEqual({
			evalsToolCalled: false,
			evalSetupAgentCalled: false,
			findings: missingFindings,
		});
	});

	it('does not promote nested toolName records in non-tool event results to tool calls', () => {
		const result = extractToolSelection({
			events: [capturedEvent({ payload: { result: { toolName: 'evals' } } }, 'test-event')],
		});

		expect(result).toEqual({
			evalsToolCalled: false,
			evalSetupAgentCalled: false,
			findings: missingFindings,
		});
	});

	it('does not promote nested toolCall records in non-tool events to tool calls', () => {
		const result = extractToolSelection({
			events: [capturedEvent({ payload: { toolCall: { toolName: 'evals' } } }, 'test-event')],
		});

		expect(result).toEqual({
			evalsToolCalled: false,
			evalSetupAgentCalled: false,
			findings: missingFindings,
		});
	});

	it('does not count available tools list as tool selection', () => {
		const result = extractToolSelection({
			events: [
				capturedEvent({
					payload: {
						tools: ['evals', 'eval-setup-with-agent'],
					},
				}),
			],
		});

		expect(result).toEqual({
			evalsToolCalled: false,
			evalSetupAgentCalled: false,
			findings: missingFindings,
		});
	});

	it('does not count prompt text mention as tool selection', () => {
		const result = extractToolSelection({
			events: [
				capturedEvent({
					payload: {
						text: 'please call evals and eval-setup-with-agent',
					},
				}),
			],
		});

		expect(result).toEqual({
			evalsToolCalled: false,
			evalSetupAgentCalled: false,
			findings: missingFindings,
		});
	});

	it('detects nested toolCall records in explicit tool-call events', () => {
		const result = extractToolSelection({
			events: [
				capturedEvent({ payload: { toolCall: { toolName: 'evals' } } }, 'tool-call'),
				capturedEvent(
					{ payload: { toolCall: { toolName: 'eval-setup-with-agent' } } },
					'tool-call',
				),
			],
		});

		expect(result).toEqual({
			evalsToolCalled: true,
			evalSetupAgentCalled: true,
			findings: [],
		});
	});

	it('detects explicit tool-call events using name', () => {
		const result = extractToolSelection({
			events: [
				capturedEvent({ payload: { name: 'evals', args: {} } }, 'tool-call'),
				capturedEvent({ payload: { name: 'eval-setup-with-agent', args: {} } }, 'tool-call'),
			],
		});

		expect(result).toEqual({
			evalsToolCalled: true,
			evalSetupAgentCalled: true,
			findings: [],
		});
	});

	it('detects event tool calls for evals and eval-setup-with-agent', () => {
		const result = extractToolSelection({
			events: [
				capturedEvent({ payload: { toolName: 'evals' } }, 'tool-call'),
				capturedEvent({ payload: { toolName: 'eval-setup-with-agent' } }, 'tool-call'),
			],
		});

		expect(result).toEqual({
			evalsToolCalled: true,
			evalSetupAgentCalled: true,
			findings: [],
		});
	});

	it('detects eval setup agent spawn role', () => {
		const result = extractToolSelection({
			events: [
				capturedEvent({ payload: { toolName: 'evals' } }, 'tool-call'),
				capturedEvent({ payload: { role: 'eval-setup' } }, 'agent-spawned'),
			],
		});

		expect(result.evalSetupAgentCalled).toBe(true);
		expect(result.findings).toEqual([]);
	});

	it('detects eval setup agent spawn kind', () => {
		const result = extractToolSelection({
			events: [
				capturedEvent({ payload: { toolName: 'evals' } }, 'tool-call'),
				capturedEvent({ payload: { kind: 'eval-setup' } }, 'agent-spawned'),
			],
		});

		expect(result.evalSetupAgentCalled).toBe(true);
		expect(result.findings).toEqual([]);
	});

	it('detects exact eval setup agent spawn name', () => {
		const result = extractToolSelection({
			events: [
				capturedEvent({ payload: { toolName: 'evals' } }, 'tool-call'),
				capturedEvent({ payload: { name: 'eval-setup' } }, 'agent-spawned'),
			],
		});

		expect(result.evalSetupAgentCalled).toBe(true);
		expect(result.findings).toEqual([]);
	});

	it('detects exact eval setup with agent spawn role', () => {
		const result = extractToolSelection({
			events: [
				capturedEvent({ payload: { toolName: 'evals' } }, 'tool-call'),
				capturedEvent({ payload: { role: 'eval-setup-with-agent' } }, 'agent-spawned'),
			],
		});

		expect(result.evalSetupAgentCalled).toBe(true);
		expect(result.findings).toEqual([]);
	});

	it('does not count inexact eval setup kind', () => {
		const result = extractToolSelection({
			events: [
				capturedEvent({ payload: { toolName: 'evals' } }, 'tool-call'),
				capturedEvent({ payload: { kind: 'eval-setup-disabled' } }, 'agent-spawned'),
			],
		});

		expect(result).toEqual({
			evalsToolCalled: true,
			evalSetupAgentCalled: false,
			findings: [
				{
					severity: 'error',
					code: 'eval_setup_agent_not_called',
					message: 'Instance AI did not call eval-setup-with-agent after evals approval',
				},
			],
		});
	});

	it('does not count inexact eval setup name', () => {
		const result = extractToolSelection({
			events: [
				capturedEvent({ payload: { toolName: 'evals' } }, 'tool-call'),
				capturedEvent({ payload: { name: 'previous-eval-setup-result' } }, 'agent-spawned'),
			],
		});

		expect(result).toEqual({
			evalsToolCalled: true,
			evalSetupAgentCalled: false,
			findings: [
				{
					severity: 'error',
					code: 'eval_setup_agent_not_called',
					message: 'Instance AI did not call eval-setup-with-agent after evals approval',
				},
			],
		});
	});

	it.each(['not-eval-setup', 'eval-setup-disabled', 'previous-eval-setup-result'])(
		'does not count inexact eval setup role %s',
		(role) => {
			const result = extractToolSelection({
				events: [
					capturedEvent({ payload: { toolName: 'evals' } }, 'tool-call'),
					capturedEvent({ payload: { role } }, 'agent-spawned'),
				],
			});

			expect(result).toEqual({
				evalsToolCalled: true,
				evalSetupAgentCalled: false,
				findings: [
					{
						severity: 'error',
						code: 'eval_setup_agent_not_called',
						message: 'Instance AI did not call eval-setup-with-agent after evals approval',
					},
				],
			});
		},
	);

	it('detects tool names from threadMessages when events are empty', () => {
		const result = extractToolSelection({
			events: [],
			threadMessages: threadMessagesWithToolCalls(['evals', 'eval-setup-with-agent']),
		});

		expect(result).toEqual({
			evalsToolCalled: true,
			evalSetupAgentCalled: true,
			findings: [],
		});
	});

	it('handles cyclic rich agent tree children without throwing and still detects tool calls', () => {
		const threadMessages = threadMessagesWithToolCalls(['evals', 'eval-setup-with-agent']);
		const agentTree = threadMessages.messages[0].agentTree;

		if (!agentTree) {
			throw new Error('Expected test thread message to include an agent tree');
		}

		agentTree.children.push(agentTree);

		expect(() =>
			extractToolSelection({
				events: [],
				threadMessages,
			}),
		).not.toThrow();

		const result = extractToolSelection({
			events: [],
			threadMessages,
		});

		expect(result).toEqual({
			evalsToolCalled: true,
			evalSetupAgentCalled: true,
			findings: [],
		});
	});

	it('returns both missing findings when neither source contains tool names', () => {
		const result = extractToolSelection({
			events: [capturedEvent({ payload: { toolName: 'patch-workflow' } }, 'tool-call')],
			threadMessages: threadMessagesWithToolCalls(['build-workflow']),
		});

		expect(result).toEqual({
			evalsToolCalled: false,
			evalSetupAgentCalled: false,
			findings: missingFindings,
		});
	});

	it('handles non-serializable cyclic event data without throwing', () => {
		const cyclicData: Record<string, unknown> = {
			payload: {
				toolName: 'evals',
			},
		};
		cyclicData.self = cyclicData;

		expect(() =>
			extractToolSelection({
				events: [capturedEvent(cyclicData, 'tool-call')],
				threadMessages: threadMessagesWithToolCalls(['eval-setup-with-agent']),
			}),
		).not.toThrow();

		const result = extractToolSelection({
			events: [capturedEvent(cyclicData, 'tool-call')],
			threadMessages: threadMessagesWithToolCalls(['eval-setup-with-agent']),
		});

		expect(result).toEqual({
			evalsToolCalled: true,
			evalSetupAgentCalled: true,
			findings: [],
		});
	});
});
