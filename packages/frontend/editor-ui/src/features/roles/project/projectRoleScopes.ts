/**
 * UI-visible permission scopes for project roles.
 * These are the scopes shown in the role editor checkboxes and used for
 * permission counting. Excludes auto-added scopes like :list, :execute, :listProject.
 *
 * Operations are type-checked against PROJECT_CUSTOM_ROLE_OPERATIONS from @n8n/permissions to ensure
 * only valid resource:operation combinations can be specified.
 */

import { COUPLED_HIDDEN_SCOPES, PROJECT_CUSTOM_ROLE_OPERATIONS } from '@n8n/permissions';

type ProjectResource = keyof typeof PROJECT_CUSTOM_ROLE_OPERATIONS;

/** Type-safe scope strings derived from PROJECT_CUSTOM_ROLE_OPERATIONS */
export type ProjectRoleScope = {
	[R in ProjectResource]: `${R}:${(typeof PROJECT_CUSTOM_ROLE_OPERATIONS)[R][number]}`;
}[ProjectResource];

export const SCOPE_TYPES: ProjectResource[] = [
	'project',
	'folder',
	'workflow',
	'agent',
	'credential',
	'execution',
	'externalSecretsProvider',
	'externalSecret',
	'dataTable',
	'projectVariable',
	'sourceControl',
];

export const SCOPES: Record<ProjectResource, ProjectRoleScope[]> = Object.fromEntries(
	Object.entries(PROJECT_CUSTOM_ROLE_OPERATIONS).map(([resource, operations]) => [
		resource,
		operations.map((op) => `${resource}:${op}`),
	]),
) as Record<ProjectResource, ProjectRoleScope[]>;

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
