import { describe, test, expect } from 'vitest';
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import {
	getLatestBuildResult,
	getLatestExecutionId,
	getLatestDataTableResult,
	getLatestDeletedDataTableId,
	getExecutionResultsByWorkflow,
} from '../canvasPreview.utils';

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

describe('getLatestBuildResult', () => {
	test('returns undefined for node with no tool calls', () => {
		expect(getLatestBuildResult(makeAgentNode())).toBeUndefined();
	});

	test('returns undefined for non-build tool calls', () => {
		const node = makeAgentNode({
			toolCalls: [makeToolCall({ toolName: 'search-nodes', result: { nodes: [] } })],
		});
		expect(getLatestBuildResult(node)).toBeUndefined();
	});

	test('returns undefined for loading build-workflow call', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'build-workflow',
					isLoading: true,
					result: undefined,
				}),
			],
		});
		expect(getLatestBuildResult(node)).toBeUndefined();
	});

	test('returns undefined for failed build-workflow call', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'build-workflow',
					result: { success: false, errors: ['compile error'] },
				}),
			],
		});
		expect(getLatestBuildResult(node)).toBeUndefined();
	});

	test('returns workflowId and toolCallId from successful build-workflow call', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-build-1',
					toolName: 'build-workflow',
					result: { success: true, workflowId: 'wf-123' },
				}),
			],
		});
		expect(getLatestBuildResult(node)).toEqual({
			workflowId: 'wf-123',
			toolCallId: 'tc-build-1',
		});
	});

	test('returns workflowId from successful submit-workflow call', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-submit-1',
					toolName: 'submit-workflow',
					result: { success: true, workflowId: 'wf-456' },
				}),
			],
		});
		expect(getLatestBuildResult(node)).toEqual({
			workflowId: 'wf-456',
			toolCallId: 'tc-submit-1',
		});
	});

	test('returns the latest result when multiple builds exist', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-1',
					toolName: 'build-workflow',
					result: { success: true, workflowId: 'wf-old' },
				}),
				makeToolCall({
					toolCallId: 'tc-2',
					toolName: 'build-workflow',
					result: { success: true, workflowId: 'wf-new' },
				}),
			],
		});
		expect(getLatestBuildResult(node)).toEqual({
			workflowId: 'wf-new',
			toolCallId: 'tc-2',
		});
	});

	test('detects rebuild of same workflow via different toolCallId', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-1',
					toolName: 'build-workflow',
					result: { success: true, workflowId: 'wf-same' },
				}),
				makeToolCall({
					toolCallId: 'tc-2',
					toolName: 'build-workflow',
					result: { success: true, workflowId: 'wf-same' },
				}),
			],
		});
		const result = getLatestBuildResult(node);
		expect(result?.workflowId).toBe('wf-same');
		expect(result?.toolCallId).toBe('tc-2');
	});

	test('finds result in child agent nodes', () => {
		const child = makeAgentNode({
			agentId: 'builder-1',
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-child',
					toolName: 'build-workflow',
					result: { success: true, workflowId: 'wf-child' },
				}),
			],
		});
		const parent = makeAgentNode({ children: [child] });
		expect(getLatestBuildResult(parent)).toEqual({
			workflowId: 'wf-child',
			toolCallId: 'tc-child',
		});
	});

	test('prefers child result over parent result (depth-first)', () => {
		const child = makeAgentNode({
			agentId: 'builder-1',
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-child',
					toolName: 'build-workflow',
					result: { success: true, workflowId: 'wf-child' },
				}),
			],
		});
		const parent = makeAgentNode({
			children: [child],
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-parent',
					toolName: 'build-workflow',
					result: { success: true, workflowId: 'wf-parent' },
				}),
			],
		});
		expect(getLatestBuildResult(parent)?.workflowId).toBe('wf-child');
	});
});

