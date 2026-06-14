import type { IconName } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';
import type { InstanceAiEmptyStatePromptSuggestion } from '@/features/ai/instanceAi/emptyStateSuggestions';

export interface WorkflowPreviewSuggestion extends InstanceAiEmptyStatePromptSuggestion {
	workflowFile: string;
}

export const INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS_VERSION = 'v3-workflow-preview';

export const INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS: readonly WorkflowPreviewSuggestion[] = [
	{
		type: 'prompt',
		id: 'score-my-leads',
		icon: 'badge-check' as IconName,
		labelKey:
			'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.scoreMyLeads.label' as BaseTextKey,
		promptKey:
			'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.scoreMyLeads.prompt' as BaseTextKey,
		workflowFile: 'score-my-leads',
	},
	{
		type: 'prompt',
		id: 'process-invoices',
		icon: 'file-text' as IconName,
		labelKey:
			'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.processInvoices.label' as BaseTextKey,
		promptKey:
			'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.processInvoices.prompt' as BaseTextKey,
		workflowFile: 'process-invoices',
	},
	{
		type: 'prompt',
		id: 'whatsapp-support',
		icon: 'message-circle' as IconName,
		labelKey:
			'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.whatsappSupport.label' as BaseTextKey,
		promptKey:
			'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.whatsappSupport.prompt' as BaseTextKey,
		workflowFile: 'whatsapp-support',
	},
	{
		type: 'prompt',
		id: 'schedule-social-posts',
		icon: 'calendar' as IconName,
		labelKey:
			'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.scheduleSocialPosts.label' as BaseTextKey,
		promptKey:
			'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.scheduleSocialPosts.prompt' as BaseTextKey,
		workflowFile: 'schedule-social-posts',
	},
];
