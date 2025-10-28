import { authorizationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/authorize.js';
import { clientRegistrationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/register.js';
import { revocationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/revoke.js';
import { tokenHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/token.js';
import { Logger } from '@n8n/backend-common';
import { Get, Options, RootLevelController, StaticRouterMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response, Request, Router } from 'express';

import { McpOAuthService } from './mcp-oauth-service';
import { UrlService } from '@/services/url.service';

const mcpOAuthService = Container.get(McpOAuthService);

@RootLevelController('/')
export class McpOAuthController {
	constructor(
		private readonly logger: Logger,
		private readonly urlService: UrlService,
	) {
		this.logger.info('McpOAuthController initialized');
	}

	static routers: StaticRouterMetadata[] = [
		{
			path: '/mcp-oauth/register',
			router: clientRegistrationHandler({ clientsStore: mcpOAuthService.clientsStore }) as Router,
			skipAuth: true,
		},
		{
			path: '/mcp-oauth/authorize',
			router: authorizationHandler({ provider: mcpOAuthService }) as Router,
			skipAuth: true,
		},
		{
			path: '/mcp-oauth/token',
			router: tokenHandler({ provider: mcpOAuthService }) as Router,
			skipAuth: true,
		},
		{
			path: '/mcp-oauth/revoke',
			router: revocationHandler({ provider: mcpOAuthService }) as Router,
			skipAuth: true,
		},
	];

	@Options('/.well-known/oauth-authorization-server', {
		skipAuth: true,
		usesTemplates: true,
	})
	async epale(req: Request, res: Response) {
		console.log('✅ OPTIONS handler hit for oauth-authorization-server');

		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
		res.header('Access-Control-Allow-Headers', '*');
		res.header('Access-Control-Max-Age', '86400'); // 24 hours
		res.status(204).send();
	}

	@Get('/.well-known/oauth-authorization-server', { skipAuth: true, usesTemplates: true })
	async metadata(req: Request, res: Response) {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
		res.header('Access-Control-Allow-Headers', '*');
		this.logger.info('Serving OAuth 2.0 Authorization Server Metadata');
		const epale = {
			issuer: this.urlService.getInstanceBaseUrl(),
			authorization_endpoint: `${this.urlService.getInstanceBaseUrl()}/mcp-oauth/authorize`,
			token_endpoint: `${this.urlService.getInstanceBaseUrl()}/mcp-oauth/token`,
			registration_endpoint: `${this.urlService.getInstanceBaseUrl()}/mcp-oauth/register`,
			revocation_endpoint: `${this.urlService.getInstanceBaseUrl()}/mcp-oauth/revoke`,
			response_types_supported: ['code'],
			grant_types_supported: ['authorization_code', 'refresh_token'],
			token_endpoint_auth_methods_supported: [
				'none', // Public clients (PKCE only)
				'client_secret_post', // Secret in request body
				'client_secret_basic', // Secret in Authorization header
			],
			code_challenge_methods_supported: ['S256'],
			// scopes_supported: ['mcp:read', 'mcp:write', 'mcp:execute'],
			// RFC 8707 support indicators
		};
		this.logger.info(
			`Serving OAuth 2.0 Authorization Server Metadata',
			${JSON.stringify(epale, undefined, 2)}`,
		);

		res.json(epale);
	}

	@Options('/.well-known/oauth-protected-resource/mcp-server/http', {
		skipAuth: true,
		usesTemplates: true,
	})
	async protectedResourceMetadataOptions(req: Request, res: Response) {
		console.log('✅ OPTIONS handler hit for oauth-protected-resource');

		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
		res.header('Access-Control-Allow-Headers', '*');
		res.header('Access-Control-Max-Age', '86400'); // 24 hours
		res.status(204).send();
	}

	@Get('/.well-known/oauth-protected-resource/mcp-server/http', {
		skipAuth: true,
		usesTemplates: true,
	})
	async protectedResourceMetadata(req: Request, res: Response) {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
		res.header('Access-Control-Allow-Headers', '*');

		this.logger.info('Serving OAuth 2.0 Protected Resource Metadata');
		console.log(
			JSON.stringify(
				{
					resource: `${this.urlService.getInstanceBaseUrl()}/mcp-server/http`,
					bearer_methods_supported: ['header'],
					authorization_servers: [`${this.urlService.getInstanceBaseUrl()}`],
				},
				undefined,
				2,
			),
		);
		res.json({
			resource: `${this.urlService.getInstanceBaseUrl()}/mcp-server/http`,
			bearer_methods_supported: ['header'],
			authorization_servers: [`${this.urlService.getInstanceBaseUrl()}`],
			scopes_supported: ['tool:listWorkflow'],
			// scopes_supported: ['mcp:read', 'mcp:write', 'mcp:execute'],
		});
	}
}
