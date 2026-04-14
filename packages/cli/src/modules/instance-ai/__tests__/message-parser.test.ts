import type { InstanceAiAgentNode } from '@n8n/api-types';

import { parseStoredMessages } from '../message-parser';
import type { MastraDBMessage } from '../message-parser';

function makeDate(offset = 0): Date {
	return new Date(Date.now() + offset);
}

describe('parseStoredMessages', () => {
	describe('user messages', () => {
		it('should parse user message with string content', () => {
			const messages: MastraDBMessage[] = [
				{
					id: 'msg-1',
					role: 'user',
					content: 'Hello world',
					createdAt: makeDate(),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				id: 'msg-1',
				role: 'user',
				content: 'Hello world',
				reasoning: '',
				isStreaming: false,
			});
		});

		it('should parse user message with V2 content (parts array)', () => {
			const messages: MastraDBMessage[] = [
				{
					id: 'msg-1',
					role: 'user',
					content: {
						format: 2,
						parts: [{ type: 'text', text: 'Build me a workflow' }],
					},
					createdAt: makeDate(),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].content).toBe('Build me a workflow');
		});

		it('should parse user message with V2 content shortcut', () => {
			const messages: MastraDBMessage[] = [
				{
					id: 'msg-1',
					role: 'user',
					content: { format: 2, content: 'Short version' },
					createdAt: makeDate(),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result[0].content).toBe('Short version');
		});
	});

	describe('assistant messages', () => {
		it('should parse assistant message with text only', () => {
			const messages: MastraDBMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Hi',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: { format: 2, content: 'Hello! How can I help?' },
					createdAt: makeDate(1),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result).toHaveLength(2);
			const assistant = result[1];
			expect(assistant.role).toBe('assistant');
			expect(assistant.content).toBe('Hello! How can I help?');
			expect(assistant.reasoning).toBe('');
			expect(assistant.isStreaming).toBe(false);
			expect(assistant.agentTree).toBeDefined();
			expect(assistant.agentTree?.textContent).toBe('Hello! How can I help?');
		});

		it('should parse assistant message with tool invocations (result state)', () => {
			const messages: MastraDBMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'List workflows',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: {
						format: 2,
						content: 'Here are your workflows',
						toolInvocations: [
							{
								state: 'result',
								toolCallId: 'tc-1',
								toolName: 'list-workflows',
								args: { limit: 10 },
								result: { workflows: ['wf1'] },
							},
						],
					},
					createdAt: makeDate(1),
				},
			];

			const result = parseStoredMessages(messages);

			const assistant = result[1];
			expect(assistant.agentTree?.toolCalls).toHaveLength(1);
			expect(assistant.agentTree?.toolCalls[0]).toMatchObject({
				toolCallId: 'tc-1',
				toolName: 'list-workflows',
				args: { limit: 10 },
				result: { workflows: ['wf1'] },
				isLoading: false,
				renderHint: 'default',
			});
		});

		it('should parse assistant message with tool invocations (call state - interrupted)', () => {
			const messages: MastraDBMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Do something',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: {
						format: 2,
						content: '',
						toolInvocations: [
							{
								state: 'call',
								toolCallId: 'tc-2',
								toolName: 'task-control',
								args: { tasks: [] },
							},
						],
					},
					createdAt: makeDate(1),
				},
			];

			const result = parseStoredMessages(messages);

			const tc = result[1].agentTree?.toolCalls[0];
			expect(tc?.isLoading).toBe(true);
			expect(tc?.result).toBeUndefined();
			expect(tc?.renderHint).toBe('tasks');
		});

		it('should parse assistant message with reasoning', () => {
			const messages: MastraDBMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Think about this',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: {
						format: 2,
						content: 'Result',
						reasoning: [{ text: 'Let me think...' }, { text: ' more thoughts' }],
					},
					createdAt: makeDate(1),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result[1].reasoning).toBe('Let me think... more thoughts');
		});

		it('should parse reasoning from parts array', () => {
			const messages: MastraDBMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Think',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: {
						format: 2,
						parts: [
							{ type: 'reasoning', text: 'Reasoning part' },
							{ type: 'text', text: 'Answer' },
						],
					},
					createdAt: makeDate(1),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result[1].reasoning).toBe('Reasoning part');
			expect(result[1].content).toBe('Answer');
		});

		it('should use agentTree snapshot when available', () => {
			const messages: MastraDBMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Build something',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: { format: 2, content: 'Done!' },
					createdAt: makeDate(1),
				},
			];

			const snapshotTree: InstanceAiAgentNode = {
				agentId: 'agent-001',
				role: 'orchestrator',
				status: 'completed',
				textContent: 'Full tree text',
				reasoning: '',
				toolCalls: [],
				children: [
					{
						agentId: 'agent-002',
						role: 'builder',
						status: 'completed',
						textContent: 'Built it',
						reasoning: '',
						toolCalls: [],
						children: [],
						timeline: [],
					},
				],
				timeline: [],
			};

			// Snapshot array — positionally matched to the assistant message
			const snapshots = [{ tree: snapshotTree, runId: 'run_abc123' }];

			const result = parseStoredMessages(messages, snapshots);

			expect(result[1].agentTree).toBe(snapshotTree);
			expect(result[1].agentTree?.children).toHaveLength(1);
			// Should use the native runId from the snapshot (not the user message id)
			expect(result[1].runId).toBe('run_abc123');
		});

		it('should apply renderHint correctly for known tool names', () => {
			const messages: MastraDBMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Go',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: {
						format: 2,
						content: '',
						toolInvocations: [
							{ state: 'result', toolCallId: 'tc-1', toolName: 'delegate', args: {}, result: 'ok' },
							{
								state: 'result',
								toolCallId: 'tc-2',
								toolName: 'build-workflow-with-agent',
								args: {},
								result: 'ok',
							},
							{
								state: 'result',
								toolCallId: 'tc-3',
								toolName: 'manage-data-tables-with-agent',
								args: {},
								result: 'ok',
							},
						],
					},
					createdAt: makeDate(1),
				},
			];

			const result = parseStoredMessages(messages);

			const toolCalls = result[1].agentTree?.toolCalls ?? [];
			expect(toolCalls[0].renderHint).toBe('delegate');
			expect(toolCalls[1].renderHint).toBe('builder');
			expect(toolCalls[2].renderHint).toBe('data-table');
		});

		it('should apply renderHint correctly for workflow flow aliases in stored messages', () => {
			const messages: MastraDBMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Go',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: {
						format: 2,
						content: '',
						toolInvocations: [
							{
								state: 'result',
								toolCallId: 'tc-1',
								toolName: 'workflow-build-flow',
								args: {},
								result: { ok: true },
							},
							{
								state: 'result',
								toolCallId: 'tc-2',
								toolName: 'agent-data-table-manager',
								args: {},
								result: { ok: true },
							},
						],
					},
					createdAt: makeDate(1),
				},
			];

			const result = parseStoredMessages(messages);

			const toolCalls = result[1].agentTree?.toolCalls ?? [];
			expect(toolCalls[0].renderHint).toBe('builder');
			expect(toolCalls[1].renderHint).toBe('data-table');
		});
	});

	describe('internal enrichment stripping', () => {
		it('should hide auto-follow-up (continue) messages', () => {
			const messages: MastraDBMessage[] = [
				{
					id: 'msg-u1',
					role: 'user',
					content: 'Build me a workflow',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a1',
					role: 'assistant',
					content: { format: 2, content: 'On it!' },
					createdAt: makeDate(1),
				},
				{
					id: 'msg-u2',
					role: 'user',
					content:
						'<running-tasks>\n[Background task completed — workflow-builder]: Done\n</running-tasks>\n\n(continue)',
					createdAt: makeDate(2),
				},
				{
					id: 'msg-a2',
					role: 'assistant',
					content: { format: 2, content: 'Your workflow is ready!' },
					createdAt: makeDate(3),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result).toHaveLength(3);
			expect(result[0]).toMatchObject({ id: 'msg-u1', role: 'user' });
			expect(result[1]).toMatchObject({ id: 'msg-a1', role: 'assistant' });
			// The (continue) user message is hidden; only the assistant response remains
			expect(result[2]).toMatchObject({ id: 'msg-a2', role: 'assistant' });
		});

		it('should hide bare (continue) messages without task context block', () => {
			const messages: MastraDBMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: '(continue)',
					createdAt: makeDate(),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result).toHaveLength(0);
		});

		it('should strip running-tasks enrichment from real user messages', () => {
			const messages: MastraDBMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content:
						'<running-tasks>\n[Running task — workflow-builder]: taskId=build-1234\n</running-tasks>\n\nUse the Redis credential instead',
					createdAt: makeDate(),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].content).toBe('Use the Redis credential instead');
		});

		it('should not strip running-tasks text that appears mid-message', () => {
			const messages: MastraDBMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Tell me about <running-tasks> tags',
					createdAt: makeDate(),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].content).toBe('Tell me about <running-tasks> tags');
		});
	});

	describe('edge cases', () => {
		it('should handle empty message list', () => {
			const result = parseStoredMessages([]);
			expect(result).toEqual([]);
		});

		it('should skip tool/system role messages', () => {
			const messages: MastraDBMessage[] = [
				{
					id: 'msg-t',
					role: 'tool',
					content: 'tool output',
					createdAt: makeDate(),
				},
				{
					id: 'msg-s',
					role: 'system',
					content: 'system message',
					createdAt: makeDate(),
				},
			];

			const result = parseStoredMessages(messages);
			expect(result).toHaveLength(0);
		});

		it('should handle assistant message with empty content gracefully', () => {
			const messages: MastraDBMessage[] = [
				{
					id: 'msg-a',
					role: 'assistant',
					content: { format: 2 },
					createdAt: makeDate(),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].content).toBe('');
			// No tool calls and no text → no agentTree
			expect(result[0].agentTree).toBeUndefined();
		});

		it('should extract tool invocations from parts array as fallback', () => {
			const messages: MastraDBMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'test',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: {
						format: 2,
						parts: [
							{
								type: 'tool-invocation',
								toolInvocation: {
									state: 'result',
									toolCallId: 'tc-parts',
									toolName: 'plan',
									args: { goal: 'x' },
									result: 'done',
								},
							},
						],
					},
					createdAt: makeDate(1),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result[1].agentTree?.toolCalls).toHaveLength(1);
			expect(result[1].agentTree?.toolCalls[0].toolCallId).toBe('tc-parts');
		});
	});
});
