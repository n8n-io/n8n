import { capabilities, capabilityRegistry, defineFrontendModule } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';

import {
	RUNTIME_CREDENTIALS_MODULE_ID,
	RUNTIME_INPUTS_MANAGE_SCOPE,
	RUNTIME_INPUTS_PROJECT_SCOPE,
	RUNTIME_INPUTS_PROJECT_VIEW,
	RUNTIME_INPUTS_SETTINGS_ICON,
	RUNTIME_INPUTS_SETTINGS_ORDER,
	RUNTIME_INPUTS_SETTINGS_VIEW,
} from './runtime-credentials.constants';

// typescript-eslint reads an SFC import as `any`, because only vue-tsc can type one.
// `pnpm turbo typecheck` is what checks these components for real.
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const SettingsView = async () => await import('./views/RuntimeInputsSettingsView.vue');
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const ProjectView = async () => await import('./views/RuntimeInputsProjectView.vue');

/** Keep this file import-light: the shell runs every descriptor body before Pinia starts. */
export const RuntimeCredentialsModule = defineFrontendModule({
	// Must match the backend module id: both gate off `/rest/module-settings`.
	id: RUNTIME_CREDENTIALS_MODULE_ID,
	name: 'Runtime Credentials',
	description: 'Map values in an incoming request to credentials at run time',
	icon: 'key-round',
	routes: [
		{
			path: 'runtime-inputs',
			name: RUNTIME_INPUTS_SETTINGS_VIEW,
			component: SettingsView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'rbac', 'custom'],
				middlewareOptions: { rbac: { scope: RUNTIME_INPUTS_MANAGE_SCOPE } },
				telemetry: { pageCategory: 'settings' },
			},
		},
		{
			path: 'runtime-inputs',
			name: RUNTIME_INPUTS_PROJECT_VIEW,
			component: ProjectView,
			meta: { projectRoute: true, middleware: ['authenticated', 'custom'] },
		},
	],
	settingsPages: [
		{
			id: 'settings-runtime-inputs',
			order: RUNTIME_INPUTS_SETTINGS_ORDER,
			section: 'security',
			icon: RUNTIME_INPUTS_SETTINGS_ICON,
			get label() {
				return useI18n().baseText('runtimeCredentials.settings.title');
			},
			position: 'top',
			route: { to: { name: RUNTIME_INPUTS_SETTINGS_VIEW } },
			get available() {
				return useRBACStore().hasScope(RUNTIME_INPUTS_MANAGE_SCOPE);
			},
		},
	],
	projectTabs: {
		project: [
			{
				get label() {
					return useI18n().baseText('runtimeCredentials.project.title');
				},
				value: RUNTIME_INPUTS_PROJECT_VIEW,
				dynamicRoute: { name: RUNTIME_INPUTS_PROJECT_VIEW, includeProjectId: true },
				available: (projectId) => {
					if (projectId === undefined) return false;
					// The shell fills the project scopes from the project the page shows. The RBAC store
					// does not hold them for a project, so read them through the capability.
					const permissions = capabilityRegistry.use(capabilities.projectPermissions);
					return permissions.scopesFor(projectId).includes(RUNTIME_INPUTS_PROJECT_SCOPE);
				},
			},
		],
	},
});
