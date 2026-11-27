import { VIEWS } from '@n8n/frontend-constants/views';
import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { RouterView } from 'vue-router';

const RolesView = async () => await import('./RolesView.vue');
const InstanceRoleView = async () => await import('./instance/InstanceRoleView.vue');
const ProjectRoleView = async () => await import('./project/ProjectRoleView.vue');

/**
 * No backend module has the id `roles`, so `isModuleActive('roles')` is always false. For this
 * reason no route here uses the `'custom'` middleware, and the module has no `settingsPages`:
 * either one would hide the roles pages. The settings sidebar link stays in the shell.
 *
 * Every route has `pageCategory: 'settings'`, so the shell adds it below `/settings`.
 */
export const RolesModule = defineFrontendModule({
	id: 'roles',
	name: 'Roles',
	description: 'Instance and project roles, and the custom role editors',
	icon: 'user-lock',
	routes: [
		{
			path: 'project-roles/view/:roleSlug',
			name: VIEWS.PROJECT_ROLE_VIEW,
			component: ProjectRoleView,
			props: true,
			meta: {
				middleware: ['authenticated', 'enterprise'],
				middlewareOptions: {
					enterprise: {
						feature: 'customRoles',
					},
				},
				telemetry: {
					pageCategory: 'settings',
					getProperties() {
						return {
							feature: 'project-roles',
						};
					},
				},
			},
		},
		{
			path: 'roles',
			name: VIEWS.ROLES_SETTINGS,
			component: RolesView,
			meta: {
				middleware: ['authenticated', 'rbac'],
				middlewareOptions: {
					rbac: {
						scope: ['role:manage', 'role:manageProject'],
					},
				},
				telemetry: {
					pageCategory: 'settings',
					getProperties() {
						return {
							feature: 'roles',
						};
					},
				},
			},
		},
		{
			path: 'instance-roles',
			component: RouterView,
			children: [
				{
					path: '',
					// Instance roles are listed inside the tabbed Roles shell; the bare
					// path has no standalone page, so redirect it to the instance tab.
					redirect: () => ({ name: VIEWS.ROLES_SETTINGS, query: { tab: 'instance' } }),
				},
				{
					path: 'new',
					name: VIEWS.INSTANCE_NEW_ROLE,
					component: InstanceRoleView,
				},
				{
					path: 'edit/:roleSlug',
					name: VIEWS.INSTANCE_ROLE_SETTINGS,
					component: InstanceRoleView,
					props: true,
				},
				{
					path: 'view/:roleSlug',
					name: VIEWS.INSTANCE_ROLE_VIEW,
					component: InstanceRoleView,
					props: true,
				},
			],
			meta: {
				middleware: ['authenticated', 'enterprise', 'rbac'],
				middlewareOptions: {
					enterprise: {
						feature: 'customRoles',
					},
					rbac: {
						scope: ['role:manage'],
					},
				},
				telemetry: {
					pageCategory: 'settings',
					getProperties() {
						return {
							feature: 'roles',
						};
					},
				},
			},
		},
		{
			path: 'project-roles',
			component: RouterView,
			children: [
				{
					path: '',
					name: VIEWS.PROJECT_ROLES_SETTINGS,
					// The standalone project-roles page is superseded by the tabbed Roles shell;
					// redirect old deep links to the project tab there.
					redirect: () => ({ name: VIEWS.ROLES_SETTINGS, query: { tab: 'project' } }),
				},
				{
					path: 'new',
					name: VIEWS.PROJECT_NEW_ROLE,
					component: ProjectRoleView,
				},
				{
					path: 'edit/:roleSlug',
					name: VIEWS.PROJECT_ROLE_SETTINGS,
					component: ProjectRoleView,
					props: true,
				},
			],
			meta: {
				middleware: ['authenticated', 'rbac'],
				middlewareOptions: {
					rbac: {
						scope: ['role:manage', 'role:manageProject'],
					},
				},
				telemetry: {
					pageCategory: 'settings',
					getProperties() {
						return {
							feature: 'project-roles',
						};
					},
				},
			},
		},
	],
});
