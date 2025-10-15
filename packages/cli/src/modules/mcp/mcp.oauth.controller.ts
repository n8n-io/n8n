import { authorizationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/authorize.js';
import { clientRegistrationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/register.js';
import { revocationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/revoke.js';
import { tokenHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/token.js';
import { Logger } from '@n8n/backend-common';
import { Get, RootLevelController, StaticRouterMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response, Request, Router } from 'express';

import { McpOAuthService } from './mcp-oauth-service';

const mcpOAuthService = Container.get(McpOAuthService);

@RootLevelController('/')
export class McpOAuthController {
	constructor(private readonly logger: Logger) {
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

	@Get('/.well-known/oauth-authorization-server', { skipAuth: true, usesTemplates: true })
	async metadata(req: Request, res: Response) {
		this.logger.info('Serving OAuth 2.0 Authorization Server Metadata');
		res.json({
			issuer: 'http://localhost:5678/mcp-oauth',
			authorization_endpoint: 'http://localhost:5678/mcp-oauth/authorize',
			token_endpoint: 'http://localhost:5678/mcp-oauth/token',
			registration_endpoint: 'http://localhost:5678/mcp-oauth/register',
			response_types_supported: ['code'],
			grant_types_supported: ['authorization_code', 'refresh_token'],
			token_endpoint_auth_methods_supported: ['none'],
			revocation_endpoint: 'http://localhost:5678/mcp-oauth/revoke',
			code_challenge_methods_supported: ['S256'],
		});
	}
}
