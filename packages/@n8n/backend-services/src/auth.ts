export { AuthStrategyRegistry } from './services/auth-strategy.registry';
export {
	type AuthStrategyOptions,
	type AuthStrategy,
	type AuthStrategyResult,
} from './services/auth-strategy.types';
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
export {
	type N8nOAuth2Flow,
	type OAuth2FlowRequest,
	OAuth2FlowProxy,
} from './services/oauth2-flow-proxy.service';
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
