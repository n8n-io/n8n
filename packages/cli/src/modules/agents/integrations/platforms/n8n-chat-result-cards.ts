import type { AgentCardsConfig } from '@n8n/api-types';

import type { IntegrationAction } from '../integration-tool-types';

/**
 * How the built-in n8n chat teaches an agent to use result cards. The card
 * catalog itself is described on the `show_card` action definition; this is
 * the judgement part — when a card beats prose — plus whatever the agent's
 * own `cards` config adds (tone, allowed archetypes, named presets).
 */
export const RESULT_CARD_GUIDANCE =
	'show_card renders a result card: a designed, glanceable view of data the user asked about. Use it whenever your answer is a figure, a comparison, a ranking, a handful of records, or something you sent (an email, a message). Keep your text reply to a sentence or two and put the data in the card; do not repeat the card contents as a list in your text. One card per answer unless the data has two clearly different shapes, never more than three. Fill cards only with data you actually have (from tools, the conversation or your instructions) and never invent values. Call show_card in the same turn as your reply, after the text.';

/** Whether the agent's config leaves result cards on (the default). */
export function resultCardsEnabled(cards: AgentCardsConfig | undefined): boolean {
	return cards?.enabled !== false;
}

/** Actions the n8n chat exposes for this agent. */
export function resolveN8nChatActions(cards: AgentCardsConfig | undefined): IntegrationAction[] {
	return resultCardsEnabled(cards) ? ['respond', 'show_card'] : ['respond'];
}

/** Guidance lines appended to the chat action tool description for this agent. */
export function buildResultCardGuidance(cards: AgentCardsConfig | undefined): string[] {
	if (!resultCardsEnabled(cards)) return [];
	const lines = [RESULT_CARD_GUIDANCE];
	if (cards?.tone) {
		lines.push(
			`Default tone for this agent's cards: "${cards.tone}". Set card.tone to it unless a preset below says otherwise.`,
		);
	}
	if (cards?.types?.length) {
		lines.push(`This agent only uses these card types: ${cards.types.join(', ')}.`);
	}
	if (cards?.presets?.length) {
		lines.push(
			'Card presets for this agent — reach for the matching one before improvising:',
			...cards.presets.map((preset) => {
				const tone = preset.tone ? `, tone ${preset.tone}` : '';
				const fields = preset.fields ? ` Fields: ${preset.fields}` : '';
				return `- "${preset.name}" (${preset.type}${tone}): ${preset.useWhen}.${fields}`;
			}),
		);
	}
	return lines;
}
