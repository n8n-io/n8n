import type { InstanceAiRichMessagesResponse } from '@n8n/api-types';

import type { CapturedEvent } from '../../types';
import { extractToolSelection } from '../tool-selection';

function capturedEvent(data: Record<string, unknown>, type = 'tool-call'): CapturedEvent {
	return { timestamp: 1, type, data };
}

function richMessagesWithToolCalls(toolNames: string[]): InstanceAiRichMessagesResponse {
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
					role: 'orchestrator',
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
	it('returns a finding when no tool call or agent spawn is observed', () => {
		const result = extractToolSelection({ events: [] });

		expect(result).toEqual({
			evalDataToolCalled: false,
			findings: [expect.objectContaining({ code: 'eval_data_tool_not_called', severity: 'error' })],
		});
	});

	it('detects tool call from a tool-call event', () => {
		const result = extractToolSelection({
			events: [capturedEvent({ payload: { toolName: 'eval-data' } })],
		});

		expect(result.evalDataToolCalled).toBe(true);
		expect(result.findings).toEqual([]);
	});

	it('detects an eval-data agent spawn event when no tool-call event is present', () => {
		const result = extractToolSelection({
			events: [
				capturedEvent(
					{ runId: 'r1', agentId: 'a1', payload: { role: 'eval-data' } },
					'agent-spawned',
				),
			],
		});

		expect(result.evalDataToolCalled).toBe(true);
	});

	it('detects tool call via thread messages when SSE missed it', () => {
		const result = extractToolSelection({
			events: [],
			threadMessages: richMessagesWithToolCalls(['eval-data']),
		});

		expect(result.evalDataToolCalled).toBe(true);
	});

	it('does not match arbitrary string occurrences in non-tool events', () => {
		const result = extractToolSelection({
			events: [capturedEvent({ note: 'eval-data was discussed' }, 'message')],
		});

		expect(result.evalDataToolCalled).toBe(false);
	});

	it('walks rich-message child agent trees', () => {
		const messages: InstanceAiRichMessagesResponse = {
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
						agentId: 'parent',
						role: 'orchestrator',
						status: 'completed',
						textContent: '',
						reasoning: '',
						toolCalls: [],
						timeline: [],
						children: [
							{
								agentId: 'child',
								role: 'eval-data',
								status: 'completed',
								textContent: '',
								reasoning: '',
								toolCalls: [
									{ toolCallId: 'tc-1', toolName: 'eval-data', args: {}, isLoading: false },
								],
								timeline: [],
								children: [],
							},
						],
					},
				},
			],
		};

		const result = extractToolSelection({ events: [], threadMessages: messages });
		expect(result.evalDataToolCalled).toBe(true);
	});
});
