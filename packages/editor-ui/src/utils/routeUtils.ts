import type { RouteRecordRaw } from 'vue-router';
import { VIEWS } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';

export const getPathAsRegexPattern = (path: RouteRecordRaw['path']): RegExp =>
	new RegExp(path.replace(/:\w+/g, '[^/]+'));

export function getTemplatesRedirect(defaultRedirect: VIEWS[keyof VIEWS]) {
	const settingsStore = useSettingsStore();
	const isTemplatesEnabled: boolean = settingsStore.isTemplatesEnabled;
	if (!isTemplatesEnabled) {
		return { name: defaultRedirect || VIEWS.NOT_FOUND };
	}

	return false;
}
