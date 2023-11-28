export type DefaultOperations = 'create' | 'read' | 'update' | 'delete' | 'list';
export type Resource =
	| 'auditLogs'
	| 'communityNodes'
	| 'credential'
	| 'externalSecretsStore'
	| 'ldap'
	| 'logStreaming'
	| 'sourceControl'
	| 'sso'
	| 'tag'
	| 'user'
	| 'variable'
	| 'workflow';

export type ResourceScope<
	R extends Resource,
	Operation extends string = DefaultOperations,
> = `${R}:${Operation}`;

export type WildcardScope = `${Resource}:*` | '*';

export type AuditLogsScope = ResourceScope<'auditLogs', 'manage'>;
export type CommunityNodesScope = ResourceScope<'communityNodes', 'manage'>;
export type CredentialScope = ResourceScope<'credential', DefaultOperations | 'share'>;
export type ExternalSecretStoreScope = ResourceScope<
	'externalSecretsStore',
	DefaultOperations | 'manage' | 'refresh'
>;
export type LdapScope = ResourceScope<'ldap', 'manage'>;
export type LogStreamingScope = ResourceScope<'logStreaming', 'manage'>;
export type SourceControlScope = ResourceScope<'sourceControl', 'pull' | 'push' | 'manage'>;
export type SsoScope = ResourceScope<'sso', 'manage'>;
export type TagScope = ResourceScope<'tag'>;
export type UserScope = ResourceScope<'user'>;
export type VariableScope = ResourceScope<'variable'>;
export type WorkflowScope = ResourceScope<'workflow', DefaultOperations | 'share'>;

export type Scope =
	| AuditLogsScope
	| CommunityNodesScope
	| CredentialScope
	| ExternalSecretStoreScope
	| LdapScope
	| LogStreamingScope
	| SourceControlScope
	| SsoScope
	| TagScope
	| UserScope
	| VariableScope
	| WorkflowScope;

export type ScopeLevel = 'global' | 'project' | 'resource';
export type GetScopeLevel<T extends ScopeLevel> = Record<T, Scope[]>;
export type GlobalScopes = GetScopeLevel<'global'>;
export type ProjectScopes = GetScopeLevel<'project'>;
export type ResourceScopes = GetScopeLevel<'resource'>;
export type ScopeLevels = GlobalScopes & (ProjectScopes | (ProjectScopes & ResourceScopes));

export type ScopeMode = 'oneOf' | 'allOf';
export type ScopeOptions = { mode: ScopeMode };
