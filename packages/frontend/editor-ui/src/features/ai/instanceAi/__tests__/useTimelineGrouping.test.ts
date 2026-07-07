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

	test('groups reasoning with its step tool calls and counts it', () => {
		const segments = useTimelineGrouping(
			ref(
				makeAgentNode({
					toolCalls: [makeToolCall({ toolCallId: 'tc-1', toolName: 'search' })],
					timeline: [
						{ type: 'reasoning', content: 'plan the search', responseId: 'r-1' },
						{ type: 'tool-call', toolCallId: 'tc-1', responseId: 'r-1' },
						{ type: 'text', content: 'the answer', responseId: 'r-2' },
					],
				}),
			),
		).value;

		if (!segments) throw new Error('Expected segments');
		expect(segments).toHaveLength(2);
		const group = segments[0];
		if (group.kind !== 'response-group') throw new Error('Expected a response group');
		expect(group.reasoningCount).toBe(1);
		expect(group.entries).toEqual([
			{ type: 'reasoning', content: 'plan the search', responseId: 'r-1' },
			{ type: 'tool-call', toolCallId: 'tc-1', responseId: 'r-1' },
		]);
		expect(segments[1]).toEqual({ kind: 'trailing-text', content: 'the answer' });
	});

	test('keeps reasoning-only groups', () => {
		const segments = useTimelineGrouping(
			ref(
				makeAgentNode({
					timeline: [
						{ type: 'reasoning', content: 'final thoughts', responseId: 'r-1' },
						{ type: 'text', content: 'the answer', responseId: 'r-1' },
					],
				}),
			),
		).value;

		if (!segments) throw new Error('Expected segments');
		expect(segments).toHaveLength(2);
		const group = segments[0];
		if (group.kind !== 'response-group') throw new Error('Expected a response group');
		expect(group.reasoningCount).toBe(1);
		expect(group.entries).toEqual([
			{ type: 'reasoning', content: 'final thoughts', responseId: 'r-1' },
		]);
		expect(segments[1]).toEqual({ kind: 'trailing-text', content: 'the answer' });
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

	test('reasoning joins a response group with matching responseId', () => {
		const segments = useTimelineGrouping(
			ref(
				makeAgentNode({
					timeline: [
						{ type: 'reasoning', content: 'Let me check', responseId: 'r-1' },
						{ type: 'tool-call', toolCallId: 'tc-1', responseId: 'r-1' },
					],
					toolCalls: [makeToolCall({ toolCallId: 'tc-1' })],
				}),
			),
		).value;

		if (!segments || segments[0].kind !== 'response-group') {
			throw new Error('Expected a response group');
		}
		expect(segments[0].reasoningCount).toBe(1);
		expect(segments[0].entries).toHaveLength(2);
		expect(segments[0].entries[0]).toEqual({
			type: 'reasoning',
			content: 'Let me check',
			responseId: 'r-1',
		});
	});

	test('reasoning never becomes trailing-text', () => {
		const segments = useTimelineGrouping(
			ref(
				makeAgentNode({
					timeline: [
						{ type: 'tool-call', toolCallId: 'tc-1', responseId: 'r-1' },
						{ type: 'reasoning', content: 'After tool', responseId: 'r-2' },
						{ type: 'text', content: 'Final answer', responseId: 'r-3' },
					],
					toolCalls: [makeToolCall({ toolCallId: 'tc-1' })],
					textContent: 'Final answer',
				}),
			),
		).value;

		expect(segments).not.toBeNull();
		expect(
			segments!.some((seg) => seg.kind === 'trailing-text' && seg.content === 'After tool'),
		).toBe(false);
		expect(
			segments!.some((seg) => seg.kind === 'trailing-text' && seg.content === 'Final answer'),
		).toBe(true);
	});

	test('reasoning is not popped by trailing-text extraction', () => {
		const segments = useTimelineGrouping(
			ref(
				makeAgentNode({
					timeline: [
						{ type: 'tool-call', toolCallId: 'tc-1', responseId: 'r-1' },
						{ type: 'reasoning', content: 'Still inside group', responseId: 'r-1' },
					],
					toolCalls: [makeToolCall({ toolCallId: 'tc-1' })],
				}),
			),
		).value;

		if (!segments || segments[0].kind !== 'response-group') {
			throw new Error('Expected a response group');
		}
		expect(segments[0].entries.some((entry) => entry.type === 'reasoning')).toBe(true);
		expect(segments[0].reasoningCount).toBe(1);
	});

	test('reasoning-only groups are kept', () => {
		const segments = useTimelineGrouping(
			ref(
				makeAgentNode({
					timeline: [{ type: 'reasoning', content: 'Only thinking', responseId: 'r-1' }],
				}),
			),
		).value;

		expect(segments).not.toBeNull();
		expect(segments).toHaveLength(1);
		if (!segments || segments[0].kind !== 'response-group') {
			throw new Error('Expected a response group');
		}
		expect(segments[0].reasoningCount).toBe(1);
	});
});
