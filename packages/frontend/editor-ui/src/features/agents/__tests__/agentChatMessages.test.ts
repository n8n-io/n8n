import { describe, it, expect } from 'vitest';
import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_QUESTIONS_TOOL_NAME,
	APPROVAL_TOOL_NAME,
	N8N_CHAT_ACTION_TOOL_NAME,
	type AgentPersistedMessageContentPart,
	type AgentPersistedMessageDto,
} from '@n8n/api-types';

import {
	applyOpenSuspensions,
	convertDbMessages,
	rebuildInteractiveFromHistory,
} from '@/features/ai/shared/agentsChat/messageMappers';
import { buildDisplayGroups, isGroupable } from '@/features/ai/shared/agentsChat/displayGroups';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';

/** A full `credentialSuspendPayloadSchema`-shaped input, for fixtures that construct `InteractivePayload` literals directly (bypassing `rebuildInteractiveFromHistory`'s raw-args fallback). */
function credentialSuspendInput(credentialType: string, reason: string) {
	return {
		requestId: 'req-1',
		message: reason,
		severity: 'info' as const,
		credentialRequests: [{ credentialType, reason, existingCredentials: [] }],
		credentialFlow: { stage: 'generic' as const },
	};
}

/** A full `questionsSuspendPayloadSchema`-shaped input, for fixtures that construct `InteractivePayload` literals directly. */
function questionsSuspendInput(question: string) {
	return {
		requestId: 'req-q1',
		message: question,
		severity: 'info' as const,
		inputType: 'questions' as const,
		questions: [{ id: 'q1', question, type: 'text' as const }],
	};
}

describe('rebuildInteractiveFromHistory', () => {
	it('rebuilds an ask_credential card with skipped resolved value', () => {
		const result = rebuildInteractiveFromHistory({
			tool: ASK_CREDENTIAL_TOOL_NAME,
			toolCallId: 'call-2',
			input: { purpose: 'slack', credentialType: 'slackApi' },
			output: { skipped: true },
			state: 'done',
		});

		expect(result?.toolName).toBe(ASK_CREDENTIAL_TOOL_NAME);
		expect(result?.resolvedValue).toEqual({ skipped: true });
	});

	it('returns undefined for non-interactive tool names', () => {
		const result = rebuildInteractiveFromHistory({
			tool: 'write_config',
			toolCallId: 'call-3',
			input: { json: '{}' },
			state: 'done',
		});
		expect(result).toBeUndefined();
	});

	it('rebuilds an OPEN approval card from an approval suspend payload', () => {
		const result = rebuildInteractiveFromHistory({
			tool: 'calculator',
			toolCallId: 'call-approval-1',
			input: {
				type: 'approval',
				toolName: 'calculator',
				displayName: 'Calculator',
				args: { input: '2 + 2' },
			},
			state: 'suspended',
		});

		expect(result).toBeTruthy();
		expect(result?.toolName).toBe(APPROVAL_TOOL_NAME);
		expect(result?.input).toEqual({
			type: 'approval',
			toolName: 'calculator',
			displayName: 'Calculator',
			args: { input: '2 + 2' },
		});
		expect(result?.resolvedAt).toBeUndefined();
		expect(result?.resolvedValue).toBeUndefined();
	});

	it('rebuilds a rejected approval card from a declined tool result', () => {
		const result = rebuildInteractiveFromHistory({
			tool: 'calculator',
			toolCallId: 'call-approval-2',
			input: {
				type: 'approval',
				toolName: 'calculator',
				args: { input: '2 + 2' },
			},
			output: { declined: true, message: 'Tool "calculator" was not approved' },
			state: 'done',
		});

		expect(result?.toolName).toBe(APPROVAL_TOOL_NAME);
		expect(result?.resolvedAt).toBeDefined();
		expect(result?.resolvedValue).toEqual({ approved: false });
	});
});

