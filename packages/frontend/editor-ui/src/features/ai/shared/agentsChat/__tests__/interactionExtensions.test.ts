import { describe, expect, it } from 'vitest';
import {
	APPROVAL_TOOL_NAME,
	N8N_CHAT_ACTION_TOOL_NAME,
	WAIT_TOOL_NAME,
	WORKFLOW_WAIT_SUSPEND_TYPE,
	type AgentPersistedMessageContentPart,
	type AgentPersistedMessageDto,
} from '@n8n/api-types';

import { INTERACTION_EXTENSION_TOOL_NAME, TOOL_CALL_STATE } from '../constants';
import type { AgentsChatInteractionExtension } from '../interactionRegistry';
import {
	applyOpenSuspensions,
	convertDbMessages,
	rebuildInteractiveFromHistory,
} from '../messageMappers';
import {
	TEST_EXTENSION_KEY,
	testCardSuspendPayload,
	testInteractionExtensions,
} from './fixtures/testInteractionExtension';

const suspendedToolCall = {
	tool: 'ask_host',
	toolCallId: 'tc-1',
	state: TOOL_CALL_STATE.SUSPENDED,
	suspendPayload: testCardSuspendPayload,
};

function persistedTestCard(
	part: Partial<AgentPersistedMessageContentPart> = {},
): AgentPersistedMessageDto[] {
	return [
		{
			id: 'm1',
			role: 'assistant',
			content: [
				{
					type: 'tool-call',
					toolName: 'ask_host',
					toolCallId: 'tc-1',
					input: {},
					suspendPayload: testCardSuspendPayload,
					...part,
				},
			],
		},
	];
}

describe('rebuildInteractiveFromHistory — interaction extensions', () => {
	it('builds an open extension card from the suspend payload', () => {
		expect(rebuildInteractiveFromHistory(suspendedToolCall, testInteractionExtensions)).toEqual({
			toolCallId: 'tc-1',
			toolName: INTERACTION_EXTENSION_TOOL_NAME,
			extensionKey: TEST_EXTENSION_KEY,
			input: { question: 'Continue?', tool: 'ask_host' },
		});
	});

	it('marks the card resolved without a resolved value', () => {
		const interactive = rebuildInteractiveFromHistory(
			{ ...suspendedToolCall, state: TOOL_CALL_STATE.DONE, output: { answer: 'yes' } },
			testInteractionExtensions,
		);

		expect(interactive).toMatchObject({ resolvedAt: 1, extensionKey: TEST_EXTENSION_KEY });
		expect(interactive).not.toHaveProperty('resolvedValue');
	});

	it('marks a canceled card as cancelled without a resolved value', () => {
		const interactive = rebuildInteractiveFromHistory(
			{ ...suspendedToolCall, state: TOOL_CALL_STATE.CANCELLED, output: {}, canceled: true },
			testInteractionExtensions,
		);

		expect(interactive).toMatchObject({ resolvedAt: 1, cancelled: true });
		expect(interactive).not.toHaveProperty('resolvedValue');
	});

	it('does not map the payload without the extension', () => {
		expect(rebuildInteractiveFromHistory(suspendedToolCall)).toBeUndefined();
	});

	it('ignores an extension without card fields', () => {
		const withoutCard: AgentsChatInteractionExtension = { key: 'no_card' };

		expect(rebuildInteractiveFromHistory(suspendedToolCall, [withoutCard])).toBeUndefined();
		expect(
			rebuildInteractiveFromHistory(suspendedToolCall, [withoutCard, ...testInteractionExtensions]),
		).toMatchObject({ extensionKey: TEST_EXTENSION_KEY });
	});

	it('still prefers the generic approval card for approval payloads', () => {
		const interactive = rebuildInteractiveFromHistory(
			{
				...suspendedToolCall,
				suspendPayload: {
					type: 'approval',
					toolName: 'ask_host',
					args: {},
					...testCardSuspendPayload,
				},
			},
			testInteractionExtensions,
		);

		expect(interactive?.toolName).toBe(APPROVAL_TOOL_NAME);
	});
});

