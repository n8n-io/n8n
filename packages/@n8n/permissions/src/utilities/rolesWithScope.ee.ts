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
 * @param namespace - The role namespace to search in
 * @param scopes - Scope(s) to filter by
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
