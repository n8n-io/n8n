import { describe, expect, it } from 'vitest';
import { ASK_QUESTIONS_TOOL_NAME, type AgentPersistedMessageDto } from '@n8n/api-types';

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
});
