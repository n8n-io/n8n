import { APPROVAL_TOOL_NAME } from '@n8n/api-types';

import { rebuildInteractiveFromHistory } from '@/features/ai/shared/agentsChat/messageMappers';
import {
	INTERACTION_EXTENSION_TOOL_NAME,
	TOOL_CALL_STATE,
} from '@/features/ai/shared/agentsChat/constants';
import {
	ASSISTANT_CONFIRMATION_KEY,
	assistantConfirmationExtension,
	getAssistantConfirmationInput,
	parseAssistantConfirmationInput,
} from '../assistantConfirmation';

const extensions = [assistantConfirmationExtension];

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

describe('assistantConfirmationExtension', () => {
	it('builds an open card from the suspend payload', () => {
		const interactive = rebuildInteractiveFromHistory(
			{
				tool: 'ask-user',
				toolCallId: 'tc-1',
				state: TOOL_CALL_STATE.SUSPENDED,
				suspendPayload: questionsPayload,
			},
			extensions,
		);

		expect(interactive).toMatchObject({
			toolName: INTERACTION_EXTENSION_TOOL_NAME,
			extensionKey: ASSISTANT_CONFIRMATION_KEY,
			toolCallId: 'tc-1',
			input: { requestId: 'req-1', inputType: 'questions' },
		});
		expect(interactive?.resolvedAt).toBeUndefined();
		expect(interactive && getAssistantConfirmationInput(interactive)?.inputType).toBe('questions');
	});

	it('marks the card resolved with the resume body as value', () => {
		const output = { kind: 'approval', approved: true };
		const interactive = rebuildInteractiveFromHistory(
			{
				tool: 'ask-user',
				toolCallId: 'tc-1',
				state: TOOL_CALL_STATE.DONE,
				suspendPayload: questionsPayload,
				output,
			},
			extensions,
		);

		expect(interactive).toMatchObject({ resolvedAt: 1, resolvedValue: output });
	});

	it('still prefers the generic approval card for approval payloads', () => {
		const interactive = rebuildInteractiveFromHistory(
			{
				tool: 'some_tool',
				toolCallId: 'tc-2',
				state: TOOL_CALL_STATE.SUSPENDED,
				suspendPayload: { type: 'approval', toolName: 'some_tool', args: {} },
			},
			extensions,
		);

		expect(interactive?.toolName).toBe(APPROVAL_TOOL_NAME);
	});

	it('adds the tool name and arguments from the tool call', () => {
		const { toolName: _tool, args: _args, ...payloadWithoutTool } = questionsPayload;
		const interactive = rebuildInteractiveFromHistory(
			{
				tool: 'workflows',
				toolCallId: 'tc-3',
				state: TOOL_CALL_STATE.SUSPENDED,
				input: { action: 'run', workflowId: 'wf-1' },
				suspendPayload: payloadWithoutTool,
			},
			extensions,
		);

		expect(interactive?.input).toMatchObject({
			toolName: 'workflows',
			args: { action: 'run', workflowId: 'wf-1' },
		});
	});

	it('is not mapped by a chat without the extension', () => {
		const interactive = rebuildInteractiveFromHistory({
			tool: 'ask-user',
			toolCallId: 'tc-1',
			state: TOOL_CALL_STATE.SUSPENDED,
			suspendPayload: questionsPayload,
		});

		expect(interactive).toBeUndefined();
	});
});
