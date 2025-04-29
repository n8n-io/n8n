import { ALL_ROLE_MAPS } from '../roles/role-maps.ee';
import type {
	CredentialSharingRole,
	GlobalRole,
	ProjectRole,
	RoleNamespace,
	Scope,
	WorkflowSharingRole,
} from '../types.ee';

/**
 * Retrieves roles within a specific namespace that have all the given scopes.
 *
 * @param {RoleNamespace} namespace - The role namespace to search in ('global', 'project', 'credential', or 'workflow')
 * @param {Scope | Scope[]} scopes - A single scope or array of scopes to filter roles by
 * @returns {GlobalRole[] | ProjectRole[] | CredentialSharingRole[] | WorkflowSharingRole[]} - Array of roles that contain all the specified scopes
 *
 * @example
 * // Get all global roles that have the 'workflow:create' scope
 * const rolesWithCreateAccess = rolesWithScope('global', 'workflow:create');
 *
 * @example
 * // Get all project roles that have both 'workflow:read' and 'workflow:update' scopes
 * const rolesWithReadUpdateAccess = rolesWithScope('project', ['workflow:read', 'workflow:update']);
 */
export function rolesWithScope(namespace: 'global', scopes: Scope | Scope[]): GlobalRole[];
export function rolesWithScope(namespace: 'project', scopes: Scope | Scope[]): ProjectRole[];
export function rolesWithScope(
	namespace: 'credential',
	scopes: Scope | Scope[],
): CredentialSharingRole[];
export function rolesWithScope(
	namespace: 'workflow',
	scopes: Scope | Scope[],
): WorkflowSharingRole[];
export function rolesWithScope(namespace: RoleNamespace, scopes: Scope | Scope[]) {
	if (!Array.isArray(scopes)) {
		scopes = [scopes];
	}

	return Object.keys(ALL_ROLE_MAPS[namespace]).filter((k) => {
		return scopes.every((s) =>
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
			((ALL_ROLE_MAPS[namespace] as any)[k] as Scope[]).includes(s),
		);
	});
}
