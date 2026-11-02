import type { AppResponse } from '@n8n/api-types';
import type { Component } from 'vue';

import type { AppVersions } from '../../composables/useAppVersions';
import AppConfigureTabBasics from './AppConfigureTabBasics.vue';

export type AppConfigureTabProps = { app: AppResponse; versions: AppVersions };

export type AppConfigureTabEmits = { updated: [app: AppResponse] };

export const APP_CONFIGURE_TABS = [
	{ name: 'basics', component: AppConfigureTabBasics },
] as const satisfies ReadonlyArray<{ name: string; component: Component<AppConfigureTabProps> }>;

export type AppConfigureTab = (typeof APP_CONFIGURE_TABS)[number]['name'];

export const DEFAULT_APP_CONFIGURE_TAB: AppConfigureTab = APP_CONFIGURE_TABS[0].name;

export function isAppConfigureTab(value: string | undefined): value is AppConfigureTab {
	return APP_CONFIGURE_TABS.some((tab) => tab.name === value);
}
