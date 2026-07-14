import { describe, test, expect } from 'vitest';
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import {
	getLatestBuildResult,
	getLatestBuilderTarget,
	getLatestAgentBuilderTarget,
	getLatestDataTableResult,
	getLatestDeletedDataTableId,
	getLatestWorkflowUpdateResult,
	getLatestAgentArtifactResult,
	getExecutionResultsByWorkflow,
	isAgentEditingWorkflow,
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

describe('getLatestBuilderTarget', () => {
	test('returns undefined for node with no children', () => {
		expect(getLatestBuilderTarget(makeAgentNode())).toBeUndefined();
	});

	test('returns undefined when builder child has no targetResource id (create flow)', () => {
		const builder = makeAgentNode({
			agentId: 'agent-builder-1',
			role: 'workflow-builder',
			kind: 'builder',
			status: 'active',
			targetResource: { type: 'workflow' },
		});
		const parent = makeAgentNode({ children: [builder] });
		expect(getLatestBuilderTarget(parent)).toBeUndefined();
	});

	test('returns agentId and workflowId when builder is spawned with targetResource.id (edit flow)', () => {
		const builder = makeAgentNode({
			agentId: 'agent-builder-1',
			role: 'workflow-builder',
			kind: 'builder',
			status: 'active',
			targetResource: { type: 'workflow', id: 'wf-existing' },
		});
		const parent = makeAgentNode({ children: [builder] });
		expect(getLatestBuilderTarget(parent)).toEqual({
			agentId: 'agent-builder-1',
			workflowId: 'wf-existing',
		});
	});

	test('detects builder by kind even when role differs', () => {
		const builder = makeAgentNode({
			agentId: 'agent-builder-2',
			role: 'background-task',
			kind: 'builder',
			status: 'active',
			targetResource: { type: 'workflow', id: 'wf-1' },
		});
		const parent = makeAgentNode({ children: [builder] });
		expect(getLatestBuilderTarget(parent)?.workflowId).toBe('wf-1');
	});

	test('ignores non-workflow targetResource types', () => {
		const credSetup = makeAgentNode({
			agentId: 'agent-cred-1',
			role: 'credential-setup',
			kind: 'builder',
			status: 'active',
			targetResource: { type: 'credential', id: 'cred-1' },
		});
		const parent = makeAgentNode({ children: [credSetup] });
		expect(getLatestBuilderTarget(parent)).toBeUndefined();
	});

	test('returns the latest builder when multiple are present', () => {
		const builderA = makeAgentNode({
			agentId: 'agent-builder-a',
			role: 'workflow-builder',
			kind: 'builder',
			status: 'completed',
			targetResource: { type: 'workflow', id: 'wf-a' },
		});
		const builderB = makeAgentNode({
			agentId: 'agent-builder-b',
			role: 'workflow-builder',
			kind: 'builder',
			status: 'active',
			targetResource: { type: 'workflow', id: 'wf-b' },
		});
		const parent = makeAgentNode({ children: [builderA, builderB] });
		expect(getLatestBuilderTarget(parent)?.workflowId).toBe('wf-b');
	});

	test('walks nested children depth-first, newest last', () => {
		const nestedBuilder = makeAgentNode({
			agentId: 'agent-builder-nested',
			role: 'workflow-builder',
			kind: 'builder',
			status: 'active',
			targetResource: { type: 'workflow', id: 'wf-nested' },
		});
		const intermediate = makeAgentNode({
			agentId: 'agent-intermediate',
			role: 'coordinator',
			children: [nestedBuilder],
		});
		const parent = makeAgentNode({ children: [intermediate] });
		expect(getLatestBuilderTarget(parent)?.workflowId).toBe('wf-nested');
	});
});

describe('getLatestAgentBuilderTarget', () => {
	test('returns undefined for node with no children', () => {
		expect(getLatestAgentBuilderTarget(makeAgentNode())).toBeUndefined();
	});

	test('returns undefined when no agent-builder node is present', () => {
		const builder = makeAgentNode({
			agentId: 'agent-builder-1',
			role: 'workflow-builder',
			kind: 'builder',
			status: 'active',
			targetResource: { type: 'workflow', id: 'wf-existing' },
		});
		const parent = makeAgentNode({ children: [builder] });
		expect(getLatestAgentBuilderTarget(parent)).toBeUndefined();
	});

	test('returns undefined when targetResource.type is not agent', () => {
		const builder = makeAgentNode({
			agentId: 'agent-builder-1',
			kind: 'agent-builder',
			status: 'active',
			targetResource: { type: 'workflow', id: 'wf-1' },
		});
		const parent = makeAgentNode({ children: [builder] });
		expect(getLatestAgentBuilderTarget(parent)).toBeUndefined();
	});

	test('returns agentId and targetAgentId when the most recent agent-builder child has an agent targetResource', () => {
		const builderA = makeAgentNode({
			agentId: 'agent-builder-a',
			kind: 'agent-builder',
			status: 'completed',
			targetResource: { type: 'agent', id: 'agent-a', projectId: 'project-1' },
		});
		const builderB = makeAgentNode({
			agentId: 'agent-builder-b',
			kind: 'agent-builder',
			status: 'active',
			targetResource: { type: 'agent', id: 'agent-b', projectId: 'project-1' },
		});
		const parent = makeAgentNode({ children: [builderA, builderB] });
		expect(getLatestAgentBuilderTarget(parent)).toEqual({
			agentId: 'agent-builder-b',
			targetAgentId: 'agent-b',
		});
	});
});

describe('getLatestAgentArtifactResult', () => {
	test('uses parent agent target for nested agent mutations', () => {
		const nestedAgentBuilder = makeAgentNode({
			agentId: 'nested-builder',
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-nested-build',
					toolName: 'build-agent',
					args: { message: 'add a step' },
					result: { ok: true, configUpdated: true },
				}),
			],
		});
		const parentAgentBuilder = makeAgentNode({
			agentId: 'agent-builder',
			targetResource: { type: 'agent', id: 'agent-1', projectId: 'project-1' },
			children: [nestedAgentBuilder],
		});

		expect(getLatestAgentArtifactResult(parentAgentBuilder)).toEqual({
			agentId: 'agent-1',
			projectId: 'project-1',
			toolCallId: 'tc-nested-build',
			kind: 'mutated',
		});
	});

	test('creates from a name arg, resolving identity from the spawned builder child target', () => {
		const builderChild = makeAgentNode({
			agentId: 'builder-child',
			role: 'agent-builder',
			kind: 'builder',
			targetResource: { type: 'agent', id: 'agent-1', projectId: 'project-1', name: 'New Agent' },
		});
		const orchestrator = makeAgentNode({
			children: [builderChild],
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-create',
					toolName: 'build-agent',
					args: { message: 'build me an agent', name: 'New Agent' },
					result: { ok: true, builderReply: 'Created it' },
				}),
			],
		});

		expect(getLatestAgentArtifactResult(orchestrator)).toEqual({
			agentId: 'agent-1',
			projectId: 'project-1',
			toolCallId: 'tc-create',
			kind: 'created',
		});
	});

	test('mutates using fallbackTarget when no targetResource exists in the tree', () => {
		const orchestrator = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-mutate',
					toolName: 'build-agent',
					args: { message: 'add a skill' },
					result: { ok: true, configUpdated: true },
				}),
			],
		});

		expect(
			getLatestAgentArtifactResult(orchestrator, { agentId: 'agent-1', projectId: 'project-1' }),
		).toEqual({
			agentId: 'agent-1',
			projectId: 'project-1',
			toolCallId: 'tc-mutate',
			kind: 'mutated',
		});
	});

	test('returns undefined for a reply-only turn (ok but no name and no configUpdated)', () => {
		const orchestrator = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-reply',
					toolName: 'build-agent',
					args: { message: 'what does this agent do?' },
					result: { ok: true, builderReply: 'It triages your inbox.' },
				}),
			],
		});

		expect(
			getLatestAgentArtifactResult(orchestrator, { agentId: 'agent-1', projectId: 'project-1' }),
		).toBeUndefined();
	});

	test('returns undefined when no target is available anywhere in the tree', () => {
		const orchestrator = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-mutate',
					toolName: 'build-agent',
					args: { message: 'add a skill' },
					result: { ok: true, configUpdated: true },
				}),
			],
		});

		expect(getLatestAgentArtifactResult(orchestrator)).toBeUndefined();
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

	test('returns dataTableId from successful schema action', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-schema',
					toolName: 'data-tables',
					args: { action: 'schema', dataTableId: 'Table Name' },
					result: { dataTableId: 'dt-schema', columns: [] },
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toEqual({
			dataTableId: 'dt-schema',
			toolCallId: 'tc-schema',
		});
	});

	test('returns dataTableId from successful query action', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-query',
					toolName: 'data-tables',
					args: { action: 'query', dataTableId: 'dt-query' },
					result: { dataTableId: 'dt-query', count: 1, data: [{ id: 1 }] },
				}),
			],
		});
		expect(getLatestDataTableResult(node)).toEqual({
			dataTableId: 'dt-query',
			toolCallId: 'tc-query',
		});
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

	test('extracts successful verify-built-workflow result', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'verify-built-workflow',
					args: { workflowId: 'wf-1' },
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

describe('getLatestWorkflowUpdateResult', () => {
	test('returns undefined for non-mutating workflows actions', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'workflows',
					args: { action: 'get-json', workflowId: 'wf-1' },
					result: { workflow: { id: 'wf-1' } },
				}),
			],
		});
		expect(getLatestWorkflowUpdateResult(node)).toBeUndefined();
	});

	test('returns undefined for a failed update call', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'workflows',
					args: { action: 'update', workflowId: 'wf-1' },
					result: { success: false, error: 'invalid workflow' },
				}),
			],
		});
		expect(getLatestWorkflowUpdateResult(node)).toBeUndefined();
	});

	test('returns workflowId (from args) and toolCallId for a successful update', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-update-1',
					toolName: 'workflows',
					args: { action: 'update', workflowId: 'wf-1', workflow: { id: 'wf-1' } },
					result: { success: true, workflowId: 'wf-1' },
				}),
			],
		});
		expect(getLatestWorkflowUpdateResult(node)).toEqual({
			workflowId: 'wf-1',
			toolCallId: 'tc-update-1',
		});
	});

	test('returns workflowId from args for restore-version (result omits workflowId)', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-restore-1',
					toolName: 'workflows',
					args: { action: 'restore-version', workflowId: 'wf-2', versionId: 'v-1' },
					result: { success: true },
				}),
			],
		});
		expect(getLatestWorkflowUpdateResult(node)).toEqual({
			workflowId: 'wf-2',
			toolCallId: 'tc-restore-1',
		});
	});

	test('returns workflowId from args for a successful setup (result omits workflowId)', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolCallId: 'tc-setup-1',
					toolName: 'workflows',
					args: { action: 'setup', workflowId: 'wf-3' },
					result: { success: true, completedNodes: [] },
				}),
			],
		});
		expect(getLatestWorkflowUpdateResult(node)).toEqual({
			workflowId: 'wf-3',
			toolCallId: 'tc-setup-1',
		});
	});
});

