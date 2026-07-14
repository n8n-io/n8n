import { describe, expect, it } from 'vitest';
import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_QUESTIONS_TOOL_NAME,
	CONFIGURE_CHANNEL_TOOL_NAME,
	type AgentPersistedMessageDto,
} from '@n8n/api-types';

import {
	applyOpenSuspensions,
	convertDbMessages,
	rebuildInteractiveFromHistory,
} from '../messageMappers';

describe('shared agents chat message mapping', () => {
	it('reconstructs an open interactive card from persisted pending tool calls', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm1',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: ASK_QUESTIONS_TOOL_NAME,
						toolCallId: 'call-1',
						input: { questions: [{ question: 'Which model?', type: 'text' }] },
						state: 'pending',
					},
				],
			},
		];

		const chat = convertDbMessages(dbMessages);

		expect(chat[0].status).toBe('awaitingUser');
		expect(chat[0].interactive?.toolName).toBe(ASK_QUESTIONS_TOOL_NAME);
		expect(chat[0].toolCalls?.[0].state).toBe('suspended');
	});

	it('reattaches run ids from open suspension sidecars', () => {
		const chat = convertDbMessages([
			{
				id: 'm1',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: ASK_QUESTIONS_TOOL_NAME,
						toolCallId: 'question-1',
						// Persisted history only ever carries the tool's original call
						// args, never the (transient, SSE-only) suspend payload —
						// `rebuildInteractiveFromHistory` synthesizes the rest.
						input: { questions: [{ question: 'Pick one', type: 'single', options: ['a'] }] },
						state: 'pending',
					},
				],
			},
		]);

		applyOpenSuspensions(chat, [{ toolCallId: 'question-1', runId: 'run-1' }]);

		expect(chat[0].interactive?.runId).toBe('run-1');
	});

	it('rebuilds resolved ask_questions cards from tool output', () => {
		const result = rebuildInteractiveFromHistory({
			tool: ASK_QUESTIONS_TOOL_NAME,
			toolCallId: 'question-2',
			input: { questions: [{ id: 'q1', question: 'Pick one', type: 'single', options: ['a'] }] },
			output: { answered: true, answers: [{ questionId: 'q1', selectedOptions: ['a'] }] },
			state: 'done',
		});

		expect(result?.resolvedAt).toBeDefined();
		expect(result?.resolvedValue).toEqual({
			answered: true,
			answers: [{ questionId: 'q1', selectedOptions: ['a'] }],
		});
	});

	it('reconstructs an open ask_credential card from raw tool args', () => {
		const result = rebuildInteractiveFromHistory({
			tool: ASK_CREDENTIAL_TOOL_NAME,
			toolCallId: 'cred-1',
			input: { purpose: 'Slack access', credentialType: 'slackApi' },
			state: 'pending',
		});
		if (result?.toolName !== ASK_CREDENTIAL_TOOL_NAME) throw new Error('expected ask_credential');

		expect(result.input.message).toBe('Slack access');
		expect(result.input.credentialRequests[0].credentialType).toBe('slackApi');
		expect(result.input.credentialRequests[0].existingCredentials).toEqual([]);
		expect(result.resolvedAt).toBeUndefined();
	});

	it('reconstructs a resolved ask_credential card', () => {
		const resolved = rebuildInteractiveFromHistory({
			tool: ASK_CREDENTIAL_TOOL_NAME,
			toolCallId: 'cred-2',
			input: { purpose: 'Slack access', credentialType: 'slackApi' },
			output: { credentialId: 'c1', credentialName: 'My Slack' },
			state: 'done',
		});
		expect(resolved?.resolvedAt).toBeDefined();
		expect(resolved?.resolvedValue).toMatchObject({ credentialName: 'My Slack' });

		const skipped = rebuildInteractiveFromHistory({
			tool: ASK_CREDENTIAL_TOOL_NAME,
			toolCallId: 'cred-3',
			input: { purpose: 'Slack access', credentialType: 'slackApi' },
			output: { skipped: true },
			state: 'done',
		});
		expect(skipped?.resolvedValue).toEqual({ skipped: true });
	});

	it('reconstructs an open configure_channel card only when ambient context is supplied', () => {
		const withContext = rebuildInteractiveFromHistory(
			{
				tool: CONFIGURE_CHANNEL_TOOL_NAME,
				toolCallId: 'channel-1',
				input: { integrationType: 'slack' },
				state: 'pending',
			},
			{ agentId: 'a1', projectId: 'p1' },
		);
		if (withContext?.toolName !== CONFIGURE_CHANNEL_TOOL_NAME) {
			throw new Error('expected configure_channel');
		}
		expect(withContext.input.channelConfig).toEqual({ integrationType: 'slack', agentId: 'a1' });
		expect(withContext.input.projectId).toBe('p1');

		const withoutContext = rebuildInteractiveFromHistory({
			tool: CONFIGURE_CHANNEL_TOOL_NAME,
			toolCallId: 'channel-2',
			input: { integrationType: 'slack' },
			state: 'pending',
		});
		expect(withoutContext).toBeUndefined();
	});

	it('parses both configure_channel resolved output shapes', () => {
		const connected = rebuildInteractiveFromHistory(
			{
				tool: CONFIGURE_CHANNEL_TOOL_NAME,
				toolCallId: 'channel-3',
				input: { integrationType: 'slack' },
				output: { connected: true },
				state: 'done',
			},
			{ agentId: 'a1', projectId: 'p1' },
		);
		expect(connected?.resolvedValue).toEqual({ connected: true });

		const approved = rebuildInteractiveFromHistory(
			{
				tool: CONFIGURE_CHANNEL_TOOL_NAME,
				toolCallId: 'channel-4',
				input: { integrationType: 'slack' },
				output: { approved: false },
				state: 'done',
			},
			{ agentId: 'a1', projectId: 'p1' },
		);
		expect(approved?.resolvedValue).toEqual({ approved: false });
	});
});