describe('rebuildInteractiveFromHistory — built-in cards win over extensions', () => {
	// An extension whose parse accepts every tool call.
	const catchAllExtensions: readonly AgentsChatInteractionExtension[] = [
		{ key: 'catch_all', parse: () => ({}) },
	];

	it('keeps the approval card', () => {
		const interactive = rebuildInteractiveFromHistory(
			{
				...suspendedToolCall,
				suspendPayload: { type: 'approval', toolName: 'ask_host', args: {} },
			},
			catchAllExtensions,
		);

		expect(interactive?.toolName).toBe(APPROVAL_TOOL_NAME);
	});

	it('keeps the Wait node card', () => {
		const interactive = rebuildInteractiveFromHistory(
			{
				...suspendedToolCall,
				tool: 'my_workflow',
				suspendPayload: {
					type: WORKFLOW_WAIT_SUSPEND_TYPE,
					title: 'Waiting',
					components: [{ type: 'button', label: 'Continue', value: 'continue' }],
				},
			},
			catchAllExtensions,
		);

		expect(interactive?.toolName).toBe(WAIT_TOOL_NAME);
	});

	it('keeps the chat_action card', () => {
		const interactive = rebuildInteractiveFromHistory(
			{
				...suspendedToolCall,
				tool: N8N_CHAT_ACTION_TOOL_NAME,
				suspendPayload: undefined,
				input: {
					action: 'respond',
					input: {
						message: {
							card: {
								title: 'Choose',
								components: [{ type: 'button', label: 'Yes', value: 'yes' }],
							},
						},
					},
				},
			},
			catchAllExtensions,
		);

		expect(interactive?.toolName).toBe(N8N_CHAT_ACTION_TOOL_NAME);
	});

	it('does not map a chat_action call that has no built-in card', () => {
		expect(
			rebuildInteractiveFromHistory(
				{ ...suspendedToolCall, tool: N8N_CHAT_ACTION_TOOL_NAME, input: { action: 'unknown' } },
				catchAllExtensions,
			),
		).toBeUndefined();
	});

	it('maps other tool calls to the extension card', () => {
		expect(rebuildInteractiveFromHistory(suspendedToolCall, catchAllExtensions)).toMatchObject({
			toolName: INTERACTION_EXTENSION_TOOL_NAME,
			extensionKey: 'catch_all',
		});
	});
});

describe('convertDbMessages — interaction extensions', () => {
	it('restores an open extension card from history', () => {
		const [message] = convertDbMessages(persistedTestCard(), testInteractionExtensions);

		expect(message.status).toBe('awaitingUser');
		expect(message.toolCalls?.[0].state).toBe(TOOL_CALL_STATE.SUSPENDED);
		expect(message.interactive).toMatchObject({
			toolName: INTERACTION_EXTENSION_TOOL_NAME,
			extensionKey: TEST_EXTENSION_KEY,
		});
		expect(message.renderParts).toEqual([{ type: 'interactive', toolCallId: 'tc-1' }]);
	});

	it('restores a resolved extension card from history', () => {
		const [message] = convertDbMessages(
			persistedTestCard({ state: 'resolved', output: { answer: 'yes' } }),
			testInteractionExtensions,
		);

		expect(message.status).toBeUndefined();
		expect(message.interactive).toMatchObject({ resolvedAt: 1, extensionKey: TEST_EXTENSION_KEY });
		expect(message.interactive).not.toHaveProperty('resolvedValue');
	});

	it('does not map the payload in a chat without the extension', () => {
		const [message] = convertDbMessages(persistedTestCard());

		expect(message.status).toBeUndefined();
		expect(message.interactive).toBeUndefined();
		expect(message.interactives).toBeUndefined();
		expect(message.toolCalls?.[0].state).toBe(TOOL_CALL_STATE.RUNNING);
	});
});

describe('applyOpenSuspensions — interaction extensions', () => {
	it('attaches the run id of an open suspension to the extension card', () => {
		const [message] = applyOpenSuspensions(
			convertDbMessages(
				persistedTestCard({ suspendPayload: undefined }),
				testInteractionExtensions,
			),
			[{ toolCallId: 'tc-1', runId: 'run-1', suspendPayload: testCardSuspendPayload }],
			testInteractionExtensions,
		);

		expect(message.toolCalls?.[0]).toMatchObject({ state: 'suspended', runId: 'run-1' });
		expect(message.interactive).toMatchObject({
			toolName: INTERACTION_EXTENSION_TOOL_NAME,
			extensionKey: TEST_EXTENSION_KEY,
			runId: 'run-1',
		});
	});

	it('does not map the suspension in a chat without the extension', () => {
		const [message] = applyOpenSuspensions(
			convertDbMessages(persistedTestCard({ suspendPayload: undefined })),
			[{ toolCallId: 'tc-1', runId: 'run-1', suspendPayload: testCardSuspendPayload }],
		);

		expect(message.toolCalls?.[0]).toMatchObject({ state: 'suspended', runId: 'run-1' });
		expect(message.interactive).toBeUndefined();
	});
});
