import type { z } from 'zod';

import type { RESOURCES, API_KEY_RESOURCES } from './constants.ee';
import type {
	assignableGlobalRoleSchema,
	credentialSharingRoleSchema,
	globalRoleSchema,
	projectRoleSchema,
	roleNamespaceSchema,
	teamRoleSchema,
	workflowSharingRoleSchema,
} from './schemas.ee';

/** Represents a resource that can have permissions applied to it */
export type Resource = keyof typeof RESOURCES;

/** A permission scope for a specific resource + operation combination */
type ResourceScope<
	R extends Resource,
	Operation extends (typeof RESOURCES)[R][number] = (typeof RESOURCES)[R][number],
> = `${R}:${Operation}`;

/** A wildcard scope applies to all operations on a resource or all resources */
type WildcardScope = `${Resource}:*` | '*';

// This is purely an intermediary type.
// If we tried to do use `ResourceScope<Resource>` directly we'd end
// up with all resources having all scopes (e.g. `ldap:uninstall`).
type AllScopesObject = {
	[R in Resource]: ResourceScope<R>;
};

/** A permission scope in the system, either a specific resource:operation or a wildcard */
export type Scope = AllScopesObject[Resource] | WildcardScope;

export type ScopeLevels = {
	global: Scope[];
	project?: Scope[];
	resource?: Scope[];
};

export type MaskLevels = {
	sharing: Scope[];
};

export type ScopeOptions = { mode: 'oneOf' | 'allOf' };

export type RoleNamespace = z.infer<typeof roleNamespaceSchema>;
export type GlobalRole = z.infer<typeof globalRoleSchema>;
export type AssignableGlobalRole = z.infer<typeof assignableGlobalRoleSchema>;
export type CredentialSharingRole = z.infer<typeof credentialSharingRoleSchema>;
export type WorkflowSharingRole = z.infer<typeof workflowSharingRoleSchema>;
export type TeamProjectRole = z.infer<typeof teamRoleSchema>;
export type ProjectRole = z.infer<typeof projectRoleSchema>;

/** Union of all possible role types in the system */
export type AllRoleTypes = GlobalRole | ProjectRole | WorkflowSharingRole | CredentialSharingRole;

type RoleObject<T extends AllRoleTypes> = {
	role: T;
	name: string;
	scopes: Scope[];
	licensed: boolean;
};

export type AllRolesMap = {
	global: Array<RoleObject<GlobalRole>>;
	project: Array<RoleObject<ProjectRole>>;
	credential: Array<RoleObject<CredentialSharingRole>>;
	workflow: Array<RoleObject<WorkflowSharingRole>>;
};

/**
 * Represents an authenticated entity in the system that can have specific permissions via a role.
 * @property role - The global role this principal has
 */
export type AuthPrincipal = {
	role: GlobalRole;
};

// #region Public API
type PublicApiKeyResources = keyof typeof API_KEY_RESOURCES;

type ApiKeyResourceScope<
	R extends PublicApiKeyResources,
	Operation extends (typeof API_KEY_RESOURCES)[R][number] = (typeof API_KEY_RESOURCES)[R][number],
> = `${R}:${Operation}`;

// This is purely an intermediary type.
// If we tried to do use `ResourceScope<Resource>` directly we'd end
// up with all resources having all scopes.
type AllApiKeyScopesObject = {
	[R in PublicApiKeyResources]: ApiKeyResourceScope<R>;
};

export type ApiKeyScope = AllApiKeyScopesObject[PublicApiKeyResources];

// #endregion
