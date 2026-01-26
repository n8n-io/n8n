import { authorizationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/authorize.js';
import { clientRegistrationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/register.js';
import { revocationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/revoke.js';
import { tokenHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/token.js';
import { Time } from '@n8n/constants';
import { Get, Options, RootLevelController, StaticRouterMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response, Request, Router } from 'express';

import { UrlService } from '@/services/url.service';

import { McpOAuthService, SUPPORTED_SCOPES } from './mcp-oauth-service';

const mcpOAuthService = Container.get(McpOAuthService);

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
			ipRateLimit: { limit: 10, windowMs: 5 * Time.minutes.toMilliseconds },
		},
		{
			path: '/mcp-oauth/authorize',
			router: authorizationHandler({ provider: mcpOAuthService }) as Router,
			skipAuth: true,
			ipRateLimit: { limit: 50, windowMs: 5 * Time.minutes.toMilliseconds },
		},
		{
			path: '/mcp-oauth/token',
			router: tokenHandler({ provider: mcpOAuthService }) as Router,
			skipAuth: true,
			ipRateLimit: { limit: 20, windowMs: 5 * Time.minutes.toMilliseconds },
		},
		{
			path: '/mcp-oauth/revoke',
			router: revocationHandler({ provider: mcpOAuthService }) as Router,
			skipAuth: true,
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
