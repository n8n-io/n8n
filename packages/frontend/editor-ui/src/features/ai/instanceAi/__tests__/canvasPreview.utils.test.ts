import { describe, test, expect } from 'vitest';
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import {
	getLatestBuildResult,
	getLatestExecutionId,
	getLatestDataTableResult,
	getLatestDeletedDataTableId,
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
					toolName: 'run-workflow',
					isLoading: true,
				}),
			],
		});
		expect(getLatestExecutionId(node)).toBeUndefined();
	});

	test('returns executionId from completed run-workflow call', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'run-workflow',
					result: { executionId: 'exec-789', status: 'success' },
				}),
			],
		});
		expect(getLatestExecutionId(node)).toBe('exec-789');
	});

	test('returns the latest executionId when multiple runs exist', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-1',
					toolName: 'run-workflow',
					result: { executionId: 'exec-old' },
				}),
				makeToolCall({
					toolCallId: 'tc-2',
					toolName: 'run-workflow',
					result: { executionId: 'exec-new' },
				}),
			],
		});
		expect(getLatestExecutionId(node)).toBe('exec-new');
	});

	test('finds executionId in child agent nodes', () => {
		const child = makeAgentNode({
			agentId: 'builder-1',
			toolCalls: [
				makeToolCall({
					toolName: 'run-workflow',
					result: { executionId: 'exec-child' },
				}),
			],
		});
		const parent = makeAgentNode({ children: [child] });
		expect(getLatestExecutionId(parent)).toBe('exec-child');
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
					toolName: 'create-data-table',
					isLoading: true,
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toBeUndefined();
	});

	test('returns dataTableId from successful create-data-table', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-create',
					toolName: 'create-data-table',
					result: { table: { id: 'dt-1', name: 'My Table' } },
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toEqual({
			dataTableId: 'dt-1',
			toolCallId: 'tc-create',
		});
	});

	test('returns undefined for create-data-table without table.id', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'create-data-table',
					result: { table: { name: 'No ID' } },
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toBeUndefined();
	});

	test('returns dataTableId from successful insert-data-table-rows', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-insert',
					toolName: 'insert-data-table-rows',
					args: { dataTableId: 'dt-2' },
					result: { insertedCount: 5 },
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toEqual({
			dataTableId: 'dt-2',
			toolCallId: 'tc-insert',
		});
	});

	test('returns undefined for insert-data-table-rows without args.dataTableId', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'insert-data-table-rows',
					args: {},
					result: { insertedCount: 5 },
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toBeUndefined();
	});

	test('returns dataTableId from successful update-data-table-rows', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-update',
					toolName: 'update-data-table-rows',
					args: { dataTableId: 'dt-3' },
					result: { updatedCount: 2 },
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toEqual({
			dataTableId: 'dt-3',
			toolCallId: 'tc-update',
		});
	});

	test('returns dataTableId from successful add-data-table-column', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-add-col',
					toolName: 'add-data-table-column',
					args: { dataTableId: 'dt-4' },
					result: { column: { name: 'Status', type: 'string' } },
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toEqual({
			dataTableId: 'dt-4',
			toolCallId: 'tc-add-col',
		});
	});

	test.each([
		'delete-data-table-rows',
		'delete-data-table-column',
		'rename-data-table-column',
		'move-data-table-column',
	] as const)('returns dataTableId from successful %s', (toolName) => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: `tc-${toolName}`,
					toolName,
					args: { dataTableId: 'dt-5' },
					result: { success: true },
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toEqual({
			dataTableId: 'dt-5',
			toolCallId: `tc-${toolName}`,
		});
	});

	test('returns the latest result when multiple data-table tool calls exist', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-1',
					toolName: 'create-data-table',
					result: { table: { id: 'dt-old' } },
				}),
				makeToolCall({
					toolCallId: 'tc-2',
					toolName: 'insert-data-table-rows',
					args: { dataTableId: 'dt-new' },
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
					toolName: 'create-data-table',
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
					toolName: 'create-data-table',
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
					toolName: 'delete-data-table',
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
					toolName: 'delete-data-table',
					args: { dataTableId: 'dt-1' },
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
					toolName: 'delete-data-table',
					args: {},
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
					toolName: 'delete-data-table',
					args: { dataTableId: 'dt-deleted' },
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
					toolName: 'delete-data-table',
					args: { dataTableId: 'dt-old' },
					result: { success: true },
				}),
				makeToolCall({
					toolCallId: 'tc-2',
					toolName: 'delete-data-table',
					args: { dataTableId: 'dt-new' },
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
					toolName: 'delete-data-table',
					args: { dataTableId: 'dt-child' },
					result: { success: true },
				}),
			],
		});
		const parent = makeAgentNode({ children: [child] });
		expect(getLatestDeletedDataTableId(parent)).toBe('dt-child');
	});
});