describe('getLatestExecutionId', () => {
	test('returns undefined for node with no tool calls', () => {
		expect(getLatestExecutionId(makeAgentNode())).toBeUndefined();
	});

	test('returns undefined for non-run tool calls', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'build-workflow',
					result: { success: true, workflowId: 'wf-1' },
				}),
			],
		});
		expect(getLatestExecutionId(node)).toBeUndefined();
	});

	test('returns undefined for loading run-workflow call', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'executions',
					args: { action: 'run' },
					isLoading: true,
				}),
			],
		});
		expect(getLatestExecutionId(node)).toBeUndefined();
	});

	test('returns executionId and workflowId from completed run-workflow call', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'executions',
					args: { action: 'run', workflowId: 'wf-1' },
					result: { executionId: 'exec-789', status: 'success' },
				}),
			],
		});
		expect(getLatestExecutionId(node)).toEqual({ executionId: 'exec-789', workflowId: 'wf-1' });
	});

	test('returns undefined when workflowId is missing from args', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'executions',
					args: { action: 'run' },
					result: { executionId: 'exec-789' },
				}),
			],
		});
		expect(getLatestExecutionId(node)).toBeUndefined();
	});

	test('returns the latest result when multiple runs exist', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-1',
					toolName: 'executions',
					args: { action: 'run', workflowId: 'wf-1' },
					result: { executionId: 'exec-old' },
				}),
				makeToolCall({
					toolCallId: 'tc-2',
					toolName: 'executions',
					args: { action: 'run', workflowId: 'wf-1' },
					result: { executionId: 'exec-new' },
				}),
			],
		});
		expect(getLatestExecutionId(node)).toEqual({ executionId: 'exec-new', workflowId: 'wf-1' });
	});

	test('finds result in child agent nodes', () => {
		const child = makeAgentNode({
			agentId: 'builder-1',
			toolCalls: [
				makeToolCall({
					toolName: 'executions',
					args: { action: 'run', workflowId: 'wf-1' },
					result: { executionId: 'exec-child' },
				}),
			],
		});
		const parent = makeAgentNode({ children: [child] });
		expect(getLatestExecutionId(parent)).toEqual({ executionId: 'exec-child', workflowId: 'wf-1' });
	});

	test('prefers build-workflow result.workflowId over run-workflow args.workflowId', () => {
		// Trace replay case: the cached LLM's run-workflow args carry the
		// recording's stale workflowId, but build-workflow's result always
		// reflects the workflow actually created in this run.
		const builder = makeAgentNode({
			agentId: 'builder-1',
			toolCalls: [
				makeToolCall({
					toolName: 'build-workflow',
					result: { success: true, workflowId: 'wf-real' },
				}),
			],
		});
		const node = makeAgentNode({
			children: [builder],
			toolCalls: [
				makeToolCall({
					toolName: 'executions',
					args: { action: 'run', workflowId: 'wf-stale-from-recording' },
					result: { executionId: 'exec-1', status: 'success' },
				}),
			],
		});
		expect(getLatestExecutionId(node)).toEqual({
			executionId: 'exec-1',
			workflowId: 'wf-real',
		});
	});
});

