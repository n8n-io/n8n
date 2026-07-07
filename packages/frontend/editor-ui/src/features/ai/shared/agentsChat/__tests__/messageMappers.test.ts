import { describe, expect, it } from 'vitest';
import {
	ASK_LLM_TOOL_NAME,
	ASK_QUESTION_TOOL_NAME,
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
						toolName: ASK_LLM_TOOL_NAME,
						toolCallId: 'call-1',
						input: { purpose: 'main model' },
						state: 'pending',
					},
				],
			},
		];

		const chat = convertDbMessages(dbMessages);

		expect(chat[0].status).toBe('awaitingUser');
		expect(chat[0].interactive?.toolName).toBe(ASK_LLM_TOOL_NAME);
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
						toolName: ASK_QUESTION_TOOL_NAME,
						toolCallId: 'question-1',
						input: { question: 'Pick one', options: [{ label: 'A', value: 'a' }] },
						state: 'pending',
					},
				],
			},
		]);

		applyOpenSuspensions(chat, [{ toolCallId: 'question-1', runId: 'run-1' }]);

		expect(chat[0].interactive?.runId).toBe('run-1');
	});

	it('rebuilds resolved ask_question cards from tool output', () => {
		const result = rebuildInteractiveFromHistory({
			tool: ASK_QUESTION_TOOL_NAME,
			toolCallId: 'question-2',
			input: { question: 'Pick one', options: [{ label: 'A', value: 'a' }] },
			output: { values: ['a'] },
			state: 'done',
		});

		expect(result?.resolvedAt).toBeDefined();
		expect(result?.resolvedValue).toEqual({ values: ['a'] });
	});
});
