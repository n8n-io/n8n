import { describe, test, expect } from 'vitest';
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import { extractArtifacts } from '../agentTimeline.utils';

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
