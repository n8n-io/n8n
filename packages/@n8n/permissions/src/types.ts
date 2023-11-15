export type DefaultOperations = 'create' | 'read' | 'update' | 'delete' | 'list' | '*';
export type Resource =
	| 'workflow'
	| 'user'
	| 'credential'
	| 'variable'
	| 'sourceControl'
	| 'externalSecretsStore';

export type ResourceScope<
	R extends Resource,
	Operation extends string = DefaultOperations,
> = `${R}:${Operation}`;

export type WorkflowSubresource = 'tag';
export type Subresource = {
	[K in Resource]?: K extends 'workflow' ? WorkflowSubresource : string;
};
export type SubresourceScope<
	R extends Resource,
	S extends Subresource[R],
	Operation extends string = DefaultOperations,
> = `${R}:${S}:${Operation}`;

export type WorkflowScope = ResourceScope<'workflow'> | SubresourceScope<'workflow', 'tag'>;
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
