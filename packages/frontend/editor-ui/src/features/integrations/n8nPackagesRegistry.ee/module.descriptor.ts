import { i18n } from '@n8n/i18n';
import type { FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import {
	N8N_PACKAGES_REGISTRY_MODULE_ID,
	N8N_PACKAGES_REGISTRY_SETTINGS_VIEW,
} from './n8nPackagesRegistry.constants';

const SettingsN8nPackagesRegistryView = async () =>
	await import('./views/SettingsN8nPackagesRegistryView.vue');

export const N8nPackagesRegistryModule: FrontendModuleDescription = {
	id: N8N_PACKAGES_REGISTRY_MODULE_ID,
	name: 'Package registry',
	description: 'Import projects from the n8n package registry',
	icon: 'package-open',
	routes: [
		{
			path: 'package-registry',
			name: N8N_PACKAGES_REGISTRY_SETTINGS_VIEW,
			component: SettingsN8nPackagesRegistryView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'custom'],
				telemetry: {
					pageCategory: 'settings',
					getProperties() {
						return {
							feature: 'n8n-packages-registry',
						};
					},
				},
			},
		},
	],
	settingsPages: [
		{
			id: 'settings-n8n-packages-registry',
			icon: 'package-open',
			label: i18n.baseText('settings.n8nPackagesRegistry.title'),
			position: 'top',
			route: { to: { name: N8N_PACKAGES_REGISTRY_SETTINGS_VIEW } },
			preview: true,
		},
	],
};
