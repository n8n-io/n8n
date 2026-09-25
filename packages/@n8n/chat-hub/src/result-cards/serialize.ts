import {
	chatHubMessageCardsSchema,
	chatHubMessageWithButtonsSchema,
	MAX_RESULT_CARDS_PER_MESSAGE,
	resultCardSchema,
	type ChatHubMessageCards,
	type ResultCard,
} from '@n8n/api-types';

import { RESULT_CARD_COMMAND_CLOSE, RESULT_CARD_COMMAND_OPEN } from '../constants';

/** `<` is escaped so no value inside the card can terminate the command early. */
export function toCardCommand(card: ResultCard): string {
	const json = JSON.stringify(card).replace(/</g, '\\u003c');
	return `${RESULT_CARD_COMMAND_OPEN}${json}${RESULT_CARD_COMMAND_CLOSE}`;
}

/**
 * Appends result cards to a reply. A plain-text reply gets `<command:card>` commands after a
 * blank line. A whole-message JSON reply (`with-buttons` or a `cards` envelope) is parsed by the
 * client as one JSON document, so the cards are merged into its `cards` array instead — anything
 * appended after the closing brace would turn the whole reply into text.
 */
export function appendCardsToMessage(message: string | undefined, cards: ResultCard[]): string {
	const text = message ?? '';
	if (cards.length === 0) return text;

	const merged = mergeIntoWholeMessageJson(text, cards);
	if (merged !== null) return merged;

	const commands = cards.slice(0, MAX_RESULT_CARDS_PER_MESSAGE).map(toCardCommand).join('');
	return text.length > 0 ? `${text}\n\n${commands}` : commands;
}

/** Mirrors the client's `tryParseWholeMessageJson`: only what it would parse as JSON is merged. */
function mergeIntoWholeMessageJson(text: string, cards: ResultCard[]): string | null {
	if (!text.startsWith('{')) return null;

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return null;
	}

	const envelope = chatHubMessageCardsSchema.safeParse(parsed);
	if (envelope.success) {
		return JSON.stringify({
			...envelope.data,
			cards: [...envelope.data.cards, ...cards].slice(0, MAX_RESULT_CARDS_PER_MESSAGE),
		});
	}

	const buttons = chatHubMessageWithButtonsSchema.safeParse(parsed);
	if (buttons.success) {
		return JSON.stringify({
			...buttons.data,
			cards: [...(buttons.data.cards ?? []), ...cards].slice(0, MAX_RESULT_CARDS_PER_MESSAGE),
		});
	}

	return null;
}

/**
 * Tier 1: a workflow returned a card (or a `cards` envelope) as its message.
 * Returns the normalized envelope or `null` when the value is not a card.
 */
export function normalizeDeclaredCards(value: unknown): ChatHubMessageCards | null {
	const envelope = chatHubMessageCardsSchema.safeParse(value);
	if (envelope.success) {
		return {
			...envelope.data,
			cards: envelope.data.cards.map((card) => ({ source: 'declared', ...card })),
		};
	}
	const single = resultCardSchema.safeParse(value);
	if (single.success) {
		return { type: 'cards', text: undefined, cards: [{ source: 'declared', ...single.data }] };
	}
	return null;
}