describe('getLatestDataTableResult', () => {
	test('returns undefined for node with no tool calls', () => {
		expect(getLatestDataTableResult(makeAgentNode())).toBeUndefined();
	});

	test('returns undefined for non-data-table tool calls', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'build-workflow',
					result: { success: true, workflowId: 'wf-1' },
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toBeUndefined();
	});

	test('returns undefined for loading data-table tool call', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'data-tables',
					args: { action: 'create' },
					isLoading: true,
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toBeUndefined();
	});

	test('returns dataTableId from successful create action', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-create',
					toolName: 'data-tables',
					args: { action: 'create' },
					result: { table: { id: 'dt-1', name: 'My Table' } },
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toEqual({
			dataTableId: 'dt-1',
			toolCallId: 'tc-create',
		});
	});

	test('returns undefined for create action without table.id', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'data-tables',
					args: { action: 'create' },
					result: { table: { name: 'No ID' } },
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toBeUndefined();
	});

	test('returns dataTableId from successful insert-rows action', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-insert',
					toolName: 'data-tables',
					args: { action: 'insert-rows', dataTableId: 'dt-2' },
					result: { insertedCount: 5 },
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toEqual({
			dataTableId: 'dt-2',
			toolCallId: 'tc-insert',
		});
	});

	test('returns undefined for insert-rows action without args.dataTableId', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'data-tables',
					args: { action: 'insert-rows' },
					result: { insertedCount: 5 },
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toBeUndefined();
	});

	test('returns dataTableId from successful update-rows action', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-update',
					toolName: 'data-tables',
					args: { action: 'update-rows', dataTableId: 'dt-3' },
					result: { updatedCount: 2 },
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toEqual({
			dataTableId: 'dt-3',
			toolCallId: 'tc-update',
		});
	});

	test('returns dataTableId from successful add-column action', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-add-col',
					toolName: 'data-tables',
					args: { action: 'add-column', dataTableId: 'dt-4' },
					result: { column: { name: 'Status', type: 'string' } },
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toEqual({
			dataTableId: 'dt-4',
			toolCallId: 'tc-add-col',
		});
	});

	test.each(['delete-rows', 'delete-column', 'rename-column'] as const)(
		'returns dataTableId from successful %s action',
		(action) => {
			const node = makeAgentNode({
				toolCalls: [
					makeToolCall({
						toolCallId: `tc-${action}`,
						toolName: 'data-tables',
						args: { action, dataTableId: 'dt-5' },
						result: { success: true },
					}),
				],
			});
			expect(getLatestDataTableResult(node)).toEqual({
				dataTableId: 'dt-5',
				toolCallId: `tc-${action}`,
			});
		},
	);

	test('returns the latest result when multiple data-table tool calls exist', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-1',
					toolName: 'data-tables',
					args: { action: 'create' },
					result: { table: { id: 'dt-old' } },
				}),
				makeToolCall({
					toolCallId: 'tc-2',
					toolName: 'data-tables',
					args: { action: 'insert-rows', dataTableId: 'dt-new' },
					result: { insertedCount: 3 },
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toEqual({
			dataTableId: 'dt-new',
			toolCallId: 'tc-2',
		});
	});

	test('finds result in child agent nodes', () => {
		const child = makeAgentNode({
			agentId: 'dt-agent',
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-child',
					toolName: 'data-tables',
					args: { action: 'create' },
					result: { table: { id: 'dt-child' } },
				}),
			],
		});
		const parent = makeAgentNode({ children: [child] });
		expect(getLatestDataTableResult(parent)).toEqual({
			dataTableId: 'dt-child',
			toolCallId: 'tc-child',
		});
	});
});

describe('getLatestDeletedDataTableId', () => {
	test('returns undefined for node with no tool calls', () => {
		expect(getLatestDeletedDataTableId(makeAgentNode())).toBeUndefined();
	});

	test('returns undefined for non-delete-data-table tool calls', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'data-tables',
					args: { action: 'create' },
					result: { table: { id: 'dt-1' } },
				}),
			],
		});
		expect(getLatestDeletedDataTableId(node)).toBeUndefined();
	});

	test('returns undefined for loading delete-data-table call', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'data-tables',
					args: { action: 'delete' },
					isLoading: true,
				}),
			],
		});
		expect(getLatestDeletedDataTableId(node)).toBeUndefined();
	});

	test('returns undefined when delete-data-table result has success: false', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'data-tables',
					args: { action: 'delete', dataTableId: 'dt-1' },
					result: { success: false },
				}),
			],
		});
		expect(getLatestDeletedDataTableId(node)).toBeUndefined();
	});

	test('returns undefined when args lacks dataTableId', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'data-tables',
					args: { action: 'delete' },
					result: { success: true },
				}),
			],
		});
		expect(getLatestDeletedDataTableId(node)).toBeUndefined();
	});

	test('returns dataTableId from successful delete-data-table', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'data-tables',
					args: { action: 'delete', dataTableId: 'dt-deleted' },
					result: { success: true },
				}),
			],
		});
		expect(getLatestDeletedDataTableId(node)).toBe('dt-deleted');
	});

	test('returns the latest result when multiple deletes exist', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-1',
					toolName: 'data-tables',
					args: { action: 'delete', dataTableId: 'dt-old' },
					result: { success: true },
				}),
				makeToolCall({
					toolCallId: 'tc-2',
					toolName: 'data-tables',
					args: { action: 'delete', dataTableId: 'dt-new' },
					result: { success: true },
				}),
			],
		});
		expect(getLatestDeletedDataTableId(node)).toBe('dt-new');
	});

	test('finds result in child agent nodes', () => {
		const child = makeAgentNode({
			agentId: 'dt-agent',
			toolCalls: [
				makeToolCall({
					toolName: 'data-tables',
					args: { action: 'delete', dataTableId: 'dt-child' },
					result: { success: true },
				}),
			],
		});
		const parent = makeAgentNode({ children: [child] });
		expect(getLatestDeletedDataTableId(parent)).toBe('dt-child');
	});
});

