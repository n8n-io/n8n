import type { InstanceAiEmptyStateSuggestion } from './emptyStateSuggestions';

export const INSTANCE_AI_APP_SUGGESTIONS_VERSION = 'v1';

export const INSTANCE_AI_APP_SUGGESTIONS: readonly InstanceAiEmptyStateSuggestion[] = [
	{
		type: 'prompt',
		id: 'app-example-1',
		icon: 'layout-template',
		labelKey: 'apps.assistant.empty.suggestions.example1.label',
		promptKey: 'apps.assistant.empty.suggestions.example1.prompt',
	},
	{
		type: 'prompt',
		id: 'app-example-2',
		icon: 'layout-template',
		labelKey: 'apps.assistant.empty.suggestions.example2.label',
		promptKey: 'apps.assistant.empty.suggestions.example2.prompt',
	},
	{
		type: 'prompt',
		id: 'app-example-3',
		icon: 'layout-template',
		labelKey: 'apps.assistant.empty.suggestions.example3.label',
		promptKey: 'apps.assistant.empty.suggestions.example3.prompt',
	},
];
