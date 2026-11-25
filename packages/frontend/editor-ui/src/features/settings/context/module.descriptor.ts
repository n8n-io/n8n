import { type FrontendModuleDescription } from '@n8n/frontend-module-sdk';

import { VIEWS } from '@/app/constants';
import { usePostHog, waitForFeatureFlagsWithTimeout } from '@/app/stores/posthog.store';
import { useIsCollectionsEnabled } from '@/features/shared/knowledge/useIsCollectionsEnabled';

import {
	canManageContextPreferences,
	isContextPreferencesEnabled,
	isContextSkillsEnabled,
} from './context.utils';

/** PostHog can still load the flags on a page reload, so wait for them before the check. */
async function collectionsGuard() {
	const collectionsEnabled = useIsCollectionsEnabled();
	if (!collectionsEnabled.value) {
		await waitForFeatureFlagsWithTimeout(usePostHog(), 3000);
	}
	return collectionsEnabled.value || { name: VIEWS.HOMEPAGE };
}

/**
 * No `custom` middleware: the initializer would gate the routes on a backend module,
 * which preferences do not have. The preferences, skills and collections checks run in
 * `beforeEnter`. The sidebar entry stays with the shell, which hides module pages without a
 * backend module.
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
			path: 'context/collections',
			name: VIEWS.SETTINGS_CONTEXT_COLLECTIONS,
			component: async () => await import('./views/SettingsCollectionsView.vue'),
			meta: {
				middleware: ['authenticated'],
				telemetry: {
					pageCategory: 'settings',
				},
			},
			beforeEnter: collectionsGuard,
		},
		{
			path: 'collections/:collectionId',
			name: VIEWS.KNOWLEDGE_COLLECTION,
			props: true,
			component: async () => await import('./views/CollectionView.vue'),
			meta: {
				projectRoute: true,
				middleware: ['authenticated'],
			},
			beforeEnter: collectionsGuard,
		},
	],
};