describe('convertDbMessages — interactive turn synthesis', () => {
	it('reconstructs an OPEN interactive card when tool-call block has state:pending', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm1',
				role: 'user',
				content: [{ type: 'text', text: 'Build me an agent' }],
			},
			{
				id: 'm2',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: ASK_QUESTIONS_TOOL_NAME,
						toolCallId: 'call-q-1',
						input: {
							questions: [{ id: 'q1', question: 'Which model?', type: 'text' }],
						},
						state: 'pending',
					},
				],
			},
		];

		const chat = convertDbMessages(dbMessages);
		expect(chat).toHaveLength(2);
		const assistant = chat[1];
		expect(assistant.role).toBe('assistant');
		expect(assistant.status).toBe('awaitingUser');
		expect(assistant.interactive?.toolName).toBe(ASK_QUESTIONS_TOOL_NAME);
		expect(assistant.interactive?.resolvedAt).toBeUndefined();
		expect(assistant.toolCalls?.[0].state).toBe('suspended');
	});

	it('reconstructs a RESOLVED interactive card when tool-call block has state:resolved', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm1',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: ASK_QUESTIONS_TOOL_NAME,
						toolCallId: 'q-1',
						input: {
							questions: [
								{
									id: 'q1',
									question: 'Where to post?',
									type: 'single',
									options: ['Slack', 'Discord'],
								},
							],
						},
						state: 'resolved',
						output: { answered: true, answers: [{ questionId: 'q1', selectedOptions: ['Slack'] }] },
					},
				],
			},
		];

		const chat = convertDbMessages(dbMessages);
		expect(chat).toHaveLength(1);
		const assistant = chat[0];
		expect(assistant.toolCalls?.[0].state).toBe('done');
		expect(assistant.toolCalls?.[0].output).toEqual({
			answered: true,
			answers: [{ questionId: 'q1', selectedOptions: ['Slack'] }],
		});
		expect(assistant.interactive?.toolName).toBe(ASK_QUESTIONS_TOOL_NAME);
		expect(assistant.interactive?.resolvedAt).toBeDefined();
		expect(assistant.interactive?.resolvedValue).toEqual({
			answered: true,
			answers: [{ questionId: 'q1', selectedOptions: ['Slack'] }],
		});
	});

	it('preserves multiple resolved n8n chat cards from one persisted assistant message', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm1',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: N8N_CHAT_ACTION_TOOL_NAME,
						toolCallId: 'card-1',
						input: {
							action: 'respond',
							input: {
								message: {
									card: {
										title: 'First card',
										components: [{ type: 'fields', fields: [{ label: 'Status', value: 'Ready' }] }],
									},
								},
							},
						},
						state: 'resolved',
						output: { ok: true },
					},
					{
						type: 'tool-call',
						toolName: N8N_CHAT_ACTION_TOOL_NAME,
						toolCallId: 'card-2',
						input: {
							action: 'respond',
							input: {
								message: {
									card: {
										title: 'Second card',
										components: [{ type: 'fields', fields: [{ label: 'Owner', value: 'Sales' }] }],
									},
								},
							},
						},
						state: 'resolved',
						output: { ok: true },
					},
				],
			},
		];

		const chat = convertDbMessages(dbMessages);
		const assistant = chat[0];

		expect(assistant.toolCalls).toHaveLength(2);
		expect(assistant.interactives).toHaveLength(2);
		expect(assistant.interactives?.map((payload) => payload.toolCallId)).toEqual([
			'card-1',
			'card-2',
		]);
	});

	it('preserves text and n8n chat card render order from persisted content', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm1',
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Before the card.' },
					{
						type: 'tool-call',
						toolName: N8N_CHAT_ACTION_TOOL_NAME,
						toolCallId: 'card-1',
						input: {
							action: 'respond',
							input: {
								message: {
									card: {
										title: 'Account snapshot',
										components: [{ type: 'fields', fields: [{ label: 'ARR', value: '$1m' }] }],
									},
								},
							},
						},
						state: 'resolved',
						output: { ok: true },
					},
					{ type: 'text', text: 'After the card.' },
				],
			},
		];

		const [assistant] = convertDbMessages(dbMessages);

		expect(assistant.content).toBe('Before the card.After the card.');
		expect(assistant.renderParts).toEqual([
			{ type: 'text', text: 'Before the card.' },
			{ type: 'interactive', toolCallId: 'card-1' },
			{ type: 'text', text: 'After the card.' },
		]);
	});

	it('sets state:error when tool-call block is rejected', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm1',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'delete_file',
						toolCallId: 'tc-1',
						input: { path: '/tmp/foo.txt' },
						state: 'rejected',
						error: 'Error: permission denied',
					},
				],
			},
		];

		const chat = convertDbMessages(dbMessages);
		expect(chat).toHaveLength(1);
		const tc = chat[0].toolCalls?.[0];
		expect(tc?.state).toBe('error');
		expect(tc?.output).toBe('Error: permission denied');
	});

	it('treats state:resolved non-interactive tool call as done with output', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm1',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'search_nodes',
						toolCallId: 'tc-2',
						input: { query: 'Slack' },
						state: 'resolved',
						output: [{ name: 'Slack' }],
					},
				],
			},
		];

		const chat = convertDbMessages(dbMessages);
		expect(chat).toHaveLength(1);
		const tc = chat[0].toolCalls?.[0];
		expect(tc?.state).toBe('done');
		expect(tc?.output).toEqual([{ name: 'Slack' }]);
	});

	it('treats cancelled resolved tool calls as cancelled', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm1',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'delete_file',
						toolCallId: 'tc-cancel',
						input: { path: '/tmp/foo.txt' },
						state: 'resolved',
						output: 'The sibling tool call was skipped',
						canceled: true,
					} as AgentPersistedMessageContentPart,
				],
			},
		];

		const chat = convertDbMessages(dbMessages);
		expect(chat).toHaveLength(1);
		const tc = chat[0].toolCalls?.[0];
		expect(tc?.state).toBe('cancelled');
		expect(tc?.output).toBe('The sibling tool call was skipped');
		expect(tc?.canceled).toBe(true);
	});

	it('renders a resolved-but-failed delegate_subagent call as an error', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm1',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'delegate_subagent',
						toolCallId: 'tc-d',
						input: { subAgentId: 'inline', taskName: 'research' },
						state: 'resolved',
						output: { status: 'failed', answer: '', error: 'child failed' },
					},
				],
			},
		];

		const chat = convertDbMessages(dbMessages);
		const tc = chat[0].toolCalls?.[0];
		expect(tc?.state).toBe('error');
		expect(tc?.output).toEqual({ status: 'failed', answer: '', error: 'child failed' });
	});

	it('renders a resolved-and-completed delegate_subagent call as done', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm1',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'delegate_subagent',
						toolCallId: 'tc-d2',
						input: { subAgentId: 'inline' },
						state: 'resolved',
						output: { status: 'completed', answer: 'all good' },
					},
				],
			},
		];

		const chat = convertDbMessages(dbMessages);
		const tc = chat[0].toolCalls?.[0];
		expect(tc?.state).toBe('done');
	});

	it('leaves delegate difficulty summary for render-time i18n on reload', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm1',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'delegate_subagent',
						toolCallId: 'tc-d3',
						input: { subAgentId: 'inline', taskName: 'research_api', difficulty: 'high' },
						state: 'resolved',
						output: {
							status: 'completed',
							answer: 'all good',
							model: 'anthropic/claude-haiku-4-5',
						},
					},
				],
			},
		];

		const chat = convertDbMessages(dbMessages);
		expect(chat[0].toolCalls?.[0].displaySummary).toBeUndefined();
		expect(chat[0].toolCalls?.[0].input).toEqual({
			subAgentId: 'inline',
			taskName: 'research_api',
			difficulty: 'high',
		});
	});
});

