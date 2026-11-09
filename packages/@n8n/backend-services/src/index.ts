export { EventService, type EventMap } from './events/event.service';
export {
	countsTowardExecutionLimit,
	executionLimitDelta,
	isBillableExecution,
	isInsightsProduction,
	isLedgerFact,
	savesTime,
	toLedgerFact,
	toLedgerOutcome,
	type CompletedRun,
	type LedgerEntityType,
	type LedgerEvent,
	type LedgerFact,
	type LedgerOutcome,
	type LedgerSource,
} from './executions/counting-rules';
export { computeTimeSavedMinutes, sumNodeTimeSavedMinutes } from './executions/time-saved';
export {
	CredentialsFinderService,
	CREDENTIAL_USABILITY_SCOPES,
	type UnusableCredential,
} from './credentials/credentials-finder.service';
export { UncacheableValueError } from './errors/cache-errors/uncacheable-value.error';
export { CacheService } from './services/cache/cache.service';
export type { Hash, MaybeHash } from './services/cache/cache.types';
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

export {
	type PurposedSignOptions,
	type PurposedVerifyOptions,
	JwtService,
	type JwtPayload,
} from './services/jwt.service';
export {
	TOKEN_PURPOSES,
	type TokenPurpose,
	API_KEY_PURPOSES,
	LEGACY_UNBOUND_PURPOSES,
} from './services/token-purposes';

export {
	WorkflowPublishedDataService,
	type PublishedWorkflowData,
	type PublishedWorkflowDataForExecution,
} from './workflows/workflow-published-data.service';

export {
	RuntimeCredentialProxyService,
	type RuntimeCredentialProvider,
} from './services/runtime-credential-proxy.service';
export {
	InstanceRegistryProxyService,
	type InstanceRegistryProvider,
} from './services/instance-registry-proxy.service';
export { ExecutingUserIdentifierProxy } from './credentials/executing-user-identifier-proxy';
export type { IExecutingUserIdentifier } from './credentials/executing-user-identifier.interface';
export { ExecutionRedactionServiceProxy } from './executions/execution-redaction-proxy.service';
export {
	isRedactableExecution,
	type ExecutionRedactionOptions,
	type ExecutionRedaction,
	type RedactableExecution,
} from './executions/execution-redaction';
export {
	WorkflowMutationHooksProxy,
	type WorkflowMutationHooks,
} from './workflows/workflow-mutation-hooks-proxy.service';
export {
	WorkflowPublishGuardProxy,
	type WorkflowPublishGuard,
} from './workflows/workflow-publish-guard-proxy.service';
export {
	RestrictedNodeTypesProviderProxy,
	type RestrictedNodeTypesProvider,
} from './workflows/restricted-node-types-provider-proxy.service';
export {
	InstalledTypeRestrictionsProxy,
	type InstalledTypeRestrictionsProvider,
} from './services/installed-type-restrictions-proxy.service';

export {
	type AiPreferenceProjectRef,
	type AiPreferenceItem,
	type AppliedPreference,
	type ApplicableAiPreferences,
	type AiPreferenceUpdateRequest,
	AiPreferenceService,
	groupAiPreferences,
	renderAiPreferences,
	flattenAiPreferences,
	type AppliedPreferencesInjection,
	buildAppliedPreferencesPayload,
	AI_PREFERENCES_REPLACES_EARLIER,
	AI_PREFERENCES_CLEARED_BLOCK,
	renderAiPreferencesBlock,
} from './services/ai-preference.service';
export { AiPreferenceScopeFullError } from './errors/response-errors/ai-preference-scope-full.error';
export * from './auth';
export { ProjectNotFoundError } from './errors/project-not-found.error';
