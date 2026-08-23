import { describe, expect, it } from 'vitest';

import {
	INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_VERSION,
	TOP_USED_V2_FALLBACK_PROMPT_IDS,
	getTopUsedV2FallbackSuggestions,
} from './fallbackSuggestions';

describe('instance AI personalized prompt fallback suggestions', () => {
	it('uses the v4 personalized catalog version', () => {
		expect(INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_VERSION).toBe('v4-personalized');
	});

	it('uses the fixed top-used v2 fallback order', () => {
		expect(TOP_USED_V2_FALLBACK_PROMPT_IDS).toEqual([
			'whatsapp-support-agent',
			'process-invoices',
			'schedule-social-posts',
			'qualify-inbound-leads',
		]);
	});

	it('adapts v2 labels and prompts to the personalized display shape', () => {
		const suggestions = getTopUsedV2FallbackSuggestions((key) => `translated:${key}`);

		expect(suggestions).toEqual([
			{
				id: 'whatsapp-support-agent',
				shortTitle:
					'translated:experiments.instanceAiPromptSuggestionsV2.suggestions.whatsappSupportAgent.label',
				description:
					'translated:experiments.instanceAiPersonalizedPromptSuggestions.fallbackSuggestions.whatsappSupportAgent.description',
				builderPrompt:
					'translated:experiments.instanceAiPromptSuggestionsV2.suggestions.whatsappSupportAgent.prompt',
			},
			{
				id: 'process-invoices',
				shortTitle:
					'translated:experiments.instanceAiPromptSuggestionsV2.suggestions.processInvoices.label',
				description:
					'translated:experiments.instanceAiPersonalizedPromptSuggestions.fallbackSuggestions.processInvoices.description',
				builderPrompt:
					'translated:experiments.instanceAiPromptSuggestionsV2.suggestions.processInvoices.prompt',
			},
			{
				id: 'schedule-social-posts',
				shortTitle:
					'translated:experiments.instanceAiPromptSuggestionsV2.suggestions.scheduleSocialPosts.label',
				description:
					'translated:experiments.instanceAiPersonalizedPromptSuggestions.fallbackSuggestions.scheduleSocialPosts.description',
				builderPrompt:
					'translated:experiments.instanceAiPromptSuggestionsV2.suggestions.scheduleSocialPosts.prompt',
			},
			{
				id: 'qualify-inbound-leads',
				shortTitle:
					'translated:experiments.instanceAiPromptSuggestionsV2.suggestions.qualifyInboundLeads.label',
				description:
					'translated:experiments.instanceAiPersonalizedPromptSuggestions.fallbackSuggestions.qualifyInboundLeads.description',
				builderPrompt:
					'translated:experiments.instanceAiPromptSuggestionsV2.suggestions.qualifyInboundLeads.prompt',
			},
		]);
	});
});