describe('isGroupable', () => {
	it('groups interactive messages alongside other tool-only messages', () => {
		const groupable = isGroupable({
			id: 'm1',
			role: 'assistant',
			content: '',
			toolCalls: [{ tool: ASK_QUESTIONS_TOOL_NAME, toolCallId: 'c1', state: 'suspended' }],
			interactive: {
				toolName: ASK_QUESTIONS_TOOL_NAME,
				toolCallId: 'c1',
				input: questionsSuspendInput('Which model?'),
			},
			status: 'awaitingUser',
		});
		expect(groupable).toBe(true);
	});

	it('groups tool-only assistant messages without interactive payload', () => {
		const groupable = isGroupable({
			id: 'm2',
			role: 'assistant',
			content: '',
			toolCalls: [{ tool: 'search_nodes', toolCallId: 'c2', state: 'done' }],
			status: 'success',
		});
		expect(groupable).toBe(true);
	});
});

describe('buildDisplayGroups — interactive payloads', () => {
	it('collects interactive payloads from each grouped message into the toolRun group', () => {
		const groups = buildDisplayGroups([
			// First grouped turn: a resolved ask_questions card
			{
				id: 'm1',
				role: 'assistant',
				content: '',
				toolCalls: [{ tool: ASK_QUESTIONS_TOOL_NAME, toolCallId: 'c1', state: 'done' }],
				interactive: {
					toolName: ASK_QUESTIONS_TOOL_NAME,
					toolCallId: 'c1',
					input: questionsSuspendInput('Which model?'),
					resolvedAt: 1,
					resolvedValue: {
						answered: true,
						answers: [{ questionId: 'q1', selectedOptions: ['gpt-4'] }],
					},
				},
				status: 'success',
			},
			// Second grouped turn: a normal tool call (no interactive)
			{
				id: 'm2',
				role: 'assistant',
				content: '',
				toolCalls: [{ tool: 'search_nodes', toolCallId: 'c2', state: 'done' }],
				status: 'success',
			},
			// Third grouped turn: an open ask_credential card
			{
				id: 'm3',
				role: 'assistant',
				content: '',
				toolCalls: [{ tool: ASK_CREDENTIAL_TOOL_NAME, toolCallId: 'c3', state: 'suspended' }],
				interactive: {
					toolName: ASK_CREDENTIAL_TOOL_NAME,
					toolCallId: 'c3',
					input: credentialSuspendInput('slackApi', 'Slack'),
				},
				status: 'awaitingUser',
			},
		]);

		expect(groups).toHaveLength(1);
		const grouped = groups[0];
		expect(grouped.kind).toBe('toolRun');
		if (grouped.kind !== 'toolRun') return;
		expect(grouped.toolCalls).toHaveLength(3);
		expect(grouped.interactives).toHaveLength(2);
		expect(grouped.interactives[0].toolName).toBe(ASK_QUESTIONS_TOOL_NAME);
		expect(grouped.interactives[0].resolvedAt).toBeDefined();
		expect(grouped.interactives[1].toolName).toBe(ASK_CREDENTIAL_TOOL_NAME);
		expect(grouped.interactives[1].resolvedAt).toBeUndefined();
	});

	it('collects multiple interactive payloads from one grouped message', () => {
		const groups = buildDisplayGroups([
			{
				id: 'm1',
				role: 'assistant',
				content: '',
				toolCalls: [
					{ tool: N8N_CHAT_ACTION_TOOL_NAME, toolCallId: 'card-1', state: 'done' },
					{ tool: N8N_CHAT_ACTION_TOOL_NAME, toolCallId: 'card-2', state: 'done' },
				],
				interactives: [
					{
						toolName: N8N_CHAT_ACTION_TOOL_NAME,
						toolCallId: 'card-1',
						input: { card: { title: 'First card', components: [] } },
						resolvedAt: 1,
					},
					{
						toolName: N8N_CHAT_ACTION_TOOL_NAME,
						toolCallId: 'card-2',
						input: { card: { title: 'Second card', components: [] } },
						resolvedAt: 1,
					},
				],
				status: 'success',
			},
		]);

		expect(groups).toHaveLength(1);
		const grouped = groups[0];
		expect(grouped.kind).toBe('toolRun');
		if (grouped.kind !== 'toolRun') return;
		expect(grouped.interactives.map((payload) => payload.toolCallId)).toEqual(['card-1', 'card-2']);
	});

	it('merges duplicate persisted tool calls by id and keeps the resolved one', () => {
		const chat = convertDbMessages([
			{
				id: 'user-1',
				role: 'user',
				content: [{ type: 'text', text: 'Can you fetch this page?' }],
			},
			{
				id: 'assistant-pending',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'notion_notion-fetch',
						toolCallId: 'toolu_1',
						input: { id: 'https://app.notion.com/p/example' },
						startTime: 1_000,
					},
				],
			},
			{
				id: 'assistant-resolved',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'notion_notion-fetch',
						toolCallId: 'toolu_1',
						state: 'resolved',
						output: { content: [{ type: 'text', text: 'Page contents' }] },
						startTime: 2_000,
						endTime: 2_000,
					},
					{ type: 'text', text: 'Here is the page I fetched.' },
				],
			},
		]);

		const groups = buildDisplayGroups(chat);

		expect(groups).toHaveLength(2);
		const toolRun = groups[1];
		expect(toolRun.kind).toBe('toolRun');
		if (toolRun.kind !== 'toolRun') return;
		expect(toolRun.toolCalls).toHaveLength(1);
		expect(toolRun.toolCalls[0]).toEqual(
			expect.objectContaining({
				tool: 'notion_notion-fetch',
				toolCallId: 'toolu_1',
				state: 'done',
				input: { id: 'https://app.notion.com/p/example' },
				output: { content: [{ type: 'text', text: 'Page contents' }] },
				startTime: 1_000,
				endTime: 2_000,
			}),
		);
		expect(toolRun.finalMessage?.content).toBe('Here is the page I fetched.');
	});
});

