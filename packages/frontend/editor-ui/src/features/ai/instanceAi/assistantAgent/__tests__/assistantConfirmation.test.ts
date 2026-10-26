import { APPROVAL_TOOL_NAME } from '@n8n/api-types';

import { rebuildInteractiveFromHistory } from '@/features/ai/shared/agentsChat/messageMappers';
import {
	INTERACTION_EXTENSION_TOOL_NAME,
	TOOL_CALL_STATE,
} from '@/features/ai/shared/agentsChat/constants';
import {
	ASSISTANT_CONFIRMATION_KEY,
	assistantConfirmationExtension,
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

	it('parses a payload without an inputType, such as domain access', () => {
		expect(
			parseAssistantConfirmationInput({
				requestId: 'req-2',
				message: 'Allow access?',
				severity: 'info',
				domainAccess: { url: 'https://example.com/a', host: 'example.com' },
			}),
		).toMatchObject({ requestId: 'req-2', domainAccess: { host: 'example.com' } });
	});

	it('keeps a minimal fallback, marked destructive, for a severity that it does not know', () => {
		expect(
			parseAssistantConfirmationInput({
				requestId: 'req-3',
				message: 'Do it?',
				inputType: 'approval',
				severity: 'critical',
			}),
		).toEqual({ requestId: 'req-3', message: 'Do it?', severity: 'destructive' });
	});

	it('keeps a valid severity in the fallback when another field fails validation', () => {
		expect(
			parseAssistantConfirmationInput({
				requestId: 'req-5',
				message: 'Delete it?',
				severity: 'destructive',
				questions: 'not-a-list',
			}),
		).toEqual({ requestId: 'req-5', message: 'Delete it?', severity: 'destructive' });
		expect(
			parseAssistantConfirmationInput({
				requestId: 'req-6',
				message: 'Run it?',
				severity: 'info',
				questions: 'not-a-list',
			}),
		).toEqual({ requestId: 'req-6', message: 'Run it?', severity: 'info' });
	});

	it.each([
		['a cross-target approval', { targetApproval: { toolName: 'send_email' } }],
		['a credential destination', { credentialDestination: { origin: 'not-a-list' } }],
	])('marks the fallback destructive for %s, whatever its severity says', (_name, fields) => {
		expect(
			parseAssistantConfirmationInput({
				requestId: 'req-7',
				message: 'Allow it?',
				severity: 'info',
				questions: 'not-a-list',
				...fields,
			}),
		).toEqual({ requestId: 'req-7', message: 'Allow it?', severity: 'destructive' });
	});

	it('ignores payloads of other tools', () => {
		expect(parseAssistantConfirmationInput({ type: 'approval', toolName: 'x' })).toBeUndefined();
		expect(parseAssistantConfirmationInput({ requestId: 'req-4', message: 'hi' })).toBeUndefined();
		expect(
			parseAssistantConfirmationInput({ requestId: 'req-4', message: 'hi', severity: 42 }),
		).toBeUndefined();
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
	});

	it('marks the card resolved once the tool has an output', () => {
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

		expect(interactive).toMatchObject({ resolvedAt: 1 });
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
