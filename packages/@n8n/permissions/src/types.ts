import type { DEFAULT_OPERATIONS, RESOURCES } from './constants';

export type DefaultOperations = (typeof DEFAULT_OPERATIONS)[number];
export type Resource = keyof typeof RESOURCES;

export type ResourceScope<
	R extends Resource,
	Operation extends (typeof RESOURCES)[R][number] = (typeof RESOURCES)[R][number],
> = `${R}:${Operation}`;

export type WildcardScope = `${Resource}:*` | '*';

export type AnnotationTagScope = ResourceScope<'annotationTag'>;
export type AuditLogsScope = ResourceScope<'auditLogs'>;
export type BannerScope = ResourceScope<'banner'>;
export type CommunityScope = ResourceScope<'community'>;
export type CommunityPackageScope = ResourceScope<'communityPackage'>;
export type CredentialScope = ResourceScope<'credential'>;
export type ExternalSecretScope = ResourceScope<'externalSecret'>;
export type ExternalSecretProviderScope = ResourceScope<'externalSecretsProvider'>;
export type EventBusDestinationScope = ResourceScope<'eventBusDestination'>;
export type LdapScope = ResourceScope<'ldap'>;
export type LicenseScope = ResourceScope<'license'>;
export type LogStreamingScope = ResourceScope<'logStreaming'>;
export type OrchestrationScope = ResourceScope<'orchestration'>;
export type ProjectScope = ResourceScope<'project'>;
export type SamlScope = ResourceScope<'saml'>;
export type SecurityAuditScope = ResourceScope<'securityAudit'>;
export type SourceControlScope = ResourceScope<'sourceControl'>;
export type TagScope = ResourceScope<'tag'>;
export type UserScope = ResourceScope<'user'>;
export type VariableScope = ResourceScope<'variable'>;
export type WorkersViewScope = ResourceScope<'workersView'>;
export type WorkflowScope = ResourceScope<'workflow'>;

export type Scope =
	| AnnotationTagScope
	| AuditLogsScope
	| BannerScope
	| CommunityScope
	| CommunityPackageScope
	| CredentialScope
	| ExternalSecretProviderScope
	| ExternalSecretScope
	| EventBusDestinationScope
	| LdapScope
	| LicenseScope
	| LogStreamingScope
	| OrchestrationScope
	| ProjectScope
	| SamlScope
	| SecurityAuditScope
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

export type MaskLevel = 'sharing';
export type GetMaskLevel<T extends MaskLevel> = Record<T, Scope[]>;
export type SharingMasks = GetMaskLevel<'sharing'>;
export type MaskLevels = SharingMasks;

export type ScopeMode = 'oneOf' | 'allOf';
export type ScopeOptions = { mode: ScopeMode };
