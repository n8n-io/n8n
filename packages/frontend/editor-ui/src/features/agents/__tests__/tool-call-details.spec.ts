import { describe, expect, it } from 'vitest';
import { TOOL_CALL_STATE } from '../constants';
import { DELEGATE_SUB_AGENT_TOOL_NAME } from '../utils/delegate-tool';
import { getToolCallDetails, isToolCallExpandable } from '../utils/tool-call-details';
import { WRITE_TODOS_TOOL_NAME, type WriteTodosI18n } from '../utils/write-todos-tool';

const writeTodosI18n: WriteTodosI18n = {
	baseText: (key: string) => {
		const labels: Record<string, string> = {
			'agents.chat.writeTodos.status.inProgress': 'In progress',
			'agents.chat.writeTodos.status.pending': 'Pending',
			'agents.chat.writeTodos.status.completed': 'Completed',
			'agents.chat.writeTodos.status.blocked': 'Blocked',
			'agents.chat.writeTodos.status.cancelled': 'Cancelled',
			'agents.chat.writeTodos.hint.subAgent': 'Sub-agent',
			'agents.chat.writeTodos.hint.expectedOutput': 'Expected output',
		};
		return labels[key] ?? key;
	},
} as WriteTodosI18n;

describe('tool-call-details', () => {
	describe('getToolCallDetails', () => {
		it('returns undefined for running tool calls', () => {
			expect(
				getToolCallDetails({
					tool: 'search_nodes',
					output: { nodes: ['Slack'] },
					state: TOOL_CALL_STATE.RUNNING,
				}),
			).toBeUndefined();
		});

		it('formats generic string output', () => {
			expect(
				getToolCallDetails({
					tool: 'search_nodes',
					output: 'Found 3 nodes',
					state: TOOL_CALL_STATE.DONE,
				}),
			).toBe('Found 3 nodes');
		});

		it('formats generic object output as fenced JSON', () => {
			const details = getToolCallDetails({
				tool: 'search_nodes',
				output: { nodes: ['Slack'] },
				state: TOOL_CALL_STATE.DONE,
			});
			expect(details).toContain('```json');
			expect(details).toContain('"nodes"');
		});

		it('returns undefined for empty generic output', () => {
			expect(
				getToolCallDetails({
					tool: 'search_nodes',
					output: {},
					state: TOOL_CALL_STATE.DONE,
				}),
			).toBeUndefined();
		});

		it('shows rejected tool error strings for error state', () => {
			expect(
				getToolCallDetails({
					tool: 'search_nodes',
					output: 'Credential missing',
					state: TOOL_CALL_STATE.ERROR,
				}),
			).toBe('Credential missing');
		});

		it('shows delegate answers for completed delegations', () => {
			expect(
				getToolCallDetails({
					tool: DELEGATE_SUB_AGENT_TOOL_NAME,
					output: { status: 'completed', answer: 'Child result' },
					state: TOOL_CALL_STATE.DONE,
				}),
			).toBe('Child result');
		});

		it('shows delegate errors for failed delegations', () => {
			expect(
				getToolCallDetails({
					tool: DELEGATE_SUB_AGENT_TOOL_NAME,
					output: { status: 'failed', answer: '', error: 'child failed' },
					state: TOOL_CALL_STATE.ERROR,
				}),
			).toBe('child failed');
		});

		it('formats write_todos output as grouped Markdown when i18n is provided', () => {
			const details = getToolCallDetails(
				{
					tool: WRITE_TODOS_TOOL_NAME,
					output: {
						status: 'ok',
						todoCount: 2,
						todos: [
							{ id: 'a', content: 'Research APIs', status: 'in_progress' },
							{ id: 'b', content: 'Write summary', status: 'pending' },
						],
					},
					state: TOOL_CALL_STATE.DONE,
				},
				writeTodosI18n,
			);
			expect(details).toContain('**In progress**');
			expect(details).toContain('- Research APIs');
			expect(details).toContain('**Pending**');
			expect(details).toContain('- Write summary');
		});

		it('returns undefined for write_todos without i18n', () => {
			expect(
				getToolCallDetails({
					tool: WRITE_TODOS_TOOL_NAME,
					output: {
						status: 'ok',
						todoCount: 1,
						todos: [{ id: 'a', content: 'Task', status: 'pending' }],
					},
					state: TOOL_CALL_STATE.DONE,
				}),
			).toBeUndefined();
		});
	});

	describe('isToolCallExpandable', () => {
		it('is true only when details exist', () => {
			expect(
				isToolCallExpandable({
					tool: 'search_nodes',
					output: { nodes: ['Slack'] },
					state: TOOL_CALL_STATE.DONE,
				}),
			).toBe(true);
			expect(
				isToolCallExpandable({
					tool: 'search_nodes',
					output: undefined,
					state: TOOL_CALL_STATE.DONE,
				}),
			).toBe(false);
		});
	});
});
