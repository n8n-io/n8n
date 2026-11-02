import type { InstanceAiEmptyStateSuggestion } from './emptyStateSuggestions';

export const INSTANCE_AI_APP_SUGGESTIONS_VERSION = 'v1';

export const INSTANCE_AI_APP_SUGGESTIONS: readonly InstanceAiEmptyStateSuggestion[] = [
	{
		type: 'prompt',
		id: 'app-dashboard',
		icon: 'layout-template',
		labelKey: 'apps.assistant.empty.suggestions.dashboard.label',
		promptKey: 'apps.assistant.empty.suggestions.dashboard.prompt',
	},
	{
		type: 'prompt',
		id: 'app-lead-form',
		icon: 'layout-template',
		labelKey: 'apps.assistant.empty.suggestions.leadForm.label',
		promptKey: 'apps.assistant.empty.suggestions.leadForm.prompt',
	},
	{
		type: 'prompt',
		id: 'app-agent-chat',
		icon: 'layout-template',
		labelKey: 'apps.assistant.empty.suggestions.agentChat.label',
		promptKey: 'apps.assistant.empty.suggestions.agentChat.prompt',
	},
	{
		type: 'prompt',
		id: 'app-unpaid-invoices',
		icon: 'layout-template',
		labelKey: 'apps.assistant.empty.suggestions.unpaidInvoices.label',
		promptKey: 'apps.assistant.empty.suggestions.unpaidInvoices.prompt',
	},
	{
		type: 'prompt',
		id: 'app-workflow-monitoring',
		icon: 'layout-template',
		labelKey: 'apps.assistant.empty.suggestions.workflowMonitoring.label',
		promptKey: 'apps.assistant.empty.suggestions.workflowMonitoring.prompt',
	},
];
