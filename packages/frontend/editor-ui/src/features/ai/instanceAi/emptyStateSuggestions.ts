import type { BaseTextKey } from '@n8n/i18n';
import type { IconName } from '@n8n/design-system';

export interface InstanceAiEmptyStateQuickExample {
	id: string;
	labelKey: BaseTextKey;
	promptKey: BaseTextKey;
}

export interface InstanceAiEmptyStatePromptSuggestion {
	type: 'prompt';
	id: string;
	icon: IconName;
	labelKey: BaseTextKey;
	promptKey: BaseTextKey;
}

export interface InstanceAiEmptyStateMenuSuggestion {
	type: 'menu';
	id: string;
	icon: IconName;
	labelKey: BaseTextKey;
	examples: readonly InstanceAiEmptyStateQuickExample[];
}

export type InstanceAiEmptyStateSuggestion =
	| InstanceAiEmptyStatePromptSuggestion
	| InstanceAiEmptyStateMenuSuggestion;

export const INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION = 'v1';

export const isPromptSuggestion = (
	suggestion: InstanceAiEmptyStateSuggestion,
): suggestion is InstanceAiEmptyStatePromptSuggestion => suggestion.type === 'prompt';

export const isMenuSuggestion = (
	suggestion: InstanceAiEmptyStateSuggestion,
): suggestion is InstanceAiEmptyStateMenuSuggestion => suggestion.type === 'menu';

export const INSTANCE_AI_EMPTY_STATE_SUGGESTIONS: readonly InstanceAiEmptyStateSuggestion[] = [
	{
		type: 'prompt',
		id: 'build-workflow',
		icon: 'workflow',
		labelKey: 'instanceAi.emptyState.suggestions.buildWorkflow.label',
		promptKey: 'instanceAi.emptyState.suggestions.buildWorkflow.prompt',
	},
	{
		type: 'prompt',
		id: 'build-agent',
		icon: 'bot',
		labelKey: 'instanceAi.emptyState.suggestions.buildAgent.label',
		promptKey: 'instanceAi.emptyState.suggestions.buildAgent.prompt',
	},
	{
		type: 'prompt',
		id: 'find-automation-ideas',
		icon: 'lightbulb',
		labelKey: 'instanceAi.emptyState.suggestions.findAutomationIdeas.label',
		promptKey: 'instanceAi.emptyState.suggestions.findAutomationIdeas.prompt',
	},
	{
		type: 'menu',
		id: 'quick-examples',
		icon: 'zap',
		labelKey: 'instanceAi.emptyState.suggestions.quickExamples.label',
		examples: [
			{
				id: 'monitor-competitors',
				labelKey: 'instanceAi.emptyState.quickExamples.monitorCompetitors.label',
				promptKey: 'instanceAi.emptyState.quickExamples.monitorCompetitors.prompt',
			},
			{
				id: 'automate-inbox',
				labelKey: 'instanceAi.emptyState.quickExamples.automateInbox.label',
				promptKey: 'instanceAi.emptyState.quickExamples.automateInbox.prompt',
			},
			{
				id: 'answer-support-requests',
				labelKey: 'instanceAi.emptyState.quickExamples.answerSupportRequests.label',
				promptKey: 'instanceAi.emptyState.quickExamples.answerSupportRequests.prompt',
			},
			{
				id: 'analyse-ad-spend',
				labelKey: 'instanceAi.emptyState.quickExamples.analyseAdSpend.label',
				promptKey: 'instanceAi.emptyState.quickExamples.analyseAdSpend.prompt',
			},
			{
				id: 'get-news-summary',
				labelKey: 'instanceAi.emptyState.quickExamples.getNewsSummary.label',
				promptKey: 'instanceAi.emptyState.quickExamples.getNewsSummary.prompt',
			},
		],
	},
];
