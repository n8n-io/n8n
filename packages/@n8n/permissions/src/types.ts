export type DefaultOperations = 'create' | 'read' | 'update' | 'delete' | 'list';
export type Resource =
	| 'workflow'
	| 'tag'
	| 'user'
	| 'credential'
	| 'variable'
	| 'sourceControl'
	| 'externalSecretsProvider'
	| 'externalSecret'
	| 'eventBusEvent'
	| 'eventBusDestination'
	| 'orchestration'
	| 'communityPackage'
	| 'ldap'
	| 'saml';

export type ResourceScope<
	R extends Resource,
	Operation extends string = DefaultOperations,
> = `${R}:${Operation}`;

export type WildcardScope = `${Resource}:*` | '*';

export type WorkflowScope = ResourceScope<'workflow', DefaultOperations | 'share'>;
export type TagScope = ResourceScope<'tag'>;
export type UserScope = ResourceScope<'user', DefaultOperations | 'resetPassword'>;
export type CredentialScope = ResourceScope<'credential', DefaultOperations | 'share'>;
export type VariableScope = ResourceScope<'variable'>;
export type SourceControlScope = ResourceScope<'sourceControl', 'pull' | 'push' | 'manage'>;
export type ExternalSecretProviderScope = ResourceScope<
	'externalSecretsProvider',
	DefaultOperations | 'sync'
>;
export type ExternalSecretScope = ResourceScope<'externalSecret', 'list'>;
export type EventBusEventScope = ResourceScope<'eventBusEvent', DefaultOperations | 'query'>;
export type EventBusDestinationScope = ResourceScope<
	'eventBusDestination',
	DefaultOperations | 'test'
>;
export type OrchestrationScope = ResourceScope<'orchestration', 'read' | 'list'>;
export type CommunityPackageScope = ResourceScope<
	'communityPackage',
	'install' | 'uninstall' | 'update' | 'list'
>;
export type LdapScope = ResourceScope<'ldap', 'manage' | 'sync'>;
export type SamlScope = ResourceScope<'saml', 'manage'>;

export type Scope =
	| WorkflowScope
	| TagScope
	| UserScope
	| CredentialScope
	| VariableScope
	| SourceControlScope
	| ExternalSecretProviderScope
	| ExternalSecretScope
	| EventBusEventScope
	| EventBusDestinationScope
	| OrchestrationScope
	| CommunityPackageScope
	| LdapScope
	| SamlScope;

export type ScopeLevel = 'global' | 'project' | 'resource';
export type GetScopeLevel<T extends ScopeLevel> = Record<T, Scope[]>;
export type GlobalScopes = GetScopeLevel<'global'>;
export type ProjectScopes = GetScopeLevel<'project'>;
export type ResourceScopes = GetScopeLevel<'resource'>;
export type ScopeLevels = GlobalScopes & (ProjectScopes | (ProjectScopes & ResourceScopes));

export type ScopeMode = 'oneOf' | 'allOf';
export type ScopeOptions = { mode: ScopeMode };
