export type DefaultOperations = 'create' | 'read' | 'update' | 'delete' | 'list';
export type Resource =
	| 'workflow'
	| 'user'
	| 'credential'
	| 'variable'
	| 'sourceControl'
	| 'externalSecretStore';

export type ResourceScope<R extends Resource, Operations = DefaultOperations> = `${R}:${string &
	Operations}`;
export type WildcardScope = `${Resource}:*` | '*';

export type WorkflowScope = ResourceScope<'workflow'>;
export type UserScope = ResourceScope<'user'>;
export type CredentialScope = ResourceScope<'credential'>;
export type VariableScope = ResourceScope<'variable'>;
export type SourceControlScope = ResourceScope<'sourceControl', 'pull' | 'push' | 'manage'>;
export type ExternalSecretStoreScope = ResourceScope<
	'externalSecretStore',
	DefaultOperations | 'refresh'
>;

export type AllScopes = WorkflowScope | UserScope | CredentialScope | VariableScope;

export type ScopeLevel = 'global' | 'project' | 'resource';
export type ScopeLevels = Record<ScopeLevel, AllScopes[]>;
