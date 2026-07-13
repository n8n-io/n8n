import { describe, test, expect } from 'vitest';
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import {
	extractArtifacts,
	isStreamingTimelineEntry,
	isVisibleTimelineEntry,
} from '../agentTimeline.utils';

function makeToolCall(overrides: Partial<InstanceAiToolCallState>): InstanceAiToolCallState {
	return {
		toolCallId: 'tc-1',
		toolName: 'some-tool',
		args: {},
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

describe('extractArtifacts', () => {
	test('returns empty array for non-completed node', () => {
		expect(extractArtifacts(makeAgentNode({ status: 'active' }))).toEqual([]);
	});

	test('returns empty array for completed node with no tool calls and no targetResource', () => {
		expect(extractArtifacts(makeAgentNode())).toEqual([]);
	});

	test('returns workflow artifact from targetResource', () => {
		const node = makeAgentNode({
			targetResource: { id: 'wf-1', type: 'workflow', name: 'My Workflow' },
		});
		expect(extractArtifacts(node)).toEqual([
			{
				type: 'workflow',
				resourceId: 'wf-1',
				name: 'My Workflow',
				completedAt: undefined,
			},
		]);
	});

	test('returns data-table artifact from targetResource', () => {
		const node = makeAgentNode({
			targetResource: { id: 'dt-1', type: 'data-table', name: 'Feedback' },
		});
		expect(extractArtifacts(node)).toEqual([
			{
				type: 'data-table',
				resourceId: 'dt-1',
				name: 'Feedback',
				completedAt: undefined,
			},
		]);
	});

	test('returns agent artifact from targetResource', () => {
		const node = makeAgentNode({
			targetResource: { id: 'agent-1', type: 'agent', name: 'SEO Auditor', projectId: 'proj-1' },
		});

		expect(extractArtifacts(node)).toEqual([
			{
				type: 'agent',
				resourceId: 'agent-1',
				projectId: 'proj-1',
				name: 'SEO Auditor',
				completedAt: undefined,
			},
		]);
	});

	test('falls back to subtitle when targetResource has no name', () => {
		const node = makeAgentNode({
			subtitle: 'Sub Title',
			targetResource: { id: 'wf-1', type: 'workflow' },
		});
		expect(extractArtifacts(node)[0].name).toBe('Sub Title');
	});

	test('falls back to Untitled when targetResource has no name or subtitle', () => {
		const node = makeAgentNode({
			targetResource: { id: 'wf-1', type: 'workflow' },
		});
		expect(extractArtifacts(node)[0].name).toBe('Untitled');
	});

	test('ignores targetResource with non-artifact type', () => {
		const node = makeAgentNode({
			targetResource: { id: 'cred-1', type: 'credential', name: 'API Key' },
		});
		expect(extractArtifacts(node)).toEqual([]);
	});

	test('returns workflow artifact from build-workflow tool call', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'build-workflow',
					result: { workflowId: 'wf-2', workflowName: 'Built WF' },
					completedAt: '2026-01-01T00:00:00Z',
				}),
			],
		});
		const artifacts = extractArtifacts(node);
		expect(artifacts).toEqual([
			{
				type: 'workflow',
				resourceId: 'wf-2',
				name: 'Built WF',
				completedAt: '2026-01-01T00:00:00Z',
			},
		]);
	});

	test('returns workflow artifact from submit-workflow tool call', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'submit-workflow',
					result: { workflowId: 'wf-3', workflowName: 'Submitted WF' },
				}),
			],
		});
		expect(extractArtifacts(node)[0].resourceId).toBe('wf-3');
	});

	test('falls back to args.name when result.workflowName is missing', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'build-workflow',
					args: { name: 'Name From Args' },
					result: { workflowId: 'wf-4' },
				}),
			],
		});
		expect(extractArtifacts(node)[0].name).toBe('Name From Args');
	});

	test('falls back to Untitled when neither workflowName nor args.name is present', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'build-workflow',
					result: { workflowId: 'wf-5' },
				}),
			],
		});
		expect(extractArtifacts(node)[0].name).toBe('Untitled');
	});

	test('returns data-table artifact from result with table object', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'create-data-table',
					result: {
						table: { id: 'dt-2', name: 'Orders', projectId: 'proj-1' },
					},
				}),
			],
		});
		const artifacts = extractArtifacts(node);
		expect(artifacts).toEqual([
			expect.objectContaining({
				type: 'data-table',
				resourceId: 'dt-2',
				name: 'Orders',
				projectId: 'proj-1',
			}),
		]);
	});

	test('returns data-table artifact from top-level tableId', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'insert-data-table-rows',
					result: { tableId: 'dt-3', tableName: 'Customers' },
				}),
			],
		});
		expect(extractArtifacts(node)[0].resourceId).toBe('dt-3');
		expect(extractArtifacts(node)[0].name).toBe('Customers');
	});

	test('returns data-table artifact from top-level dataTableId', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'update-data-table-rows',
					result: { dataTableId: 'dt-4' },
				}),
			],
		});
		expect(extractArtifacts(node)[0].resourceId).toBe('dt-4');
	});

	test('deduplicates artifacts by resourceId', () => {
		const node = makeAgentNode({
			targetResource: { id: 'wf-1', type: 'workflow', name: 'WF From Target' },
			toolCalls: [
				makeToolCall({
					toolName: 'build-workflow',
					result: { workflowId: 'wf-1', workflowName: 'WF From ToolCall' },
				}),
			],
		});
		const artifacts = extractArtifacts(node);
		expect(artifacts).toHaveLength(1);
		expect(artifacts[0].name).toBe('WF From Target');
	});

	test('recurses into children and deduplicates', () => {
		const child = makeAgentNode({
			agentId: 'child-1',
			toolCalls: [
				makeToolCall({
					toolName: 'build-workflow',
					result: { workflowId: 'wf-child', workflowName: 'Child WF' },
				}),
			],
		});
		const parent = makeAgentNode({
			children: [child],
			toolCalls: [
				makeToolCall({
					toolName: 'build-workflow',
					result: { workflowId: 'wf-parent', workflowName: 'Parent WF' },
				}),
			],
		});
		const artifacts = extractArtifacts(parent);
		expect(artifacts).toHaveLength(2);
		expect(artifacts.map((a) => a.resourceId)).toContain('wf-parent');
		expect(artifacts.map((a) => a.resourceId)).toContain('wf-child');
	});

	test('skips tool calls with no result', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'build-workflow',
					result: undefined,
				}),
			],
		});
		expect(extractArtifacts(node)).toEqual([]);
	});
});

