import { authorizationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/authorize.js';
import { clientRegistrationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/register.js';
import { revocationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/revoke.js';
import { tokenHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/token.js';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Get, Options, RootLevelController, StaticRouterMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response, Request, RequestHandler, Router } from 'express';

import { UrlService } from '@/services/url.service';

import { McpOAuthService, SUPPORTED_SCOPES } from './mcp-oauth-service';
import { MCP_ACCESS_DISABLED_ERROR_MESSAGE } from './mcp.constants';
import { buildMcpClientLimitReachedMessage } from './mcp.errors';
import { McpSettingsService } from './mcp.settings.service';

const mcpOAuthService = Container.get(McpOAuthService);
const mcpSettingsService = Container.get(McpSettingsService);
const globalConfig = Container.get(GlobalConfig);
const logger = Container.get(Logger);

/**
 * Middleware that rejects requests when MCP access is disabled.
 * Prevents unauthenticated access to OAuth endpoints when MCP is turned off.
 */
const mcpEnabledGuard: RequestHandler = async (_req, res, next) => {
	const enabled = await mcpSettingsService.getEnabled();
	if (!enabled) {
		res.status(403).json({ error: MCP_ACCESS_DISABLED_ERROR_MESSAGE });
		return;
	}
	next();
};

/**
 * Pre-check guard for the unauthenticated DCR endpoint. Short-circuits with
 * a structured `server_error` response when the instance is at the
 * registered-client cap. Returns HTTP 503 because limit exhaustion is a
 * temporary capacity condition, not an internal failure.
 *
 * The post-insert rollback in `enforceClientLimit` throws
 * `McpClientLimitReachedError` (a `ServerError` subclass) so the SDK
 * surfaces the same body shape on the rare race path; the SDK's register
 * handler hardcodes 500 for `ServerError`, so that path returns 500 with
 * an identical body.
 */
const mcpClientLimitGuard: RequestHandler = async (_req, res, next) => {
	if (await mcpOAuthService.isClientLimitReached()) {
		const limit = globalConfig.endpoints.mcpMaxRegisteredClients;
		logger.warn('MCP OAuth client registration rejected: instance limit reached (pre-check)', {
			limit,
		});
		res.status(503).json({
			error: 'server_error',
			error_description: buildMcpClientLimitReachedMessage(limit),
		});
		return;
	}
	next();
};

@RootLevelController('/')
export class McpOAuthController {
	constructor(private readonly urlService: UrlService) {}

	// Add CORS headers for OAuth discovery endpoints
	private setCorsHeaders(res: Response) {
		// Allow requests from any origin for OAuth discovery
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
		res.header('Access-Control-Allow-Headers', 'Content-Type');
	}

	static routers: StaticRouterMetadata[] = [
		{
			path: '/mcp-oauth/register',
			router: clientRegistrationHandler({ clientsStore: mcpOAuthService.clientsStore }) as Router,
			skipAuth: true,
			middlewares: [mcpEnabledGuard, mcpClientLimitGuard],
			ipRateLimit: { limit: 10, windowMs: 5 * Time.minutes.toMilliseconds },
		},
		{
			path: '/mcp-oauth/authorize',
			router: authorizationHandler({ provider: mcpOAuthService }) as Router,
			skipAuth: true,
			middlewares: [mcpEnabledGuard],
			ipRateLimit: { limit: 50, windowMs: 5 * Time.minutes.toMilliseconds },
		},
		{
			path: '/mcp-oauth/token',
			router: tokenHandler({ provider: mcpOAuthService }) as Router,
			skipAuth: true,
			middlewares: [mcpEnabledGuard],
			ipRateLimit: { limit: 20, windowMs: 5 * Time.minutes.toMilliseconds },
		},
		{
			path: '/mcp-oauth/revoke',
			router: revocationHandler({ provider: mcpOAuthService }) as Router,
			skipAuth: true,
			middlewares: [mcpEnabledGuard],
			ipRateLimit: { limit: 30, windowMs: 5 * Time.minutes.toMilliseconds },
		},
	];

	@Options('/.well-known/oauth-authorization-server', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: { limit: 100, windowMs: 5 * Time.minutes.toMilliseconds },
	})
	metadataOptions(_req: Request, res: Response) {
		this.setCorsHeaders(res);
		res.status(204).end();
	}

	@Get('/.well-known/oauth-authorization-server', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: { limit: 100, windowMs: 5 * Time.minutes.toMilliseconds },
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
			scopes_supported: SUPPORTED_SCOPES,
		};

		res.json(metadata);
	}

	@Options('/.well-known/oauth-protected-resource/mcp-server/http', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: { limit: 100, windowMs: 5 * Time.minutes.toMilliseconds },
	})
	protectedResourceMetadataOptions(_req: Request, res: Response) {
		this.setCorsHeaders(res);
		res.status(204).end();
	}

	@Get('/.well-known/oauth-protected-resource/mcp-server/http', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: { limit: 100, windowMs: 5 * Time.minutes.toMilliseconds },
	})
	protectedResourceMetadata(_req: Request, res: Response) {
		this.setCorsHeaders(res);

		const baseUrl = this.urlService.getInstanceBaseUrl();
		res.json({
			resource: `${baseUrl}/mcp-server/http`,
			bearer_methods_supported: ['header'],
			authorization_servers: [baseUrl],
			scopes_supported: SUPPORTED_SCOPES,
		});
	}
}
