import { authorizationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/authorize.js';
import { clientRegistrationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/register.js';
import { revocationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/revoke.js';
import { tokenHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/token.js';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import {
	createIpRateLimit,
	Get,
	Options,
	RootLevelController,
	StaticRouterMetadata,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response, Request, RequestHandler, Router } from 'express';

import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';

import { OAuthServerConfig } from './oauth-server.config';
import { OAuthServerService } from './oauth-server.service';
import { buildOAuthClientLimitReachedMessage } from './oauth.errors';

const oauthServerService = Container.get(OAuthServerService);
const globalConfig = Container.get(GlobalConfig);
const oauthServerConfig = Container.get(OAuthServerConfig);
const logger = Container.get(Logger);

/**
 * Pre-check guard for the unauthenticated DCR endpoint. Short-circuits with
 * a structured `server_error` response when the instance is at the
 * registered-client cap. Returns HTTP 503 because limit exhaustion is a
 * temporary capacity condition, not an internal failure.
 *
 * The post-insert rollback in `enforceClientLimit` throws
 * `OAuthClientLimitReachedError` (a `ServerError` subclass) so the SDK
 * surfaces the same body shape on the rare race path; the SDK's register
 * handler hardcodes 500 for `ServerError`, so that path returns 500 with
 * an identical body.
 */
const oauthClientLimitGuard: RequestHandler = async (_req, res, next) => {
	if (await oauthServerService.isClientLimitReached()) {
		const limit = globalConfig.endpoints.mcpMaxRegisteredClients;
		logger.warn('OAuth client registration rejected: instance limit reached (pre-check)', {
			limit,
		});
		res.status(503).json({
			error: 'server_error',
			error_description: buildOAuthClientLimitReachedMessage(limit),
		});
		return;
	}
	next();
};

// Built once and mounted under both the legacy `/mcp-oauth/*` paths (existing
// DCR clients hold them in their stored discovery metadata) and the neutral
// `/oauth/*` paths that future, non-MCP protected resources will advertise.
const registerRouter = clientRegistrationHandler({
	clientsStore: oauthServerService.clientsStore,
}) as Router;
const authorizeRouter = authorizationHandler({ provider: oauthServerService }) as Router;
const tokenRouter = tokenHandler({ provider: oauthServerService }) as Router;
const revokeRouter = revocationHandler({ provider: oauthServerService }) as Router;

const sharedEndpointRouters = (basePath: '/mcp-oauth' | '/oauth'): StaticRouterMetadata[] => [
	{
		path: `${basePath}/register`,
		router: registerRouter,
		skipAuth: true,
		middlewares: [oauthClientLimitGuard],
		ipRateLimit: createIpRateLimit(
			oauthServerConfig.rateLimitRegister,
			5 * Time.minutes.toMilliseconds,
		),
	},
	{
		path: `${basePath}/authorize`,
		router: authorizeRouter,
		skipAuth: true,
		ipRateLimit: createIpRateLimit(
			oauthServerConfig.rateLimitAuthorize,
			5 * Time.minutes.toMilliseconds,
		),
	},
	{
		path: `${basePath}/token`,
		router: tokenRouter,
		skipAuth: true,
		ipRateLimit: createIpRateLimit(
			oauthServerConfig.rateLimitToken,
			5 * Time.minutes.toMilliseconds,
		),
	},
	{
		path: `${basePath}/revoke`,
		router: revokeRouter,
		skipAuth: true,
		ipRateLimit: createIpRateLimit(
			oauthServerConfig.rateLimitRevoke,
			5 * Time.minutes.toMilliseconds,
		),
	},
];

const wellKnownIpRateLimit = createIpRateLimit(
	oauthServerConfig.rateLimitWellKnown,
	5 * Time.minutes.toMilliseconds,
);

@RootLevelController('/')
export class OAuthController {
	constructor(
		private readonly urlService: UrlService,
		private readonly resourceRegistry: ProtectedResourceRegistry,
	) {}

	// Add CORS headers for OAuth discovery endpoints
	private setCorsHeaders(res: Response) {
		// Allow requests from any origin for OAuth discovery
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
		res.header('Access-Control-Allow-Headers', 'Content-Type');
	}

	static routers: StaticRouterMetadata[] = [
		...sharedEndpointRouters('/mcp-oauth'),
		...sharedEndpointRouters('/oauth'),
	];

	@Options('/.well-known/oauth-authorization-server', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: wellKnownIpRateLimit,
	})
	metadataOptions(_req: Request, res: Response) {
		this.setCorsHeaders(res);
		res.status(204).end();
	}

	/**
	 * Single RFC 8414 authorization-server metadata document, shared by all
	 * protected resources: one issuer (the instance origin), one set of
	 * endpoints, one signing key.
	 *
	 * Keeps advertising the legacy `/mcp-oauth/*` endpoint paths — clients that
	 * registered via DCR persist these URLs, so changing them would strand
	 * every already-connected client.
	 */
	@Get('/.well-known/oauth-authorization-server', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: wellKnownIpRateLimit,
	})
	metadata(_req: Request, res: Response) {
		this.setCorsHeaders(res);

		const baseUrl = this.urlService.getInstanceBaseUrl();
		const metadata = {
			issuer: baseUrl,
			authorization_endpoint: `${baseUrl}/mcp-oauth/authorize`,
			token_endpoint: `${baseUrl}/mcp-oauth/token`,
			registration_endpoint: `${baseUrl}/mcp-oauth/register`,
			revocation_endpoint: `${baseUrl}/mcp-oauth/revoke`,
			response_types_supported: ['code'],
			grant_types_supported: ['authorization_code', 'refresh_token'],
			token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
			code_challenge_methods_supported: ['S256'],
			scopes_supported: this.resourceRegistry.getAllScopes(),
		};

		res.json(metadata);
	}

	@Options('/.well-known/oauth-protected-resource/*resourcePath', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: wellKnownIpRateLimit,
	})
	protectedResourceMetadataOptions(_req: Request, res: Response) {
		this.setCorsHeaders(res);
		res.status(204).end();
	}

	/**
	 * RFC 9728 protected-resource metadata, resolved dynamically through the
	 * registry so any registered resource path is served by one route — the
	 * static instance MCP resource today, per-workflow resources later.
	 */
	@Get('/.well-known/oauth-protected-resource/*resourcePath', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: wellKnownIpRateLimit,
	})
	async protectedResourceMetadata(req: Request, res: Response) {
		this.setCorsHeaders(res);

		const resourcePath =
			'/' +
			(Array.isArray(req.params.resourcePath)
				? req.params.resourcePath.join('/')
				: req.params.resourcePath); // Wildcard params are captured as arrays
		const resource = await this.resourceRegistry.getByResourcePath(resourcePath);
		if (!resource) {
			res.status(404).json({ message: 'Unknown protected resource' });
			return;
		}

		const baseUrl = this.urlService.getInstanceBaseUrl();
		const metadata: Record<string, unknown> = {
			resource: resource.getResourceUrl(),
			bearer_methods_supported: ['header'],
			authorization_servers: [baseUrl],
		};

		if (resource.scopes.length > 0) {
			metadata.scopes_supported = resource.scopes;
		}

		res.json(metadata);
	}
}
