import { describe, expect, it } from 'vitest';
import { N8N_CHAT_ACTION_TOOL_NAME, type AgentPersistedMessageDto } from '@n8n/api-types';

import {
	isAwaitingCard,
	parseIntegrationActionCard,
	parseN8nChatActionInput,
} from '../n8nChatInteraction';
import { convertDbMessages, rebuildInteractiveFromHistory } from '../messageMappers';

const cardInput = {
	action: 'respond',
	input: {
		message: {
			text: 'Pick one',
			card: {
				title: 'Choose',
				components: [
					{ type: 'section', text: 'Options below' },
					{ type: 'button', label: 'Yes', value: 'yes' },
					{ type: 'button', label: 'No', value: 'no' },
				],
			},
		},
	},
};

describe('parseN8nChatActionInput', () => {
	it('parses a respond card input', () => {
		const parsed = parseN8nChatActionInput(cardInput);
		expect(parsed?.card.title).toBe('Choose');
		expect(parsed?.card.components).toHaveLength(3);
	});

	it('rejects malformed input', () => {
		expect(parseN8nChatActionInput({ action: 'respond' })).toBeUndefined();
		expect(parseN8nChatActionInput(null)).toBeUndefined();
		expect(
			parseN8nChatActionInput({ action: 'respond', input: { message: { text: 'plain' } } }),
		).toBeUndefined();
	});
});

describe('parseIntegrationActionCard', () => {
	it('parses any platform action verb carrying a card', () => {
		const sendDm = {
			action: 'send_dm',
			input: {
				userId: 'U123',
				message: { card: { components: [{ type: 'section', text: 'Hello' }] } },
			},
		};
		expect(parseIntegrationActionCard(sendDm)?.card.components).toHaveLength(1);
	});

	it('rejects batch inputs and card-less actions', () => {
		expect(
			parseIntegrationActionCard({ actions: [{ action: 'respond', input: { message: {} } }] }),
		).toBeUndefined();
		expect(
			parseIntegrationActionCard({ action: 'add_reaction', input: { emoji: 'tada' } }),
		).toBeUndefined();
		// Empty message objects fail the shared schema's text-or-card refine.
		expect(
			parseIntegrationActionCard({ action: 'respond', input: { message: {} } }),
		).toBeUndefined();
	});
});

describe('isAwaitingCard', () => {
	it('true for interactive components or explicit awaitResponse', () => {
		expect(isAwaitingCard({ components: [{ type: 'button', value: 'a' }] })).toBe(true);
		expect(
			isAwaitingCard({ awaitResponse: true, components: [{ type: 'section', text: 'x' }] }),
		).toBe(true);
	});

	it('false for display-only cards', () => {
		expect(
			isAwaitingCard({ components: [{ type: 'fields', fields: [{ label: 'A', value: 'B' }] }] }),
		).toBe(false);
	});
});

describe('rebuildInteractiveFromHistory — n8n_chat_action', () => {
	it('rebuilds an open awaiting card', () => {
		const result = rebuildInteractiveFromHistory({
			tool: N8N_CHAT_ACTION_TOOL_NAME,
			toolCallId: 'tc-1',
			input: cardInput,
			state: 'suspended',
		});
		expect(result?.toolName).toBe(N8N_CHAT_ACTION_TOOL_NAME);
		expect(result?.resolvedAt).toBeUndefined();
	});

	it('rebuilds a resolved card with the resume value', () => {
		const result = rebuildInteractiveFromHistory({
			tool: N8N_CHAT_ACTION_TOOL_NAME,
			toolCallId: 'tc-1',
			input: cardInput,
			output: { type: 'button', value: 'yes' },
			state: 'done',
		});
		expect(result?.resolvedAt).toBeDefined();
		expect(result?.resolvedValue).toEqual({ type: 'button', value: 'yes' });
	});

	it('does not produce an open card for display-only respond calls', () => {
		const displayOnly = {
			action: 'respond',
			input: {
				message: {
					card: { components: [{ type: 'fields', fields: [{ label: 'A', value: 'B' }] }] },
				},
			},
		};
		const result = rebuildInteractiveFromHistory({
			tool: N8N_CHAT_ACTION_TOOL_NAME,
			toolCallId: 'tc-2',
			input: displayOnly,
			state: 'running',
		});
		expect(result).toBeUndefined();
	});

	it('sets resolvedAt but leaves resolvedValue undefined when output is unparseable', () => {
		// output does not match the resume shape (type/value), so safeParse fails
		const result = rebuildInteractiveFromHistory({
			tool: N8N_CHAT_ACTION_TOOL_NAME,
			toolCallId: 'tc-3',
			input: cardInput,
			output: { ok: true },
			state: 'done',
		});
		expect(result?.resolvedAt).toBeDefined();
		expect(result?.resolvedValue).toBeUndefined();
	});
});

describe('isAwaitingCard — extended cases', () => {
	it('true for section with button accessory', () => {
		expect(
			isAwaitingCard({
				components: [{ type: 'section', text: 'x', button: { label: 'Go', value: 'go' } }],
			}),
		).toBe(true);
	});

	it('false for a plain section without a button', () => {
		expect(isAwaitingCard({ components: [{ type: 'section', text: 'info' }] })).toBe(false);
	});

	it('true when awaitResponse is false but interactive components are present', () => {
		// Backend only honours awaitResponse === true for the explicit flag;
		// interactive components dominate regardless.
		expect(
			isAwaitingCard({
				awaitResponse: false,
				components: [{ type: 'button', label: 'Go', value: 'go' }],
			}),
		).toBe(true);
	});
});

describe('convertDbMessages — open-card-preference regression', () => {
	it('prefers the open awaiting card over an earlier resolved card in the same assistant turn', () => {
		// First tool call: a resolved n8n_chat_action display card (already answered).
		// Second tool call: an open n8n_chat_action awaiting card (still pending).
		// The bug would have stopped at the first rebuilt payload and never armed
		// the second, open one as awaitingUser.
		const resolvedCardInput = {
			action: 'respond',
			input: {
				message: {
					card: {
						components: [{ type: 'button', label: 'Done', value: 'done' }],
					},
				},
			},
		};
		const openCardInput = {
			action: 'respond',
			input: {
				message: {
					card: {
						components: [{ type: 'button', label: 'Continue', value: 'continue' }],
					},
				},
			},
		};

		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm1',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: N8N_CHAT_ACTION_TOOL_NAME,
						toolCallId: 'resolved-tc',
						input: resolvedCardInput,
						output: { type: 'button', value: 'done' },
						state: 'resolved',
					},
					{
						type: 'tool-call',
						toolName: N8N_CHAT_ACTION_TOOL_NAME,
						toolCallId: 'open-tc',
						input: openCardInput,
						state: 'pending',
					},
				],
			},
		];

		const chat = convertDbMessages(dbMessages);
		const msg = chat[0];

		expect(msg.interactive?.toolCallId).toBe('open-tc');
		expect(msg.status).toBe('awaitingUser');
		// The open tool call's state must be promoted to suspended.
		const openTc = msg.toolCalls?.find((tc) => tc.toolCallId === 'open-tc');
		expect(openTc?.state).toBe('suspended');
	});
});