describe('isAgentEditingWorkflow', () => {
	test('locks while an active agent run has already built the workflow', () => {
		const node = makeAgentNode({
			status: 'active',
			toolCalls: [
				makeToolCall({
					toolName: 'build-workflow',
					result: { success: true, workflowId: 'wf-1' },
				}),
			],
		});
		expect(isAgentEditingWorkflow(node, 'wf-1')).toBe(true);
	});

	test('does not lock for a completed agent run that built the workflow', () => {
		const node = makeAgentNode({
			status: 'completed',
			toolCalls: [
				makeToolCall({
					toolName: 'build-workflow',
					result: { success: true, workflowId: 'wf-1' },
				}),
			],
		});
		expect(isAgentEditingWorkflow(node, 'wf-1')).toBe(false);
	});

	test('locks while a workflow-builder sub-agent is active on the workflow', () => {
		const node = makeAgentNode({
			role: 'workflow-builder',
			status: 'active',
			targetResource: { type: 'workflow', id: 'wf-1' },
		});
		expect(isAgentEditingWorkflow(node, 'wf-1')).toBe(true);
	});

	test('locks while a kind-only builder sub-agent is active on the workflow', () => {
		const node = makeAgentNode({
			kind: 'builder',
			status: 'active',
			targetResource: { type: 'workflow', id: 'wf-1' },
		});
		expect(isAgentEditingWorkflow(node, 'wf-1')).toBe(true);
	});

	test('does not lock once the builder is no longer active', () => {
		const node = makeAgentNode({
			role: 'workflow-builder',
			status: 'completed',
			targetResource: { type: 'workflow', id: 'wf-1' },
		});
		expect(isAgentEditingWorkflow(node, 'wf-1')).toBe(false);
	});

	test('locks while a build/setup/verification tool call is in flight on the workflow', () => {
		for (const toolName of [
			'build-workflow',
			'build-workflow-with-agent',
			'apply-workflow-credentials',
			'setup-workflow',
			'verify-built-workflow',
		]) {
			const node = makeAgentNode({
				toolCalls: [makeToolCall({ toolName, isLoading: true, args: { workflowId: 'wf-1' } })],
			});
			expect(isAgentEditingWorkflow(node, 'wf-1')).toBe(true);
		}
	});

	test('locks while an agent workflow execution is in flight on the workflow', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'executions',
					isLoading: true,
					args: { action: 'run', workflowId: 'wf-1' },
				}),
			],
		});

		expect(isAgentEditingWorkflow(node, 'wf-1')).toBe(true);
	});

	test('locks while a workflows update / restore-version / setup is in flight on the workflow', () => {
		for (const action of ['update', 'restore-version', 'setup']) {
			const node = makeAgentNode({
				toolCalls: [
					makeToolCall({
						toolName: 'workflows',
						isLoading: true,
						args: { action, workflowId: 'wf-1' },
					}),
				],
			});
			expect(isAgentEditingWorkflow(node, 'wf-1')).toBe(true);
		}
	});

	test('does NOT lock for in-flight read-only workflows actions', () => {
		for (const action of ['get-json', 'get', 'list']) {
			const node = makeAgentNode({
				toolCalls: [
					makeToolCall({
						toolName: 'workflows',
						isLoading: true,
						args: { action, workflowId: 'wf-1' },
					}),
				],
			});
			expect(isAgentEditingWorkflow(node, 'wf-1')).toBe(false);
		}
	});

	test('does not lock once the mutating call has finished', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'workflows',
					isLoading: false,
					args: { action: 'update', workflowId: 'wf-1' },
					result: { success: true, workflowId: 'wf-1' },
				}),
			],
		});
		expect(isAgentEditingWorkflow(node, 'wf-1')).toBe(false);
	});

	test('does not lock when the in-flight edit targets a different workflow', () => {
		const node = makeAgentNode({
			toolCalls: [
				makeToolCall({
					toolName: 'build-workflow',
					isLoading: true,
					args: { workflowId: 'wf-other' },
				}),
			],
		});
		expect(isAgentEditingWorkflow(node, 'wf-1')).toBe(false);
	});

	test('detects an in-flight edit in a child node', () => {
		const node = makeAgentNode({
			children: [
				makeAgentNode({
					agentId: 'child-1',
					toolCalls: [
						makeToolCall({
							toolName: 'workflows',
							isLoading: true,
							args: { action: 'update', workflowId: 'wf-9' },
						}),
					],
				}),
			],
		});
		expect(isAgentEditingWorkflow(node, 'wf-9')).toBe(true);
	});
});
