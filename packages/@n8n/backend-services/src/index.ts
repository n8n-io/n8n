export { EventService, type EventMap } from './events/event.service';
export { isBillableExecution } from './executions/is-billable-execution';
export {
	CredentialsFinderService,
	CREDENTIAL_USABILITY_SCOPES,
	type UnusableCredential,
} from './credentials/credentials-finder.service';
export { UncacheableValueError } from './errors/cache-errors/uncacheable-value.error';
export { CacheService } from './services/cache/cache.service';
export { RedisClientService } from './services/redis-client.service';
export type { RedisClientType } from './services/redis.types';
export { RoleCacheService, type RoleLoader } from './services/role-cache.service';
export {
	RoleDeletionCheckProxy,
	type RoleDeletionChecker,
} from './services/role-deletion-check-proxy.service';
export { RoleService } from './services/role.service';
export { ProjectScopeService } from './services/project-scope.service';
export {
	FavoriteResourceResolverRegistry,
	type FavoriteResourceMeta,
	type FavoriteResourceResolver,
	type ResolvedFavoriteResourceType,
} from './services/favorite-resource-resolver.registry';
export { WorkflowProjectService } from './services/workflow-project.service';
export {
	OwnershipTransferHandlerRegistry,
	type ProjectOwnershipTransferHandler,
} from './services/ownership-transfer-handler.registry';
export {
	WorkflowSharingService,
	type ShareWorkflowOptions,
} from './services/workflow-sharing.service';
export { FolderFinderService } from './services/folder-finder.service';
export { InstanceWriteAccessService } from './services/instance-write-access.service';
export { UrlService } from './services/url.service';
export {
	classifyRestError,
	isResponseError,
	type RestErrorClassifierContext,
	type RestErrorDescriptor,
	RestErrorKind,
} from './errors/rest-error-classifier';
export {
	serializeInternalRestError,
	serializePublicApiError,
	type InternalRestErrorBody,
} from './errors/rest-error-response';
export {
	OAuthDiscoveryClient,
	AuthorizationServerMetadataSchema,
	JwkSchema,
	type AuthorizationServerMetadata,
	type Fetched,
	type FetchedJwks,
	type Jwk,
	type SkippedJwk,
} from './services/oauth-discovery-client';

export { AuthStrategyRegistry } from './services/auth-strategy.registry';
export { type AuthStrategyOptions, type AuthStrategy } from './services/auth-strategy.types';
export {
	type ProtectedResource,
	type ProtectedResourceResolver,
	ProtectedResourceRegistry,
} from './services/protected-resource.registry';
export {
	type AuthFailureReason,
	type Mcpauth_type,
	type McpResolvedAuthType,
	type McpCallerAuth,
	type TelemetryAuthContext,
	type UserWithContext,
	type OAuthTokenVerifier,
	OAuthTokenVerifierProxy,
} from './services/oauth-token-verifier-proxy.service';
export { type N8nOAuth2Flow, OAuth2FlowProxy } from './services/oauth2-flow-proxy.service';
export {
	type RoleResolverContext,
	type RoleMappingConfig,
	type ResolvedInstanceRole,
	type ResolvedProjectRole,
	type ResolvedRoles,
	type ProjectInfo,
	type RoleMappingProvider,
	RoleMappingProxyService,
} from './services/role-mapping-proxy.service';
export { type JwksProvider, JwksRegistry } from './jwks/jwks.registry';
export {
	type DcrJweFields,
	type OAuthJweHandler,
	OAuthJweServiceProxy,
} from './oauth/oauth-jwe-service.proxy';
