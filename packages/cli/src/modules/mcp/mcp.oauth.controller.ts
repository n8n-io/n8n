import { authorizationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/authorize.js';
import { clientRegistrationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/register.js';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, RootLevelController, StaticRouterMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response, Request, Router } from 'express';
import { Logger } from '@n8n/backend-common';

import { McpOAuthService } from './mcp-oauth-service';
import { tokenHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/token';
import { revocationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/revoke';

const mcpOAuthService = Container.get(McpOAuthService);

@RootLevelController('/')
export class McpOAuthController {
	constructor(
		private readonly logger: Logger,
		private readonly mcpOAuthService: McpOAuthService,
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

	/**
	 * Get consent details for the current OAuth session
	 * Called by the consent page to display client information
	 */
	@Get('/mcp-oauth/consent/details', { skipAuth: false })
	async getConsentDetails(req: AuthenticatedRequest, res: Response) {
		try {
			// Get the OAuth session ID from cookie
			const sessionId = req.cookies['n8n-oauth-session'];

			if (!sessionId) {
				return res.status(400).json({
					status: 'error',
					message: 'Invalid or expired authorization session',
				});
			}

			// Get consent details using the service
			const consentDetails = await this.mcpOAuthService.getConsentDetails(sessionId, req.user.id);

			if (!consentDetails) {
				return res.status(400).json({
					status: 'error',
					message: 'Invalid or expired authorization session',
				});
			}

			return res.json({
				clientName: consentDetails.clientName,
				clientId: consentDetails.clientId,
				scopes: consentDetails.scopes,
			});
		} catch (error) {
			this.logger.error('Failed to get consent details', { error });
			return res.status(500).json({
				status: 'error',
				message: 'Failed to load authorization details',
			});
		}
	}

	/**
	 * Handle consent approval or denial
	 * Called when user clicks "Allow" or "Deny" on the consent page
	 */
	@Post('/mcp-oauth/consent/approve', { skipAuth: false })
	async approveConsent(req: AuthenticatedRequest, res: Response) {
		try {
			const { approved } = req.body as { approved: boolean };

			if (typeof approved !== 'boolean') {
				return res.status(400).json({
					status: 'error',
					message: 'Missing or invalid "approved" field',
				});
			}

			// Get the OAuth session ID from cookie
			const sessionId = req.cookies['n8n-oauth-session'];

			if (!sessionId) {
				return res.status(400).json({
					status: 'error',
					message: 'Invalid or expired authorization session',
				});
			}

			// Process the consent decision using the service
			const result = await this.mcpOAuthService.handleConsentDecision(
				sessionId,
				req.user.id,
				approved,
			);

			// Clear the session cookie
			res.clearCookie('n8n-oauth-session');

			// Return the redirect URL (includes authorization code or error)
			return res.json({
				status: 'success',
				redirectUrl: result.redirectUrl,
			});
		} catch (error) {
			this.logger.error('Failed to process consent', { error });

			// Clear the session cookie even on error
			res.clearCookie('n8n-oauth-session');

			return res.status(500).json({
				status: 'error',
				message: error instanceof Error ? error.message : 'Failed to process authorization',
			});
		}
	}
}
