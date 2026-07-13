import { describe, expect, it } from 'vitest';
import { ASK_CREDENTIAL_TOOL_NAME, ASK_QUESTIONS_TOOL_NAME } from '@n8n/api-types';
import { TOOL_CALL_STATE } from '../constants';
import {
	DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE,
	DELEGATE_SUB_AGENT_TOOL_NAME,
} from '../utils/delegate-tool';
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
			'agents.chat.difficulty.low': 'Low',
			'agents.chat.difficulty.medium': 'Medium',
			'agents.chat.difficulty.high': 'High',
			'agents.chat.writeTodos.hint.difficulty': 'Difficulty',
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

		it('does not expose generic string output', () => {
			expect(
				getToolCallDetails({
					tool: 'search_nodes',
					output: 'Found 3 nodes',
					state: TOOL_CALL_STATE.DONE,
				}),
			).toBeUndefined();
		});

		it('does not expose generic object output as JSON', () => {
			expect(
				getToolCallDetails({
					tool: 'search_nodes',
					output: { nodes: ['Slack'] },
					state: TOOL_CALL_STATE.DONE,
				}),
			).toBeUndefined();
		});

		it('does not expose generic error strings', () => {
			expect(
				getToolCallDetails({
					tool: 'search_nodes',
					output: 'Credential missing',
					state: TOOL_CALL_STATE.ERROR,
				}),
			).toBeUndefined();
		});

		it('does not expose resolved interactive tool resume payloads', () => {
			expect(
				getToolCallDetails({
					tool: ASK_QUESTIONS_TOOL_NAME,
					output: { values: ['slack'] },
					state: TOOL_CALL_STATE.DONE,
				}),
			).toBeUndefined();
			expect(
				getToolCallDetails({
					tool: ASK_CREDENTIAL_TOOL_NAME,
					output: { credentialId: 'c1', credentialName: 'My Slack' },
					state: TOOL_CALL_STATE.DONE,
				}),
			).toBeUndefined();
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

		it('localizes known delegate error i18n keys when i18n is provided', () => {
			const i18n: WriteTodosI18n = {
				baseText: (key: string) => {
					if (key === DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE) {
						return 'Sub-agent requested user input, which is not supported for delegated runs yet.';
					}
					return key;
				},
			};
			expect(
				getToolCallDetails(
					{
						tool: DELEGATE_SUB_AGENT_TOOL_NAME,
						output: {
							status: 'failed',
							answer: '',
							error: DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE,
						},
						state: TOOL_CALL_STATE.ERROR,
					},
					i18n,
				),
			).toBe('Sub-agent requested user input, which is not supported for delegated runs yet.');
		});

		it('passes sub-agent name map through for write_todos delegate hints', () => {
			const nameById = new Map([['agent-2', 'Helper agent']]);
			const details = getToolCallDetails(
				{
					tool: WRITE_TODOS_TOOL_NAME,
					output: {
						status: 'ok',
						todoCount: 1,
						todos: [
							{
								id: 'a',
								content: 'Delegated work',
								status: 'pending',
								difficulty: 'high',
								delegateHint: { subAgentId: 'agent-2' },
							},
						],
					},
					state: TOOL_CALL_STATE.DONE,
				},
				writeTodosI18n,
				nameById,
			);
			expect(details).toContain('_(Difficulty: High; Sub-agent: Helper agent)_');
		});

		it('returns undefined for write_todos without i18n', () => {
			expect(
				getToolCallDetails({
					tool: WRITE_TODOS_TOOL_NAME,
					output: {
						status: 'ok',
						todoCount: 1,
						todos: [{ id: 'a', content: 'Task', status: 'pending', difficulty: 'low' }],
					},
					state: TOOL_CALL_STATE.DONE,
				}),
			).toBeUndefined();
		});

		it('shows write_todos failed output errors without i18n', () => {
			expect(
				getToolCallDetails({
					tool: WRITE_TODOS_TOOL_NAME,
					output: { status: 'failed', error: 'Duplicate todo id "a"' },
					state: TOOL_CALL_STATE.ERROR,
				}),
			).toBe('Duplicate todo id "a"');
		});

		it('shows rejected write_todos tool error strings', () => {
			expect(
				getToolCallDetails({
					tool: WRITE_TODOS_TOOL_NAME,
					output: 'Each task must have a unique id',
					state: TOOL_CALL_STATE.ERROR,
				}),
			).toBe('Each task must have a unique id');
		});
	});

	describe('isToolCallExpandable', () => {
		it('is false for generic tools even when output is present', () => {
			expect(
				isToolCallExpandable({
					tool: 'search_nodes',
					output: { nodes: ['Slack'] },
					state: TOOL_CALL_STATE.DONE,
				}),
			).toBe(false);
		});

		it('is true for delegate_subagent with answer content', () => {
			expect(
				isToolCallExpandable({
					tool: DELEGATE_SUB_AGENT_TOOL_NAME,
					output: { status: 'completed', answer: 'Child result' },
					state: TOOL_CALL_STATE.DONE,
				}),
			).toBe(true);
		});
	});
});
