export type DefaultOperations = 'create' | 'read' | 'update' | 'delete' | 'list';
export type Resource =
	| 'auditLogs'
	| 'banner'
	| 'communityPackage'
	| 'credential'
	| 'externalSecretsProvider'
	| 'externalSecret'
	| 'eventBusEvent'
	| 'eventBusDestination'
	| 'ldap'
	| 'license'
	| 'logStreaming'
	| 'orchestration'
	| 'sourceControl'
	| 'saml'
	| 'tag'
	| 'user'
	| 'variable'
	| 'workersView'
	| 'workflow';

export type ResourceScope<
	R extends Resource,
	Operation extends string = DefaultOperations,
> = `${R}:${Operation}`;

export type WildcardScope = `${Resource}:*` | '*';

export type AuditLogsScope = ResourceScope<'auditLogs', 'manage'>;
export type BannerScope = ResourceScope<'banner', 'dismiss'>;
export type CommunityPackageScope = ResourceScope<
	'communityPackage',
	'install' | 'uninstall' | 'update' | 'list' | 'manage'
>;
export type CredentialScope = ResourceScope<'credential', DefaultOperations | 'share'>;
export type ExternalSecretScope = ResourceScope<'externalSecret', 'list' | 'use'>;
export type ExternalSecretProviderScope = ResourceScope<
	'externalSecretsProvider',
	DefaultOperations | 'sync'
>;
export type EventBusDestinationScope = ResourceScope<
	'eventBusDestination',
	DefaultOperations | 'test'
>;
export type EventBusEventScope = ResourceScope<'eventBusEvent', DefaultOperations | 'query'>;
export type LdapScope = ResourceScope<'ldap', 'manage' | 'sync'>;
export type LicenseScope = ResourceScope<'license', 'manage'>;
export type LogStreamingScope = ResourceScope<'logStreaming', 'manage'>;
export type OrchestrationScope = ResourceScope<'orchestration', 'read' | 'list'>;
export type SamlScope = ResourceScope<'saml', 'manage'>;
export type SourceControlScope = ResourceScope<'sourceControl', 'pull' | 'push' | 'manage'>;
export type TagScope = ResourceScope<'tag'>;
export type UserScope = ResourceScope<'user', DefaultOperations | 'resetPassword' | 'changeRole'>;
export type VariableScope = ResourceScope<'variable'>;
export type WorkersViewScope = ResourceScope<'workersView', 'manage'>;
export type WorkflowScope = ResourceScope<'workflow', DefaultOperations | 'share' | 'execute'>;

export type Scope =
	| AuditLogsScope
	| BannerScope
	| CommunityPackageScope
	| CredentialScope
	| ExternalSecretProviderScope
	| ExternalSecretScope
	| EventBusEventScope
	| EventBusDestinationScope
	| LdapScope
	| LicenseScope
	| LogStreamingScope
	| OrchestrationScope
	| SamlScope
	| SourceControlScope
	| TagScope
	| UserScope
	| VariableScope
	| WorkersViewScope
	| WorkflowScope;

export type ScopeLevel = 'global' | 'project' | 'resource';
export type GetScopeLevel<T extends ScopeLevel> = Record<T, Scope[]>;
export type GlobalScopes = GetScopeLevel<'global'>;
export type ProjectScopes = GetScopeLevel<'project'>;
export type ResourceScopes = GetScopeLevel<'resource'>;
export type ScopeLevels = GlobalScopes & (ProjectScopes | (ProjectScopes & ResourceScopes));

export type ScopeMode = 'oneOf' | 'allOf';
export type ScopeOptions = { mode: ScopeMode };
