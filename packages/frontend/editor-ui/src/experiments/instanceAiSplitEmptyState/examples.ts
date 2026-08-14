import type { BaseTextKey } from '@n8n/i18n';

export interface SplitEmptyStateExample {
	id: string;
	titleKey: BaseTextKey;
	promptKey: BaseTextKey;
	workflowFile: string;
}

export interface SplitEmptyStateSuggestionSubmitPayload {
	promptKey: BaseTextKey;
	suggestionId: string;
	suggestionKind: 'quick_example';
	position: number;
}

export const INSTANCE_AI_SPLIT_EMPTY_STATE_SUGGESTIONS_VERSION = 'v2-cycling-preview';

// Single source of truth for the auto-cycle pace: drives both the example
// rotation (useCyclingExamples) and the loading-bar fill (SuggestionList), so
// the bar always finishes exactly as the next example appears.
export const INSTANCE_AI_SPLIT_EMPTY_STATE_CYCLE_MS = 6500;

export const INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES: readonly SplitEmptyStateExample[] = [
	{
		id: 'score-my-leads',
		titleKey:
			'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.scoreMyLeads.label' as BaseTextKey,
		promptKey:
			'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.scoreMyLeads.prompt' as BaseTextKey,
		workflowFile: 'score-my-leads',
	},
	{
		id: 'process-invoices',
		titleKey:
			'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.processInvoices.label' as BaseTextKey,
		promptKey:
			'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.processInvoices.prompt' as BaseTextKey,
		workflowFile: 'process-invoices',
	},
	{
		id: 'whatsapp-support',
		titleKey:
			'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.whatsappSupport.label' as BaseTextKey,
		promptKey:
			'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.whatsappSupport.prompt' as BaseTextKey,
		workflowFile: 'whatsapp-support',
	},
	{
		id: 'schedule-social-posts',
		titleKey:
			'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.scheduleSocialPosts.label' as BaseTextKey,
		promptKey:
			'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.scheduleSocialPosts.prompt' as BaseTextKey,
		workflowFile: 'schedule-social-posts',
	},
];
