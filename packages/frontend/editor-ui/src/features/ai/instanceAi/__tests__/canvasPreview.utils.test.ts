import { describe, test, expect } from 'vitest';
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import { getLatestBuildResult, getLatestExecutionId } from '../canvasPreview.utils';

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
