import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import { ref } from 'vue';
import { describe, expect, test } from 'vitest';
import { useTimelineGrouping } from '../useTimelineGrouping';

function makeToolCall(overrides: Partial<InstanceAiToolCallState>): InstanceAiToolCallState {
	return {
		toolCallId: 'tc-build',
		toolName: 'workflows',
		args: { action: 'create' },
		isLoading: false,
		...overrides,
	};
}

function makeAgentNode(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
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
	test('includes artifacts from direct workflow mutation tool calls', () => {
		const agentNode = makeAgentNode({
			toolCalls: [
				makeToolCall({
					result: { workflowId: 'wf-1', workflowName: 'Built WF' },
					completedAt: '2026-01-01T00:00:00Z',
				}),
			],
			timeline: [{ type: 'tool-call', toolCallId: 'tc-build', responseId: 'response-1' }],
		});

		const segments = useTimelineGrouping(ref(agentNode)).value;

		expect(segments).toEqual([
			expect.objectContaining({
				kind: 'response-group',
				responseId: 'response-1',
				toolCallCount: 1,
				childCount: 0,
				artifacts: [
					{
						type: 'workflow',
						resourceId: 'wf-1',
						name: 'Built WF',
						completedAt: '2026-01-01T00:00:00Z',
					},
				],
			}),
		]);
	});

	test('keeps artifact-only groups for legacy builder tool calls', () => {
		const agentNode = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'build-workflow-with-agent',
					args: {},
					renderHint: 'builder',
					result: { workflowId: 'wf-2', workflowName: 'Hidden Builder WF' },
				}),
			],
			timeline: [{ type: 'tool-call', toolCallId: 'tc-build', responseId: 'response-1' }],
		});

		const segments = useTimelineGrouping(ref(agentNode)).value;

		expect(segments).toHaveLength(1);
		expect(segments?.[0]).toEqual(
			expect.objectContaining({
				kind: 'response-group',
				toolCallCount: 0,
				artifacts: [
					expect.objectContaining({
						type: 'workflow',
						resourceId: 'wf-2',
						name: 'Hidden Builder WF',
					}),
				],
			}),
		);
	});

	test('counts direct workflow mutation calls as generic even with stale builder render hint', () => {
		const agentNode = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'workflows',
					args: { action: 'create' },
					renderHint: 'builder',
					result: { workflowId: 'wf-3', workflowName: 'Visible workflow' },
				}),
			],
			timeline: [{ type: 'tool-call', toolCallId: 'tc-build', responseId: 'response-1' }],
		});

		const segments = useTimelineGrouping(ref(agentNode)).value;

		expect(segments?.[0]).toEqual(
			expect.objectContaining({
				kind: 'response-group',
				toolCallCount: 1,
				artifacts: [
					expect.objectContaining({
						type: 'workflow',
						resourceId: 'wf-3',
						name: 'Visible workflow',
					}),
				],
			}),
		);
	});

	test('keeps answered question-only groups visible', () => {
		const agentNode = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-question',
					toolName: 'ask-user',
					args: {},
					confirmation: {
						requestId: 'req-question',
						severity: 'info',
						message: 'Pick one',
						inputType: 'questions',
					},
				}),
			],
			timeline: [{ type: 'tool-call', toolCallId: 'tc-question', responseId: 'response-1' }],
		});

		const segments = useTimelineGrouping(ref(agentNode)).value;

		expect(segments).toEqual([
			expect.objectContaining({
				kind: 'response-group',
				toolCallCount: 0,
				questionCount: 1,
			}),
		]);
	});

	test('drops skill-loading-only groups from the collapsed timeline', () => {
		const agentNode = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-skill',
					toolName: 'load_skill',
					args: { name: 'workflow-builder' },
					renderHint: 'skill',
				}),
			],
			timeline: [{ type: 'tool-call', toolCallId: 'tc-skill', responseId: 'response-1' }],
		});

		expect(useTimelineGrouping(ref(agentNode)).value).toBeNull();
	});

	test('does not count skill-loading calls when grouped with visible work', () => {
		const agentNode = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-skill',
					toolName: 'load_skill',
					args: { name: 'workflow-builder' },
					renderHint: 'skill',
				}),
				makeToolCall({
					toolCallId: 'tc-workflow',
					toolName: 'workflows',
					args: { action: 'create' },
					result: { workflowId: 'wf-4', workflowName: 'Visible workflow' },
				}),
			],
			timeline: [
				{ type: 'tool-call', toolCallId: 'tc-skill', responseId: 'response-1' },
				{ type: 'tool-call', toolCallId: 'tc-workflow', responseId: 'response-1' },
			],
		});

		expect(useTimelineGrouping(ref(agentNode)).value?.[0]).toEqual(
			expect.objectContaining({
				kind: 'response-group',
				toolCallCount: 1,
				artifacts: [
					expect.objectContaining({
						type: 'workflow',
						resourceId: 'wf-4',
						name: 'Visible workflow',
					}),
				],
			}),
		);
	});

	test('keeps plan-review-only groups visible', () => {
		const agentNode = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-plan',
					toolName: 'submit-plan',
					args: {},
					renderHint: 'planner',
					confirmation: {
						requestId: 'req-plan',
						severity: 'info',
						message: 'Review plan',
						inputType: 'plan-review',
					},
				}),
			],
			timeline: [{ type: 'tool-call', toolCallId: 'tc-plan', responseId: 'response-1' }],
		});

		const segments = useTimelineGrouping(ref(agentNode)).value;

		expect(segments).toEqual([
			expect.objectContaining({
				kind: 'response-group',
				toolCallCount: 0,
				questionCount: 1,
			}),
		]);
	});

	test('renders intermediate text between tool calls as visible timeline text', () => {
		const agentNode = makeAgentNode({
			toolCalls: [
				makeToolCall({ toolCallId: 'tc-build', toolName: 'workflows' }),
				makeToolCall({ toolCallId: 'tc-verify', toolName: 'verify-built-workflow' }),
			],
			timeline: [
				{ type: 'tool-call', toolCallId: 'tc-build', responseId: 'response-1' },
				{ type: 'text', content: 'Built the draft. Testing it now.', responseId: 'response-1' },
				{ type: 'tool-call', toolCallId: 'tc-verify', responseId: 'response-1' },
				{ type: 'text', content: 'Verification passed with mocks.', responseId: 'response-1' },
			],
		});

		const segments = useTimelineGrouping(ref(agentNode)).value;

		expect(segments).toEqual([
			expect.objectContaining({
				kind: 'response-group',
				entries: [{ type: 'tool-call', toolCallId: 'tc-build', responseId: 'response-1' }],
			}),
			{ kind: 'trailing-text', content: 'Built the draft. Testing it now.' },
			expect.objectContaining({
				kind: 'response-group',
				entries: [{ type: 'tool-call', toolCallId: 'tc-verify', responseId: 'response-1' }],
			}),
			{ kind: 'trailing-text', content: 'Verification passed with mocks.' },
		]);
	});
});
