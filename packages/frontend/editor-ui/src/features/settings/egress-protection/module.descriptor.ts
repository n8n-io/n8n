import type { FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import { VIEWS } from '@/app/constants';

const EgressProtectionSettings = async () => await import('./EgressProtectionSettings.vue');

export const EgressProtectionModule: FrontendModuleDescription = {
	id: 'egress-protection',
	name: 'Egress protection',
	description: 'Configure egress protection settings',
	icon: 'shield',
	routes: [
		{
			path: 'egress-protection',
			name: VIEWS.EGRESS_PROTECTION_SETTINGS,
			component: EgressProtectionSettings,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'rbac'],
				middlewareOptions: {
					rbac: {
						scope: ['egressProtection:manage'],
					},
				},
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
	],
};
