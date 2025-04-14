import type { RESOURCES, API_KEY_RESOURCES } from './constants.ee';

export type Resource = keyof typeof RESOURCES;

export type ResourceScope<
	R extends Resource,
	Operation extends (typeof RESOURCES)[R][number] = (typeof RESOURCES)[R][number],
> = `${R}:${Operation}`;

export type WildcardScope = `${Resource}:*` | '*';

// This is purely an intermediary type.
// If we tried to do use `ResourceScope<Resource>` directly we'd end
// up with all resources having all scopes (e.g. `ldap:uninstall`).
type AllScopesObject = {
	[R in Resource]: ResourceScope<R>;
};

export type Scope = AllScopesObject[Resource];

export type ScopeLevel = 'global' | 'project' | 'resource';
export type GetScopeLevel<T extends ScopeLevel> = Record<T, Scope[]>;
export type GlobalScopes = GetScopeLevel<'global'>;
export type ProjectScopes = GetScopeLevel<'project'>;
export type ResourceScopes = GetScopeLevel<'resource'>;
export type ScopeLevels = GlobalScopes & (ProjectScopes | (ProjectScopes & ResourceScopes));

export type MaskLevel = 'sharing';
export type GetMaskLevel<T extends MaskLevel> = Record<T, Scope[]>;
export type SharingMasks = GetMaskLevel<'sharing'>;
export type MaskLevels = SharingMasks;

export type ScopeMode = 'oneOf' | 'allOf';
export type ScopeOptions = { mode: ScopeMode };

export type PublicApiKeyResources = keyof typeof API_KEY_RESOURCES;

export type ApiKeyResourceScope<
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

export type GlobalRole = 'global:owner' | 'global:admin' | 'global:member';
export type AssignableRole = Exclude<GlobalRole, 'global:owner'>;
