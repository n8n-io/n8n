import { useProjectPages } from '@/composables/useProjectPages';
import { LOCAL_STORAGE_WORKFLOW_LIST_PREFERENCES_KEY } from '@/constants';
import { useLocalStorage } from '@vueuse/core';

// Workflow list user preferences
type TabSettings = {
	sort?: string;
	pageSize?: number;
};

// We are currently only saving workflow tab settings
// but we are keeping the credentials tab settings here for future use
export type WorkflowListPreferences = {
	[projectId: string]: {
		[tabName in 'workflows' | 'credentials']: TabSettings;
	};
};

/**
 * Simple n8n wrapper around vueuse's useLocalStorage.
 * Provides util functions to read and write n8n values to local storage.
 * Currently only used for workflow list user preferences.
 */
export function useN8nLocalStorage() {
	const projectPages = useProjectPages();

	const getProjectKey = (projectId?: string) => {
		return projectPages.isOverviewSubPage ? 'home' : projectId;
	};

	const saveProjectPreferencesToLocalStorage = (
		projectId: string,
		tabKey: 'workflows' | 'credentials',
		preferences: TabSettings,
	) => {
		const projectKey = getProjectKey(projectId);
		if (!projectKey) {
			return;
		}

		const localStorage = useLocalStorage<Record<string, WorkflowListPreferences>>(
			LOCAL_STORAGE_WORKFLOW_LIST_PREFERENCES_KEY,
			{},
		);

		if (!localStorage.value[projectKey]) {
			localStorage.value[projectKey] = {};
		}

		localStorage.value[projectKey][tabKey] = {
			...localStorage.value[projectKey][tabKey],
			...preferences,
		};
	};

	const loadProjectPreferencesFromLocalStorage = (
		projectId: string,
		tabKey: 'workflows' | 'credentials',
	) => {
		const projectKey = getProjectKey(projectId);
		if (!projectKey) {
			return {};
		}
		const localStorage = useLocalStorage<Record<string, WorkflowListPreferences>>(
			LOCAL_STORAGE_WORKFLOW_LIST_PREFERENCES_KEY,
			{},
		);
		const projectPreferences: TabSettings =
			(localStorage.value[projectKey]?.[tabKey] as TabSettings) || {};
		return projectPreferences;
	};

	return {
		saveProjectPreferencesToLocalStorage,
		loadProjectPreferencesFromLocalStorage,
		getProjectKey,
	};
}
