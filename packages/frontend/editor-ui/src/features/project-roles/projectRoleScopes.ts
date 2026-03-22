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
		'execute',
		'update',
		'create',
		'publish',
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

/**
 * Scopes that are coupled to a visible scope but hidden from the checkbox UI.
 * These are counted in permission totals so roles carrying them (e.g.
 * PERSONAL_PROJECT_OWNER_SCOPES with workflow:unpublish but no workflow:publish)
 * are not undercounted.
 */
export const COUPLED_HIDDEN_SCOPES: ReadonlySet<string> = new Set(['workflow:unpublish']);

/** All UI-visible scopes as a flat set, for permission counting */
export const UI_VISIBLE_SCOPES: Set<string> = new Set([
	...Object.values(SCOPES).flat(),
	...COUPLED_HIDDEN_SCOPES,
]);

/** Total number of UI-visible permissions */
export const TOTAL_PROJECT_PERMISSIONS = UI_VISIBLE_SCOPES.size;

/**
 * Normalize coupled scopes so that publish ↔ unpublish are always paired.
 * Prevents legacy roles with only one of the two from being saved in that
 * state when an admin edits unrelated permissions.
 */
export function normalizeCoupledScopes(scopes: string[]): string[] {
	const hasPublish = scopes.includes('workflow:publish');
	const hasUnpublish = scopes.includes('workflow:unpublish');

	if (hasPublish && !hasUnpublish) {
		return [...scopes, 'workflow:unpublish'];
	}
	if (hasUnpublish && !hasPublish) {
		return [...scopes, 'workflow:publish'];
	}
	return scopes;
}