describe('applyOpenSuspensions', () => {
	it('stamps the runId onto a matching open interactive card', () => {
		const chat: ChatMessage[] = [
			{
				id: 'm1',
				role: 'assistant',
				content: '',
				toolCalls: [{ tool: ASK_CREDENTIAL_TOOL_NAME, toolCallId: 'c-open', state: 'suspended' }],
				interactive: {
					toolName: ASK_CREDENTIAL_TOOL_NAME,
					toolCallId: 'c-open',
					input: credentialSuspendInput('slackApi', 'Slack'),
				},
				status: 'awaitingUser',
			},
			{
				id: 'm2',
				role: 'assistant',
				content: '',
				toolCalls: [{ tool: ASK_QUESTIONS_TOOL_NAME, toolCallId: 'c-resolved', state: 'done' }],
				interactive: {
					toolName: ASK_QUESTIONS_TOOL_NAME,
					toolCallId: 'c-resolved',
					input: questionsSuspendInput('Which model?'),
					resolvedAt: 1,
					resolvedValue: {
						answered: true,
						answers: [{ questionId: 'q1', selectedOptions: ['gpt-4'] }],
					},
				},
				status: 'success',
			},
		];

		const result = applyOpenSuspensions(chat, [{ toolCallId: 'c-open', runId: 'run-42' }]);

		expect(result[0].interactive?.runId).toBe('run-42');
		// Resolved card not in the suspension list — runId stays undefined.
		expect(result[1].interactive?.runId).toBeUndefined();
	});

	it('returns chat unchanged when the suspension list is empty', () => {
		const chat: ChatMessage[] = [
			{
				id: 'm1',
				role: 'assistant',
				content: '',
				interactive: {
					toolName: ASK_QUESTIONS_TOOL_NAME,
					toolCallId: 'c1',
					input: questionsSuspendInput('Which model?'),
				},
			},
		];
		const result = applyOpenSuspensions(chat, []);
		expect(result).toBe(chat);
		expect(result[0].interactive?.runId).toBeUndefined();
	});

	it('ignores suspensions that do not match any interactive card', () => {
		const chat: ChatMessage[] = [
			{
				id: 'm1',
				role: 'assistant',
				content: '',
				interactive: {
					toolName: ASK_QUESTIONS_TOOL_NAME,
					toolCallId: 'c1',
					input: questionsSuspendInput('Which model?'),
				},
			},
		];
		applyOpenSuspensions(chat, [{ toolCallId: 'unknown', runId: 'run-x' }]);
		expect(chat[0].interactive?.runId).toBeUndefined();
	});
});
