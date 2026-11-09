import type { IconName } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';

export type PreferenceExampleId = 'workflows' | 'agents' | 'credentials' | 'answers';

export interface PreferenceExample {
	id: PreferenceExampleId;
	content: string;
}

export interface PreferenceExampleCard {
	id: PreferenceExampleId;
	icon: IconName;
	categoryKey: BaseTextKey;
	contentKey: BaseTextKey;
}

export const PREFERENCE_EXAMPLE_CARDS: readonly PreferenceExampleCard[] = [
	{
		id: 'workflows',
		icon: 'workflow',
		categoryKey: 'experiments.preferencesEmptyState.examples.workflows.category',
		contentKey: 'experiments.preferencesEmptyState.examples.workflows.content',
	},
	{
		id: 'agents',
		icon: 'bot',
		categoryKey: 'experiments.preferencesEmptyState.examples.agents.category',
		contentKey: 'experiments.preferencesEmptyState.examples.agents.content',
	},
	{
		id: 'credentials',
		icon: 'key-round',
		categoryKey: 'experiments.preferencesEmptyState.examples.credentials.category',
		contentKey: 'experiments.preferencesEmptyState.examples.credentials.content',
	},
	{
		id: 'answers',
		icon: 'message-square',
		categoryKey: 'experiments.preferencesEmptyState.examples.answers.category',
		contentKey: 'experiments.preferencesEmptyState.examples.answers.content',
	},
];
