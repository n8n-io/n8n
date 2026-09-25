import {
	chatHubMessageCardsSchema,
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

export function appendCardsToMessage(message: string | undefined, cards: ResultCard[]): string {
	const text = message ?? '';
	const limited = cards.slice(0, MAX_RESULT_CARDS_PER_MESSAGE);
	if (limited.length === 0) return text;
	const commands = limited.map(toCardCommand).join('');
	return text.length > 0 ? `${text}\n\n${commands}` : commands;
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