describe('isVisibleTimelineEntry', () => {
	const toolCallEntry = { type: 'tool-call' as const, toolCallId: 'tc-1' };

	function visibilityOf(tc: InstanceAiToolCallState): boolean {
		return isVisibleTimelineEntry(toolCallEntry, { [tc.toolCallId]: tc }, {});
	}

	test('text entries are always visible', () => {
		expect(isVisibleTimelineEntry({ type: 'text', content: 'hi' }, {}, {})).toBe(true);
	});

	test('reasoning entries are always visible', () => {
		expect(isVisibleTimelineEntry({ type: 'reasoning', content: 'hmm' }, {}, {})).toBe(true);
	});

	test('tool-call entries without a matching tool call are hidden', () => {
		expect(isVisibleTimelineEntry(toolCallEntry, {}, {})).toBe(false);
	});

	test('internal bookkeeping tools are hidden', () => {
		expect(visibilityOf(makeToolCall({ toolName: 'updateWorkingMemory' }))).toBe(false);
	});

	test('builder/data-table/eval-setup hints are hidden (represented by artifact cards)', () => {
		expect(visibilityOf(makeToolCall({ renderHint: 'builder' }))).toBe(false);
		expect(visibilityOf(makeToolCall({ renderHint: 'data-table' }))).toBe(false);
		expect(visibilityOf(makeToolCall({ renderHint: 'eval-setup' }))).toBe(false);
	});

	test('builder hint stays hidden even with a plan-review confirmation (template order)', () => {
		expect(
			visibilityOf(
				makeToolCall({
					renderHint: 'builder',
					confirmation: {
						requestId: 'r1',
						severity: 'info',
						message: 'Review plan',
						inputType: 'plan-review',
					},
				}),
			),
		).toBe(false);
	});

	test('plan-review confirmations render a panel', () => {
		expect(
			visibilityOf(
				makeToolCall({
					renderHint: 'planner',
					confirmation: {
						requestId: 'r1',
						severity: 'info',
						message: 'Review plan',
						inputType: 'plan-review',
					},
				}),
			),
		).toBe(true);
	});

	test('planner hint without a plan review renders nothing', () => {
		expect(visibilityOf(makeToolCall({ renderHint: 'planner' }))).toBe(false);
	});

	test('question forms are suppressed while pending, visible once answered', () => {
		const questions = (isLoading: boolean) =>
			makeToolCall({
				isLoading,
				confirmation: {
					requestId: 'r1',
					severity: 'info',
					message: 'Answer questions',
					inputType: 'questions',
				},
			});
		expect(visibilityOf(questions(true))).toBe(false);
		expect(visibilityOf(questions(false))).toBe(true);
	});

	test('tasks, default, and generic tool calls are visible', () => {
		expect(visibilityOf(makeToolCall({ renderHint: 'tasks' }))).toBe(true);
		expect(visibilityOf(makeToolCall({ renderHint: 'default' }))).toBe(true);
		expect(visibilityOf(makeToolCall({ renderHint: 'skill' }))).toBe(true);
		expect(visibilityOf(makeToolCall({}))).toBe(true);
	});

	test('child entries are visible unless the child is a hoisted active builder', () => {
		const entry = { type: 'child' as const, agentId: 'sub-1' };
		const completedBuilder = makeAgentNode({
			agentId: 'sub-1',
			role: 'workflow-builder',
			status: 'completed',
		});
		const activeBuilder = makeAgentNode({
			agentId: 'sub-1',
			role: 'workflow-builder',
			status: 'active',
		});

		expect(isVisibleTimelineEntry(entry, {}, { 'sub-1': completedBuilder })).toBe(true);
		expect(isVisibleTimelineEntry(entry, {}, { 'sub-1': activeBuilder })).toBe(false);
		expect(isVisibleTimelineEntry(entry, {}, {})).toBe(false);
	});
});

