import type { IMenuItem } from '@n8n/design-system';

export type SettingsSidebarGroupId = 'account' | 'users' | 'ai' | 'security' | 'instance';

export type SettingsSidebarItem = IMenuItem & {
	type: 'item';
};

export type SettingsSidebarGroup = {
	type: 'group';
	id: SettingsSidebarGroupId;
	label: string;
	items: SettingsSidebarItem[];
};

export const MIN_SETTINGS_SIDEBAR_WIDTH = 240;
export const MAX_SETTINGS_SIDEBAR_WIDTH = 480;
export const DEFAULT_SETTINGS_SIDEBAR_WIDTH = 240;

function isSettingsItemVisible(item: SettingsSidebarItem): boolean {
	return item.available !== false;
}

export function flattenSettingsEntries(groups: SettingsSidebarGroup[]): SettingsSidebarItem[] {
	return groups.flatMap((group) => group.items.filter(isSettingsItemVisible));
}

export function filterSettingsEntries(
	groups: SettingsSidebarGroup[],
	query: string,
): SettingsSidebarGroup[] {
	const visibleGroups = groups.flatMap((group) => {
		const items = group.items.filter(isSettingsItemVisible);
		return items.length > 0 ? [{ ...group, items }] : [];
	});

	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) {
		return visibleGroups;
	}

	return visibleGroups.flatMap((group) => {
		if (group.label.toLowerCase().includes(normalizedQuery)) {
			return [group];
		}

		const items = group.items.filter((item) => item.label.toLowerCase().includes(normalizedQuery));
		return items.length > 0 ? [{ ...group, items }] : [];
	});
}

export function clampSettingsSidebarWidth(width: number): number {
	if (!Number.isFinite(width)) {
		return DEFAULT_SETTINGS_SIDEBAR_WIDTH;
	}

	return Math.min(MAX_SETTINGS_SIDEBAR_WIDTH, Math.max(MIN_SETTINGS_SIDEBAR_WIDTH, width));
}
