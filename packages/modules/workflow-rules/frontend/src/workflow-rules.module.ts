import { capabilities, capabilityRegistry, defineFrontendModule } from '@n8n/frontend-module-sdk';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { RouteMeta } from 'vue-router';

import {
	PROJECT_WORKFLOW_RULES_VIEW,
	WORKFLOW_RULES_MANAGE_SCOPE,
	WORKFLOW_RULES_MODULE_ID,
	WORKFLOW_RULES_SETTINGS_VIEW,
} from './workflow-rules.constants';

const WorkflowRulesSettingsView = async () => await import('./views/WorkflowRulesSettingsView.vue');
const ProjectWorkflowRulesView = async () => await import('./views/ProjectWorkflowRulesView.vue');

const settingsMeta = {
	layout: 'settings',
	middleware: ['authenticated', 'rbac', 'custom'],
	middlewareOptions: { rbac: { scope: [WORKFLOW_RULES_MANAGE_SCOPE] } },
	telemetry: {
		pageCategory: 'settings',
		getProperties() {
			return { feature: 'workflow-rules' };
		},
	},
} satisfies RouteMeta;

function canManageProjectRules(projectId: string | undefined): boolean {
	if (!projectId || !useSettingsStore().isModuleActive(WORKFLOW_RULES_MODULE_ID)) return false;
	const permissions = capabilityRegistry.use(capabilities.projectPermissions);
	return permissions.scopesFor(projectId).includes(WORKFLOW_RULES_MANAGE_SCOPE);
}

/** Keep this file import-light: stores are only called inside getters and guards. */
export const WorkflowRulesModule = defineFrontendModule({
	id: WORKFLOW_RULES_MODULE_ID,
	name: 'Workflow Rules',
	description: 'Admin-defined rules on workflow content, checked live and enforced on publish',
	icon: 'shield-half',
	routes: [
		{
			name: WORKFLOW_RULES_SETTINGS_VIEW,
			path: 'workflow-rules',
			component: WorkflowRulesSettingsView,
			meta: settingsMeta,
		},
		{
			name: PROJECT_WORKFLOW_RULES_VIEW,
			path: 'workflow-rules',
			component: ProjectWorkflowRulesView,
			meta: { projectRoute: true, middleware: ['authenticated', 'custom'] },
			beforeEnter: (to) =>
				canManageProjectRules(
					typeof to.params.projectId === 'string' ? to.params.projectId : undefined,
				) || { name: VIEWS.PROJECTS_WORKFLOWS, params: { projectId: to.params.projectId } },
		},
	],
	projectTabs: {
		project: [
			{
				get label() {
					return useI18n().baseText('workflowRules.project.tab');
				},
				value: PROJECT_WORKFLOW_RULES_VIEW,
				insertAfter: VIEWS.PROJECTS_WORKFLOWS,
				dynamicRoute: { name: PROJECT_WORKFLOW_RULES_VIEW, includeProjectId: true },
				available: canManageProjectRules,
			},
		],
	},
	settingsPages: [
		{
			id: 'settings-workflow-rules',
			order: 45,
			section: 'security',
			icon: 'shield-half',
			get label() {
				return useI18n().baseText('workflowRules.settings.title');
			},
			position: 'top',
			route: { to: { name: WORKFLOW_RULES_SETTINGS_VIEW } },
			get available() {
				return (
					useSettingsStore().isModuleActive(WORKFLOW_RULES_MODULE_ID) &&
					useRBACStore().hasScope(WORKFLOW_RULES_MANAGE_SCOPE)
				);
			},
		},
	],
});
