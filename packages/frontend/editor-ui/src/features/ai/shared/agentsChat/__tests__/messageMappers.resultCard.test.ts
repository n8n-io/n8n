import { N8N_CHAT_ACTION_TOOL_NAME } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import { N8N_CHAT_RESULT_CARD_INTERACTION, TOOL_CALL_STATE } from '../constants';
import { rebuildInteractiveFromHistory } from '../messageMappers';
import { parseN8nChatResultCardInput } from '../n8nChatInteraction';
import type { ToolCall } from '../types';

const metricCard = {
	type: 'metric',
	title: 'Open pipeline',
	value: '161.9k',
	label: 'open pipeline',
	tone: 'terracotta',
	delta: { value: '+3.9k', direction: 'up', label: 'vs last week' },
};

const showCardInput = { action: 'show_card', input: { card: metricCard } };

function toolCall(overrides: Partial<ToolCall> = {}): ToolCall {
	return {
		tool: N8N_CHAT_ACTION_TOOL_NAME,
		toolCallId: 'tc-1',
		input: showCardInput,
		state: TOOL_CALL_STATE.DONE,
		...overrides,
	};
}

describe('parseN8nChatResultCardInput', () => {
	it('parses a show_card tool input into its result card', () => {
		expect(parseN8nChatResultCardInput(showCardInput)).toEqual({ card: metricCard });
	});

	it('rejects a respond (rich card) input and malformed cards', () => {
		expect(
			parseN8nChatResultCardInput({
				action: 'respond',
				input: { message: { card: { components: [{ type: 'divider' }] } } },
			}),
		).toBeUndefined();
		expect(
			parseN8nChatResultCardInput({ action: 'show_card', input: { card: { type: 'metric' } } }),
		).toBeUndefined();
	});
});

describe('rebuildInteractiveFromHistory · result cards', () => {
	it('renders a settled show_card call as an always-resolved result card', () => {
		const rebuilt = rebuildInteractiveFromHistory(
			toolCall({ output: { ok: true, rendered: { type: 'metric', title: 'Open pipeline' } } }),
		);
		expect(rebuilt).toEqual({
			toolCallId: 'tc-1',
			resolvedAt: 1,
			toolName: N8N_CHAT_RESULT_CARD_INTERACTION,
			input: { card: metricCard },
		});
	});

	it('does not render a card while the call is still running or when it errored', () => {
		expect(rebuildInteractiveFromHistory(toolCall({ state: TOOL_CALL_STATE.RUNNING }))).toBeUndefined();
		expect(
			rebuildInteractiveFromHistory(
				toolCall({ state: TOOL_CALL_STATE.ERROR, output: 'Card validation failed' }),
			),
		).toBeUndefined();
	});
});
