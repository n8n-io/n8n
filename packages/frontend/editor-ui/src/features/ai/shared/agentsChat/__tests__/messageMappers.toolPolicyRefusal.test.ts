import type { AgentPersistedMessageDto } from '@n8n/api-types';

import { TOOL_CALL_STATE } from '../constants';
import { convertDbMessages } from '../messageMappers';

const refusalOutput = {
	status: 'policy_refused' as const,
	error: 'Blocked by policy',
	violations: [{ kind: 'node-type-unavailable', checkId: 'check-1', message: 'Not allowed' }],
	instruction: 'Ask the user to pick another tool.',
};

describe('convertDbMessages — policy-refused tool output', () => {
	it('marks a resolved tool call as errored when its output is a policy refusal', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm1',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'http_request',
						toolCallId: 'tc-refused',
						input: { url: 'https://example.com' },
						output: refusalOutput,
						state: 'resolved',
					},
				],
			},
		];

		const chat = convertDbMessages(dbMessages);

		expect(chat[0].toolCalls?.[0].state).toBe(TOOL_CALL_STATE.ERROR);
		expect(chat[0].toolCalls?.[0].output).toEqual(refusalOutput);
	});

	it('leaves a resolved tool call done when its output is not a policy refusal', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm2',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'http_request',
						toolCallId: 'tc-ok',
						input: { url: 'https://example.com' },
						output: { status: 200 },
						state: 'resolved',
					},
				],
			},
		];

		const chat = convertDbMessages(dbMessages);

		expect(chat[0].toolCalls?.[0].state).toBe(TOOL_CALL_STATE.DONE);
	});
});
