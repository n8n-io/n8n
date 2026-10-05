import { APPROVAL_TOOL_NAME } from '@n8n/api-types';

import {
	ASSISTANT_CONFIRMATION_TOOL_NAME,
	parseAssistantConfirmationInput,
} from '../assistantConfirmation';
import { rebuildInteractiveFromHistory } from '../messageMappers';
import { TOOL_CALL_STATE } from '../constants';

const questionsPayload = {
	requestId: 'req-1',
	toolCallId: 'tc-1',
	toolName: 'ask-user',
	args: {},
	severity: 'info',
	message: 'A few questions',
	inputType: 'questions',
	questions: [{ id: 'q1', question: 'Which channel?', type: 'single', options: ['a', 'b'] }],
};

describe('parseAssistantConfirmationInput', () => {
	it('parses an Assistant questions payload', () => {
		expect(parseAssistantConfirmationInput(questionsPayload)).toMatchObject({
			requestId: 'req-1',
			message: 'A few questions',
			inputType: 'questions',
			questions: [{ id: 'q1' }],
		});
	});

	it('detects a payload by a card field when inputType is absent', () => {
		expect(
			parseAssistantConfirmationInput({
				requestId: 'req-2',
				message: 'Allow access?',
				domainAccess: { url: 'https://example.com/a', host: 'example.com' },
			}),
		).toMatchObject({ requestId: 'req-2', domainAccess: { host: 'example.com' } });
	});

	it('keeps a minimal fallback when a field fails validation', () => {
		expect(
			parseAssistantConfirmationInput({
				requestId: 'req-3',
				message: 'Do it?',
				inputType: 'approval',
				severity: 42,
			}),
		).toEqual({ requestId: 'req-3', message: 'Do it?' });
	});

	it('ignores payloads of other tools', () => {
		expect(parseAssistantConfirmationInput({ type: 'approval', toolName: 'x' })).toBeUndefined();
		expect(parseAssistantConfirmationInput({ requestId: 'req-4', message: 'hi' })).toBeUndefined();
		expect(parseAssistantConfirmationInput(null)).toBeUndefined();
	});
});

describe('rebuildInteractiveFromHistory — Assistant confirmations', () => {
	it('builds an open card from the suspend payload', () => {
		const interactive = rebuildInteractiveFromHistory({
			tool: 'ask-user',
			toolCallId: 'tc-1',
			state: TOOL_CALL_STATE.SUSPENDED,
			suspendPayload: questionsPayload,
		});

		expect(interactive).toMatchObject({
			toolName: ASSISTANT_CONFIRMATION_TOOL_NAME,
			toolCallId: 'tc-1',
			input: { requestId: 'req-1', inputType: 'questions' },
		});
		expect(interactive?.resolvedAt).toBeUndefined();
	});

	it('marks the card resolved with the resume body as value', () => {
		const output = { kind: 'approval', approved: true };
		const interactive = rebuildInteractiveFromHistory({
			tool: 'ask-user',
			toolCallId: 'tc-1',
			state: TOOL_CALL_STATE.DONE,
			suspendPayload: questionsPayload,
			output,
		});

		expect(interactive).toMatchObject({ resolvedAt: 1, resolvedValue: output });
	});

	it('still prefers the generic approval card for approval payloads', () => {
		const interactive = rebuildInteractiveFromHistory({
			tool: 'some_tool',
			toolCallId: 'tc-2',
			state: TOOL_CALL_STATE.SUSPENDED,
			suspendPayload: { type: 'approval', toolName: 'some_tool', args: {} },
		});

		expect(interactive?.toolName).toBe(APPROVAL_TOOL_NAME);
	});
});
