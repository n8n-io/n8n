export type DefaultOperations = 'create' | 'read' | 'update' | 'delete' | 'list';
export type Resource =
	| 'workflow'
	| 'tag'
	| 'user'
	| 'credential'
	| 'variable'
	| 'sourceControl'
	| 'externalSecretsStore';

export type ResourceScope<
	R extends Resource,
	Operation extends string = DefaultOperations,
> = `${R}:${Operation}`;

export type WildcardScope = `${Resource}:*` | '*';

export type WorkflowScope = ResourceScope<'workflow', DefaultOperations | 'share'>;
export type TagScope = ResourceScope<'tag'>;
export type UserScope = ResourceScope<'user'>;
export type CredentialScope = ResourceScope<'credential'>;
export type VariableScope = ResourceScope<'variable'>;
export type SourceControlScope = ResourceScope<'sourceControl', 'pull' | 'push' | 'manage'>;
export type ExternalSecretStoreScope = ResourceScope<
	'externalSecretsStore',
	DefaultOperations | 'refresh'
>;

export type Scope =
	| WorkflowScope
	| TagScope
	| UserScope
	| CredentialScope
	| VariableScope
	| SourceControlScope
	| ExternalSecretStoreScope;

export type ScopeLevel<T extends 'global' | 'project' | 'resource'> = Record<T, Scope[]>;
export type GlobalScopes = ScopeLevel<'global'>;
export type ProjectScopes = ScopeLevel<'project'>;
export type ResourceScopes = ScopeLevel<'resource'>;
export type ScopeLevels = GlobalScopes & (ProjectScopes | (ProjectScopes & ResourceScopes));

export type ScopeMode = 'oneOf' | 'allOf';
export type ScopeOptions = { mode: ScopeMode };
