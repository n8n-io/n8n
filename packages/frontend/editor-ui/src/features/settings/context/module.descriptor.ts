import { type FrontendModuleDescription } from '@n8n/frontend-module-sdk';

import { VIEWS } from '@/app/constants';
import { usePostHog, waitForFeatureFlagsWithTimeout } from '@/app/stores/posthog.store';
import { useIsCollectionsEnabled } from '@/features/shared/knowledge/useIsCollectionsEnabled';

import { KNOWLEDGE_COLLECTION_VIEW } from './context.constants';
import {
	canManageContextPreferences,
	isContextPreferencesEnabled,
	isContextSkillsEnabled,
} from './context.utils';

/**
 * No `custom` middleware: the initializer would gate the routes on a backend module,
 * which preferences do not have. The preferences and skills checks run in `beforeEnter`. The sidebar
 * entry stays with the shell, which hides module pages without a backend module.
 */
export const ContextModule: FrontendModuleDescription = {
	id: 'context',
	name: 'Context',
	description:
		'Reusable preferences and skills for the n8n assistant, agents and connected AI tools',
	icon: 'brain',
	routes: [
		{
			path: 'context',
			name: VIEWS.SETTINGS_CONTEXT,
			component: async () => await import('./views/SettingsContextView.vue'),
			meta: {
				middleware: ['authenticated'],
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
		{
			path: 'context/preferences',
			name: VIEWS.SETTINGS_CONTEXT_PREFERENCES,
			component: async () => await import('./views/SettingsPreferencesView.vue'),
			meta: {
				middleware: ['authenticated'],
				telemetry: {
					pageCategory: 'settings',
				},
			},
			beforeEnter: () =>
				isContextPreferencesEnabled() || canManageContextPreferences() || { name: VIEWS.HOMEPAGE },
		},
		{
			path: 'context/skills',
			name: VIEWS.SETTINGS_CONTEXT_SKILLS,
			component: async () => await import('./views/SettingsSkillsView.vue'),
			meta: {
				middleware: ['authenticated'],
				telemetry: {
					pageCategory: 'settings',
				},
			},
			beforeEnter: () => isContextSkillsEnabled() || { name: VIEWS.HOMEPAGE },
		},
		{
			path: 'collections/:collectionId',
			name: KNOWLEDGE_COLLECTION_VIEW,
			props: true,
			component: async () => await import('./views/CollectionView.vue'),
			meta: {
				projectRoute: true,
				middleware: ['authenticated'],
			},
			// PostHog loads flags after the first paint, so a page reload waits for them.
			// The operator setting needs no flag, so it skips the wait.
			beforeEnter: async () => {
				const collectionsEnabled = useIsCollectionsEnabled();
				if (!collectionsEnabled.value) {
					await waitForFeatureFlagsWithTimeout(usePostHog(), 3000);
				}
				return collectionsEnabled.value || { name: VIEWS.HOMEPAGE };
			},
		},
	],
};
