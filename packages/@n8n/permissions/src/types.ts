export type DefaultOperations = 'create' | 'read' | 'update' | 'delete' | 'list';
export type Resource =
	| 'workflow'
	| 'user'
	| 'credential'
	| 'variable'
	| 'sourceControl'
	| 'externalSecretsStore';

export type ResourceScope<
	R extends Resource,
	Operations extends string = DefaultOperations,
> = `${R}:${Operations}`;
export type WildcardScope = `${Resource}:*` | '*';

export type WorkflowScope = ResourceScope<'workflow'>;
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
	| UserScope
	| CredentialScope
	| VariableScope
	| SourceControlScope
	| ExternalSecretStoreScope;

export type ScopeLevel = 'global' | 'project' | 'resource';
export type ScopeLevels = Record<ScopeLevel, Scope[]>;