describe('getExecutionResultsByWorkflow', () => {
	test('returns empty map for node with no tool calls', () => {
		expect(getExecutionResultsByWorkflow(makeAgentNode()).size).toBe(0);
	});

	test('extracts successful run-workflow result', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'executions',
					args: { action: 'run', workflowId: 'wf-1' },
					result: { executionId: 'exec-1', status: 'success' },
				}),
			],
		});
		const results = getExecutionResultsByWorkflow(node);
		expect(results.get('wf-1')).toEqual({ executionId: 'exec-1', status: 'success' });
	});

	test('extracts error run-workflow result', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'executions',
					args: { action: 'run', workflowId: 'wf-1' },
					result: { executionId: 'exec-1', status: 'error' },
				}),
			],
		});
		const results = getExecutionResultsByWorkflow(node);
		expect(results.get('wf-1')).toEqual({ executionId: 'exec-1', status: 'error' });
	});

	test('keeps only the latest result per workflow', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-1',
					toolName: 'executions',
					args: { action: 'run', workflowId: 'wf-1' },
					result: { executionId: 'exec-1', status: 'error' },
				}),
				makeToolCall({
					toolCallId: 'tc-2',
					toolName: 'executions',
					args: { action: 'run', workflowId: 'wf-1' },
					result: { executionId: 'exec-2', status: 'success' },
				}),
			],
		});
		const results = getExecutionResultsByWorkflow(node);
		expect(results.get('wf-1')).toEqual({ executionId: 'exec-2', status: 'success' });
	});

	test('tracks multiple workflows independently', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-1',
					toolName: 'executions',
					args: { action: 'run', workflowId: 'wf-1' },
					result: { executionId: 'exec-1', status: 'success' },
				}),
				makeToolCall({
					toolCallId: 'tc-2',
					toolName: 'executions',
					args: { action: 'run', workflowId: 'wf-2' },
					result: { executionId: 'exec-2', status: 'error' },
				}),
			],
		});
		const results = getExecutionResultsByWorkflow(node);
		expect(results.get('wf-1')?.status).toBe('success');
		expect(results.get('wf-2')?.status).toBe('error');
	});

	test('walks children depth-first', () => {
		const child = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'executions',
					args: { action: 'run', workflowId: 'wf-1' },
					result: { executionId: 'exec-child', status: 'success' },
				}),
			],
		});
		const parent = makeAgentNode({ children: [child] });
		const results = getExecutionResultsByWorkflow(parent);
		expect(results.get('wf-1')?.executionId).toBe('exec-child');
	});

	test('child result wins over parent result for same workflowId', () => {
		const child = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-child',
					toolName: 'executions',
					args: { action: 'run', workflowId: 'wf-1' },
					result: { executionId: 'exec-child', status: 'success' },
				}),
			],
		});
		const parent = makeAgentNode({
			children: [child],
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-parent',
					toolName: 'executions',
					args: { action: 'run', workflowId: 'wf-1' },
					result: { executionId: 'exec-parent', status: 'error' },
				}),
			],
		});
		const results = getExecutionResultsByWorkflow(parent);
		expect(results.get('wf-1')).toEqual({ executionId: 'exec-child', status: 'success' });
	});

	test('extracts finishedAt when present in result', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'executions',
					args: { action: 'run', workflowId: 'wf-1' },
					result: { executionId: 'exec-1', status: 'success', finishedAt: '2026-03-30T10:00:00Z' },
				}),
			],
		});
		const results = getExecutionResultsByWorkflow(node);
		expect(results.get('wf-1')?.finishedAt).toBe('2026-03-30T10:00:00Z');
	});

	test('omits finishedAt when absent from result', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'executions',
					args: { action: 'run', workflowId: 'wf-1' },
					result: { executionId: 'exec-1', status: 'success' },
				}),
			],
		});
		const results = getExecutionResultsByWorkflow(node);
		expect(results.get('wf-1')?.finishedAt).toBeUndefined();
	});

	test('ignores loading tool calls', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'executions',
					isLoading: true,
					args: { action: 'run', workflowId: 'wf-1' },
					result: { executionId: 'exec-1', status: 'running' },
				}),
			],
		});
		expect(getExecutionResultsByWorkflow(node).size).toBe(0);
	});

	test('ignores running status results', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'executions',
					args: { action: 'run', workflowId: 'wf-1' },
					result: { executionId: 'exec-1', status: 'running' },
				}),
			],
		});
		expect(getExecutionResultsByWorkflow(node).size).toBe(0);
	});
});