describe('isStreamingTimelineEntry', () => {
	test('only the tail entry of an active agent is streaming', () => {
		const settled = { type: 'text' as const, content: 'settled before the tool call' };
		const toolCall = { type: 'tool-call' as const, toolCallId: 'tc-1' };
		const tail = { type: 'text' as const, content: 'still receiving deltas' };
		const node = makeAgentNode({ status: 'active', timeline: [settled, toolCall, tail] });

		expect(isStreamingTimelineEntry(node, tail)).toBe(true);
		expect(isStreamingTimelineEntry(node, settled)).toBe(false);
	});

	test('text settles once a tool call follows it, even while the agent stays active (HITL pause)', () => {
		const text = { type: 'text' as const, content: 'please review the plan' };
		const pendingTool = { type: 'tool-call' as const, toolCallId: 'tc-plan' };
		const node = makeAgentNode({ status: 'active', timeline: [text, pendingTool] });

		expect(isStreamingTimelineEntry(node, text)).toBe(false);
	});

	test('nothing streams on a settled agent', () => {
		const tail = { type: 'text' as const, content: 'final answer' };
		for (const status of ['completed', 'error', 'cancelled'] as const) {
			const node = makeAgentNode({ status, timeline: [tail] });
			expect(isStreamingTimelineEntry(node, tail)).toBe(false);
		}
	});

	test('an equal-by-value entry from another timeline does not stream (identity check)', () => {
		const tail = { type: 'text' as const, content: 'hello' };
		const node = makeAgentNode({ status: 'active', timeline: [tail] });

		expect(isStreamingTimelineEntry(node, { ...tail })).toBe(false);
	});
});
