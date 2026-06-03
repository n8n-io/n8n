import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import { describe, expect, test } from 'vitest';
import { ref } from 'vue';
import { useTimelineGrouping } from '../useTimelineGrouping';

function makeToolCall(overrides: Partial<InstanceAiToolCallState>): InstanceAiToolCallState {
	return {
		toolCallId: 'tc-1',
		toolName: 'build-workflow',
		args: {},
		isLoading: false,
		...overrides,
	};
}

function makeAgentNode(overrides: Partial<InstanceAiAgentNode>): InstanceAiAgentNode {
	return {
		agentId: 'agent-1',
		role: 'orchestrator',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

describe('useTimelineGrouping', () => {
	test('surfaces artifacts from root tool calls', () => {
		const segments = useTimelineGrouping(
			ref(
				makeAgentNode({
					toolCalls: [
						makeToolCall({
							renderHint: 'builder',
							result: { workflowId: 'wf-1', workflowName: 'Built workflow' },
							completedAt: '2026-01-01T00:00:00Z',
						}),
					],
					timeline: [{ type: 'tool-call', toolCallId: 'tc-1', responseId: 'r-1' }],
				}),
			),
		).value;

		if (!segments || segments[0].kind !== 'response-group') {
			throw new Error('Expected a response group');
		}
		expect(segments[0].artifacts).toEqual([
			{
				type: 'workflow',
				resourceId: 'wf-1',
				name: 'Built workflow',
				completedAt: '2026-01-01T00:00:00Z',
			},
		]);
	});

	test('deduplicates artifacts across root tool calls', () => {
		const segments = useTimelineGrouping(
			ref(
				makeAgentNode({
					toolCalls: [
						makeToolCall({
							toolCallId: 'tc-1',
							renderHint: 'builder',
							result: { workflowId: 'wf-1', workflowName: 'Built workflow' },
							completedAt: '2026-01-01T00:00:00Z',
						}),
						makeToolCall({
							toolCallId: 'tc-2',
							renderHint: 'builder',
							result: { workflowId: 'wf-1', workflowName: 'Built workflow' },
							completedAt: '2026-01-01T00:00:01Z',
						}),
					],
					timeline: [
						{ type: 'tool-call', toolCallId: 'tc-1', responseId: 'r-1' },
						{ type: 'tool-call', toolCallId: 'tc-2', responseId: 'r-1' },
					],
				}),
			),
		).value;

		if (!segments || segments[0].kind !== 'response-group') {
			throw new Error('Expected a response group');
		}
		expect(segments[0].artifacts).toHaveLength(1);
		expect(segments[0].artifacts[0].resourceId).toBe('wf-1');
	});
});
