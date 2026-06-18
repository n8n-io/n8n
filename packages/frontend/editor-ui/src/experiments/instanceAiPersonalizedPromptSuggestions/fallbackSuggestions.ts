import type { BaseTextKey } from '@n8n/i18n';

import { INSTANCE_AI_PROMPT_SUGGESTIONS_V2 } from '@/experiments/instanceAiPromptSuggestionsV2/suggestions';

import type { PersonalizedPromptDisplaySuggestion } from './types';

export const INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_VERSION = 'v4-personalized';

export const TOP_USED_V2_FALLBACK_PROMPT_IDS = [
	'whatsapp-support-agent',
	'process-invoices',
	'schedule-social-posts',
	'qualify-inbound-leads',
] as const;

type BaseText = (key: BaseTextKey) => string;

export function getTopUsedV2FallbackSuggestions(
	baseText: BaseText,
): PersonalizedPromptDisplaySuggestion[] {
	const suggestionsById = new Map(
		INSTANCE_AI_PROMPT_SUGGESTIONS_V2.map((suggestion) => [suggestion.id, suggestion]),
	);

	return TOP_USED_V2_FALLBACK_PROMPT_IDS.map((id) => {
		const suggestion = suggestionsById.get(id);

		if (!suggestion) {
			throw new Error(`Missing v2 fallback prompt suggestion: ${id}`);
		}

		const builderPrompt = baseText(suggestion.promptKey);

		return {
			id: suggestion.id,
			shortTitle: baseText(suggestion.labelKey),
			description: builderPrompt,
			builderPrompt,
		};
	});
}
