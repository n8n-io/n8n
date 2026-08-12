import { describe, test, expect } from 'vitest';
import type {
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import {
	buildTimelineBlocks,
	extractArtifacts,
	isStreamingTimelineEntry,
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

describe('buildTimelineBlocks', () => {
	const reasoning = (responseId?: string): InstanceAiTimelineEntry => ({
		type: 'reasoning',
		content: 'thinking...',
		responseId,
	});
	const text = (content: string, responseId?: string): InstanceAiTimelineEntry => ({
		type: 'text',
		content,
		responseId,
	});
	const toolEntry = (toolCallId: string, responseId?: string): InstanceAiTimelineEntry => ({
		type: 'tool-call',
		toolCallId,
		responseId,
	});

	function blocksOf(
		entries: InstanceAiTimelineEntry[],
		toolCalls: InstanceAiToolCallState[] = [],
		status: InstanceAiAgentNode['status'] = 'completed',
		children: InstanceAiAgentNode[] = [],
	) {
		const toolCallsById = Object.fromEntries(toolCalls.map((tc) => [tc.toolCallId, tc]));
		const childrenById = Object.fromEntries(children.map((c) => [c.agentId, c]));
		return buildTimelineBlocks(entries, toolCallsById, childrenById, status);
	}

	test('merges consecutive reasoning and generic tool calls into one thinking block', () => {
		const blocks = blocksOf(
			[reasoning('r1'), toolEntry('tc-1', 'r1'), toolEntry('tc-2', 'r1'), reasoning('r2')],
			[makeToolCall({ toolCallId: 'tc-1' }), makeToolCall({ toolCallId: 'tc-2' })],
		);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].type).toBe('thinking');
		expect(blocks[0].type === 'thinking' && blocks[0].entries).toHaveLength(4);
	});

	test('text followed by same-response trace content joins the thinking block', () => {
		const blocks = blocksOf(
			[reasoning('r1'), text('Let me check the schema.', 'r1'), toolEntry('tc-1', 'r1')],
			[makeToolCall({ toolCallId: 'tc-1' })],
		);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].type === 'thinking' && blocks[0].entries).toHaveLength(3);
	});

	test('trailing text of a response is user-facing and splits blocks', () => {
		const blocks = blocksOf(
			[reasoning('r1'), toolEntry('tc-1', 'r1'), text('Here is your answer.', 'r1')],
			[makeToolCall({ toolCallId: 'tc-1' })],
		);

		expect(blocks.map((b) => b.type)).toEqual(['thinking', 'text']);
	});

	test('short streaming tail text after same-response trace stays inside the block', () => {
		const blocks = blocksOf(
			[reasoning('r1'), text('Now building the workflow.', 'r1')],
			[],
			'active',
		);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].type === 'thinking' && blocks[0].entries).toHaveLength(2);
	});

	test('answer-length streaming tail text promotes out of the block', () => {
		const longText = 'This is the final answer. '.repeat(10); // > 200 chars
		const blocks = blocksOf([reasoning('r1'), text(longText, 'r1')], [], 'active');

		expect(blocks.map((b) => b.type)).toEqual(['thinking', 'text']);
	});

	test('streaming tail text without same-response trace renders outside', () => {
		const blocks = blocksOf([reasoning('r1'), text('Quick answer.', 'r2')], [], 'active');

		expect(blocks.map((b) => b.type)).toEqual(['thinking', 'text']);
	});

	test('short trailing text promotes out once the run settles', () => {
		const entries = [reasoning('r1'), text('Done, workflow created.', 'r1')];

		const streaming = blocksOf(entries, [], 'active');
		expect(streaming).toHaveLength(1);

		const settled = blocksOf(entries, [], 'completed');
		expect(settled.map((b) => b.type)).toEqual(['thinking', 'text']);
	});

	test('text without responseId is always user-facing (old snapshots)', () => {
		const blocks = blocksOf(
			[reasoning(), text('narration'), toolEntry('tc-1')],
			[makeToolCall({ toolCallId: 'tc-1' })],
		);

		expect(blocks.map((b) => b.type)).toEqual(['thinking', 'text', 'thinking']);
	});

	test('hidden tool calls are dropped without splitting a thinking run', () => {
		const blocks = blocksOf(
			[
				toolEntry('tc-1', 'r1'),
				toolEntry('tc-hidden', 'r1'),
				toolEntry('tc-builder', 'r1'),
				toolEntry('tc-2', 'r1'),
			],
			[
				makeToolCall({ toolCallId: 'tc-1' }),
				makeToolCall({ toolCallId: 'tc-hidden', toolName: 'updateWorkingMemory' }),
				makeToolCall({
					toolCallId: 'tc-builder',
					toolName: 'build-workflow-with-agent',
					renderHint: 'builder',
				}),
				makeToolCall({ toolCallId: 'tc-2' }),
			],
		);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].type === 'thinking' && blocks[0].entries).toHaveLength(2);
	});

	test('in-thread build-workflow renders as a trace row; agent-delegated builds stay hidden', () => {
		const blocks = blocksOf(
			[toolEntry('tc-build', 'r1'), toolEntry('tc-delegated', 'r1')],
			[
				makeToolCall({ toolCallId: 'tc-build', toolName: 'build-workflow', renderHint: 'builder' }),
				makeToolCall({
					toolCallId: 'tc-delegated',
					toolName: 'build-workflow-with-agent',
					renderHint: 'builder',
				}),
			],
		);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].type === 'thinking' && blocks[0].entries).toEqual([
			expect.objectContaining({ toolCallId: 'tc-build' }),
		]);
	});

	test('hides build-agent trace when a builder child exists in the same response', () => {
		const childEntry = (agentId: string, responseId?: string): InstanceAiTimelineEntry => ({
			type: 'child',
			agentId,
			responseId,
		});
		const builderChild = makeAgentNode({
			agentId: 'builder-1',
			role: 'agent-builder',
			kind: 'agent-builder',
		});

		const blocks = blocksOf(
			[toolEntry('tc-build-agent', 'r1'), childEntry('builder-1', 'r1')],
			[
				makeToolCall({
					toolCallId: 'tc-build-agent',
					toolName: 'build-agent',
				}),
			],
			'completed',
			[builderChild],
		);

		expect(blocks).toEqual([{ type: 'child', key: 'child-1', child: builderChild }]);
	});

	test('keeps build-agent trace when no builder child exists', () => {
		const blocks = blocksOf(
			[toolEntry('tc-build-agent', 'r1')],
			[
				makeToolCall({
					toolCallId: 'tc-build-agent',
					toolName: 'build-agent',
				}),
			],
		);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].type === 'thinking' && blocks[0].entries).toEqual([
			expect.objectContaining({ toolCallId: 'tc-build-agent' }),
		]);
	});

	test('does not hide unrelated trace tools when child is not a builder', () => {
		const childEntry = (agentId: string, responseId?: string): InstanceAiTimelineEntry => ({
			type: 'child',
			agentId,
			responseId,
		});
		const nonBuilderChild = makeAgentNode({ agentId: 'sub-1', role: 'researcher' });

		const blocks = blocksOf(
			[toolEntry('tc-build-agent', 'r1'), childEntry('sub-1', 'r1')],
			[
				makeToolCall({
					toolCallId: 'tc-build-agent',
					toolName: 'build-agent',
				}),
			],
			'completed',
			[nonBuilderChild],
		);

		expect(blocks).toHaveLength(2);
		expect(blocks[0].type === 'thinking' && blocks[0].entries).toEqual([
			expect.objectContaining({ toolCallId: 'tc-build-agent' }),
		]);
		expect(blocks[1]).toEqual({ type: 'child', key: 'child-1', child: nonBuilderChild });
	});

	test('user-facing tool calls split thinking runs', () => {
		const answeredQuestions = makeToolCall({
			toolCallId: 'tc-q',
			isLoading: false,
			confirmation: { requestId: 'r1', severity: 'info', message: 'q', inputType: 'questions' },
		});
		const blocks = blocksOf(
			[toolEntry('tc-1', 'r1'), toolEntry('tc-q', 'r1'), toolEntry('tc-2', 'r2')],
			[
				makeToolCall({ toolCallId: 'tc-1' }),
				answeredQuestions,
				makeToolCall({ toolCallId: 'tc-2' }),
			],
		);

		expect(blocks.map((b) => b.type)).toEqual(['thinking', 'questions', 'thinking']);
	});

	test('pending question forms are dropped without splitting', () => {
		const pendingQuestions = makeToolCall({
			toolCallId: 'tc-q',
			isLoading: true,
			confirmation: { requestId: 'r1', severity: 'info', message: 'q', inputType: 'questions' },
		});
		const blocks = blocksOf(
			[toolEntry('tc-1', 'r1'), toolEntry('tc-q', 'r1'), toolEntry('tc-2', 'r1')],
			[
				makeToolCall({ toolCallId: 'tc-1' }),
				pendingQuestions,
				makeToolCall({ toolCallId: 'tc-2' }),
			],
		);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].type === 'thinking' && blocks[0].entries).toHaveLength(2);
	});

	test('child agents split thinking runs; hoisted active builders are dropped', () => {
		const completedChild = makeAgentNode({ agentId: 'sub-1' });
		const activeBuilder = makeAgentNode({
			agentId: 'sub-2',
			role: 'workflow-builder',
			status: 'active',
		});
		const childEntry = (agentId: string): InstanceAiTimelineEntry => ({ type: 'child', agentId });

		const split = blocksOf(
			[reasoning('r1'), childEntry('sub-1'), reasoning('r2')],
			[],
			'completed',
			[completedChild],
		);
		expect(split.map((b) => b.type)).toEqual(['thinking', 'child', 'thinking']);

		const merged = blocksOf(
			[reasoning('r1'), childEntry('sub-2'), reasoning('r2')],
			[],
			'completed',
			[activeBuilder],
		);
		expect(merged).toHaveLength(1);
	});

	test('flags only the trailing thinking block as active while the agent streams', () => {
		const streaming = blocksOf(
			[reasoning('r1'), text('Answer.', 'r1'), reasoning('r2')],
			[],
			'active',
		);
		expect(streaming.map((b) => b.type)).toEqual(['thinking', 'text', 'thinking']);
		expect(streaming[0].type === 'thinking' && streaming[0].active).toBe(false);
		expect(streaming[2].type === 'thinking' && streaming[2].active).toBe(true);
	});

	test('the trailing thinking block stays active while tentative tail text streams', () => {
		// Tail text may still fold back into the block (if same-response trace
		// content follows), so the block must not settle to "Thought for Xs" yet.
		const tailText = blocksOf([reasoning('r1'), text('Answer...', 'r2')], [], 'active');
		expect(tailText.map((b) => b.type)).toEqual(['thinking', 'text']);
		expect(tailText[0].type === 'thinking' && tailText[0].active).toBe(true);
	});

	test('trailing text past the narration cap settles the thinking block', () => {
		// Answer-length text is a committed answer — a block still "thinking"
		// behind a streaming answer reads as lag.
		const longAnswer = 'A'.repeat(240) + '.';
		const blocks = blocksOf([reasoning('r1'), text(longAnswer, 'r2')], [], 'active');
		expect(blocks.map((b) => b.type)).toEqual(['thinking', 'text']);
		expect(blocks[0].type === 'thinking' && blocks[0].active).toBe(false);
	});

	test('real user-facing interruptions settle the thinking block immediately', () => {
		const answeredQuestions = makeToolCall({
			toolCallId: 'tc-q',
			isLoading: false,
			confirmation: { requestId: 'r1', severity: 'info', message: 'q', inputType: 'questions' },
		});
		const blocks = blocksOf(
			[reasoning('r1'), toolEntry('tc-q', 'r1')],
			[answeredQuestions],
			'active',
		);

		expect(blocks.map((b) => b.type)).toEqual(['thinking', 'questions']);
		expect(blocks[0].type === 'thinking' && blocks[0].active).toBe(false);
	});

	test('no block is active once the agent has settled', () => {
		const completed = blocksOf([reasoning('r1')], [], 'completed');
		expect(completed[0].type === 'thinking' && completed[0].active).toBe(false);
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
