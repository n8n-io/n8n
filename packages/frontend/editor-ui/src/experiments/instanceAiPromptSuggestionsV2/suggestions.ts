import type { IconName } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';

export interface InstanceAiPromptSuggestionV2 {
	type: 'prompt';
	id: string;
	icon: IconName;
	labelKey: BaseTextKey;
	promptKey: BaseTextKey;
}

export const INSTANCE_AI_PROMPT_SUGGESTIONS_V2_VERSION = 'v2';

export const INSTANCE_AI_PROMPT_SUGGESTIONS_V2 = [
	{
		type: 'prompt',
		id: 'process-invoices',
		icon: 'circle-dollar-sign',
		labelKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.processInvoices.label',
		promptKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.processInvoices.prompt',
	},
	{
		type: 'prompt',
		id: 'qualify-inbound-leads',
		icon: 'badge-check',
		labelKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.qualifyInboundLeads.label',
		promptKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.qualifyInboundLeads.prompt',
	},
	{
		type: 'prompt',
		id: 'whatsapp-support-agent',
		icon: 'message-circle',
		labelKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.whatsappSupportAgent.label',
		promptKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.whatsappSupportAgent.prompt',
	},
	{
		type: 'prompt',
		id: 'schedule-social-posts',
		icon: 'calendar',
		labelKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.scheduleSocialPosts.label',
		promptKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.scheduleSocialPosts.prompt',
	},
	{
		type: 'prompt',
		id: 'analyze-exit-interviews',
		icon: 'users',
		labelKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.analyzeExitInterviews.label',
		promptKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.analyzeExitInterviews.prompt',
	},
	{
		type: 'prompt',
		id: 'post-to-linkedin',
		icon: 'send',
		labelKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.postToLinkedIn.label',
		promptKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.postToLinkedIn.prompt',
	},
	{
		type: 'prompt',
		id: 'detect-at-risk-accounts',
		icon: 'shield-user',
		labelKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.detectAtRiskAccounts.label',
		promptKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.detectAtRiskAccounts.prompt',
	},
	{
		type: 'prompt',
		id: 'automate-order-flow',
		icon: 'package-open',
		labelKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.automateOrderFlow.label',
		promptKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.automateOrderFlow.prompt',
	},
	{
		type: 'prompt',
		id: 'recover-abandoned-carts',
		icon: 'archive-restore',
		labelKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.recoverAbandonedCarts.label',
		promptKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.recoverAbandonedCarts.prompt',
	},
	{
		type: 'prompt',
		id: 'monitor-market-news',
		icon: 'rss',
		labelKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.monitorMarketNews.label',
		promptKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.monitorMarketNews.prompt',
	},
	{
		type: 'prompt',
		id: 'onboard-new-hires',
		icon: 'user-check',
		labelKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.onboardNewHires.label',
		promptKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.onboardNewHires.prompt',
	},
	{
		type: 'prompt',
		id: 'extract-data-from-emails',
		icon: 'paperclip',
		labelKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.extractDataFromEmails.label',
		promptKey: 'experiments.instanceAiPromptSuggestionsV2.suggestions.extractDataFromEmails.prompt',
	},
] satisfies readonly InstanceAiPromptSuggestionV2[];
