/**
 * UI-visible permission scopes for project roles.
 * These are the scopes shown in the role editor checkboxes and used for
 * permission counting. Excludes auto-added scopes like :list, :execute, :listProject.
 *
 * Operations are type-checked against RESOURCES from @n8n/permissions to ensure
 * only valid resource:operation combinations can be specified.
 */

import { type RESOURCES } from '@n8n/permissions';

/**
 * UI-visible operations per resource for the project role editor.
 * The `satisfies` constraint ensures every key is a valid resource and
 * every operation exists in that resource's definition in @n8n/permissions.
 */
const UI_OPERATIONS = {
	project: ['read', 'update', 'delete'],
	folder: ['read', 'update', 'create', 'move', 'delete'],
	workflow: [
		'read',
		'update',
		'create',
		'publish',
		'unpublish',
		'move',
		'delete',
		'updateRedactionSetting',
	],
	credential: ['read', 'update', 'create', 'share', 'unshare', 'move', 'delete'],
	externalSecretsProvider: ['read', 'create', 'update', 'delete', 'sync'],
	externalSecret: ['list'],
	sourceControl: ['push'],
	dataTable: ['read', 'readRow', 'update', 'writeRow', 'create', 'delete'],
	projectVariable: ['read', 'update', 'create', 'delete'],
} satisfies {
	[R in keyof typeof RESOURCES]?: Array<(typeof RESOURCES)[R][number]>;
};

type ProjectResource = keyof typeof UI_OPERATIONS;

/** Type-safe scope strings derived from UI_OPERATIONS */
export type ProjectRoleScope = {
	[R in ProjectResource]: `${R}:${(typeof UI_OPERATIONS)[R][number]}`;
}[ProjectResource];

export const SCOPE_TYPES: ProjectResource[] = [
	'project',
	'folder',
	'workflow',
	'credential',
	'externalSecretsProvider',
	'externalSecret',
	'dataTable',
	'projectVariable',
	'sourceControl',
];

export const SCOPES: Record<ProjectResource, ProjectRoleScope[]> = Object.fromEntries(
	Object.entries(UI_OPERATIONS).map(([resource, operations]) => [
		resource,
		operations.map((op) => `${resource}:${op}`),
	]),
) as Record<ProjectResource, ProjectRoleScope[]>;

/** All UI-visible scopes as a flat set, for permission counting */
export const UI_VISIBLE_SCOPES: Set<string> = new Set(Object.values(SCOPES).flat());

/** Total number of UI-visible permissions */
export const TOTAL_PROJECT_PERMISSIONS = UI_VISIBLE_SCOPES.size;
