import {
	MAX_RESULT_CARDS_PER_MESSAGE,
	resultCardArchetypes,
	type ResultCard,
} from './chat-hub-result-card';
import { lenientResultCardSchema } from './chat-hub-result-card-lenient';

type Dict = Record<string, unknown>;

const isDict = (value: unknown): value is Dict =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const ARCHETYPES: ReadonlySet<string> = new Set(resultCardArchetypes);

/**
 * Cards a workflow declared in its output items — the shape a node returns when
 * it wants n8n to show a card rather than raw JSON:
 *
 * - a `{ type: 'cards', text?, cards: [...] }` envelope (the Chat Hub contract), or
 * - a single card object as the item itself.
 *
 * Items may be raw JSON or `{ json }` execution items. Field drift is coerced
 * leniently, but a single-card item must name a real archetype in `type` so an
 * ordinary API payload that happens to carry `type: 'summary'` is never mistaken
 * for a card. Returns at most {@link MAX_RESULT_CARDS_PER_MESSAGE} cards.
 */
export function extractDeclaredResultCards(items: readonly unknown[]): ResultCard[] {
	const cards: ResultCard[] = [];
	for (const item of items) {
		const json = isDict(item) && isDict(item.json) ? item.json : item;
		if (!isDict(json)) continue;

		const candidates =
			json.type === 'cards' && Array.isArray(json.cards)
				? json.cards
				: typeof json.type === 'string' && ARCHETYPES.has(json.type)
					? [json]
					: [];

		for (const candidate of candidates) {
			const parsed = lenientResultCardSchema.safeParse(candidate);
			if (!parsed.success) continue;
			cards.push({ source: 'declared', ...parsed.data });
			if (cards.length >= MAX_RESULT_CARDS_PER_MESSAGE) return cards;
		}
	}
	return cards;
}
