import type { RouteRecordRaw } from 'vue-router';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import {
	PROTO_INSTANCE_AUDIT_LOG_VIEW,
	PROTO_INSTANCE_POLICIES_VIEW,
	PROTO_INSTANCE_PROJECTS_VIEW,
	PROTO_MEMBERS_VIEW,
	PROTO_SETTINGS_PAGE_VIEW,
} from './useProtoChrome';

const ProjectSettingsPageView = async () =>
	await import('@/features/projectSettingsPrototype/pages/ProjectSettingsPageView.vue');
const InstanceProjectsPage = async () =>
	await import('@/features/projectSettingsPrototype/pages/InstanceProjectsPage.vue');
const InstanceAuditLogPage = async () =>
	await import('@/features/projectSettingsPrototype/pages/InstanceAuditLogPage.vue');
const InstancePoliciesPage = async () =>
	await import('@/features/projectSettingsPrototype/pages/InstancePoliciesPage.vue');

/** Only team projects have settings and members. */
const isTeamProject = (projectId: unknown): boolean =>
	useProjectsStore().myProjects.some(
		(project) => project.id === projectId && project.type === ProjectTypes.Team,
	);

const projectPageMeta: RouteRecordRaw['meta'] = {
	middleware: ['authenticated', 'custom'],
	middlewareOptions: {
		custom: (options) => isTeamProject(options?.to.params.projectId),
	},
};

/** Children of `/projects/:projectId`. One URL per page, whatever the variant. */
export const protoProjectRoutes: RouteRecordRaw[] = [
	{
		path: 'settings/:page',
		name: PROTO_SETTINGS_PAGE_VIEW,
		component: ProjectSettingsPageView,
		meta: projectPageMeta,
	},
	{
		path: 'members',
		name: PROTO_MEMBERS_VIEW,
		component: ProjectSettingsPageView,
		meta: projectPageMeta,
	},
];

const instancePageMeta: RouteRecordRaw['meta'] = {
	layout: 'settings',
	middleware: ['authenticated'],
	telemetry: { pageCategory: 'settings' },
};

/** Children of `/settings`: the instance pages project settings point to. */
export const protoInstanceRoutes: RouteRecordRaw[] = [
	{
		path: 'projects',
		name: PROTO_INSTANCE_PROJECTS_VIEW,
		component: InstanceProjectsPage,
		meta: instancePageMeta,
	},
	{
		path: 'audit-log',
		name: PROTO_INSTANCE_AUDIT_LOG_VIEW,
		component: InstanceAuditLogPage,
		meta: instancePageMeta,
	},
	{
		path: 'policies',
		name: PROTO_INSTANCE_POLICIES_VIEW,
		component: InstancePoliciesPage,
		meta: instancePageMeta,
	},
];
