import { useSettingsStore } from '@/stores/settings.store';
import { type TabOptions } from '@n8n/design-system';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useModulesStore = defineStore('modules', () => {
	const settingsStore = useSettingsStore();

	/**
	 * Modules can register their ProjectHeader tabs here
	 * Since these tabs are specific to the page they are on,
	 * we add them to separate arrays so pages can pick the right ones
	 * at render time.
	 */
	const projectPageTabs = ref<Array<TabOptions<string>>>([]);
	const overviewPageTabs = ref<Array<TabOptions<string>>>([]);
	const sharedPageTabs = ref<Array<TabOptions<string>>>([]);

	const addProjectPageTabs = (tabs: Array<TabOptions<string>>) => {
		projectPageTabs.value.push(...tabs);
	};
	const addOverviewPageTabs = (tabs: Array<TabOptions<string>>) => {
		overviewPageTabs.value.push(...tabs);
	};
	const addSharedPageTabs = (tabs: Array<TabOptions<string>>) => {
		sharedPageTabs.value.push(...tabs);
	};

	// TODO: Hard-coding this for now until back-end is merged
	const activeModules = computed(() => [...settingsStore.settings.activeModules, 'data-store']);

	const isModuleActive = (moduleName: string) => {
		return activeModules.value.includes(moduleName);
	};

	return {
		activeModules,
		isModuleActive,
		projectPageTabs,
		addProjectPageTabs,
		overviewPageTabs,
		addOverviewPageTabs,
		sharedPageTabs,
		addSharedPageTabs,
	};
});
