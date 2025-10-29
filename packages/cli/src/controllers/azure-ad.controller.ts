import { randomBytes } from 'crypto';

import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { AzureAdService } from '@/auth/azure-ad.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import type { AuthlessRequest } from '@/requests';
import { AuthError } from '@/errors/response-errors/auth.error';
import { UrlService } from '@/services/url.service';
import { issueCookie } from '@/auth/jwt';
import { sendErrorResponse } from '@/response-helper';

// Request type definitions
declare namespace AzureAdRequest {
	type Callback = AuthlessRequest<
		{},
		{},
		{},
		{
			code?: string;
			state?: string;
			error?: string;
			error_description?: string;
		}
	>;

	type SsoLogin = AuthlessRequest<
		{},
		{},
		{},
		{
			token?: string;
		}
	>;
}

@RestController('/azure-ad')
export class AzureAdController {
	// Store state tokens temporarily (in production, use Redis or database)
	private stateStore = new Map<string, { createdAt: number; redirectUrl?: string }>();
	private readonly STATE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

	constructor(
		private readonly logger: Logger,
		private readonly azureAdService: AzureAdService,
		private readonly authService: AuthService,
		private readonly eventService: EventService,
		private readonly urlService: UrlService,
	) {
		// Clean up expired states periodically
		setInterval(() => this.cleanupExpiredStates(), 60 * 1000); // Every minute
	}

	/**
	 * Initiate Azure AD login flow
	 * GET /rest/azure-ad/login
	 */
	@Get('/login', { skipAuth: true })
	async initiateLogin(req: AuthlessRequest<{}, {}, {}, { redirect?: string }>, res: Response) {
		if (!this.azureAdService.isEnabled()) {
			throw new BadRequestError('Azure AD authentication is not enabled');
		}

		try {
			// Generate secure random state
			const state = randomBytes(32).toString('hex');

			// Store state with optional redirect URL
			const redirectUrl = req.query.redirect ? decodeURIComponent(req.query.redirect) : undefined;

			this.stateStore.set(state, {
				createdAt: Date.now(),
				redirectUrl,
			});

			// Get authorization URL from MSAL
			const authUrl = await this.azureAdService.getAuthorizationUrl(state);

			this.logger.debug('Initiating Azure AD login', { state });

			// Redirect to Azure AD
			res.redirect(authUrl);
		} catch (error) {
			this.logger.error('Failed to initiate Azure AD login', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}

	/**
	 * Handle OAuth callback from Azure AD
	 * GET /rest/azure-ad/callback
	 */
	@Get('/callback', { skipAuth: true })
	async handleCallback(req: AzureAdRequest.Callback): Promise<void> {
		try {
			const { code, state, error, error_description: errorDescription } = req.query;

			this.logger.debug('=== AZURE AD CALLBACK HANDLER CALLED ===');
			this.logger.debug('Azure AD callback:', {
				code: code ? `${code.substring(0, 20)}...` : undefined,
				state: state ? `${state.substring(0, 20)}...` : undefined,
				error,
				error_description: errorDescription,
				fullQueryKeys: Object.keys(req.query),
			});

			if (!req.res) {
				this.logger.error('Response object is undefined');
				return;
			}

			if (error) {
				this.logger.error('Azure AD authentication error', { error, errorDescription });
				return sendErrorResponse(req.res, new AuthError(`Azure AD error: ${errorDescription}`));
			}

			if (!code || !state) {
				this.logger.error('Missing code or state in Azure AD callback');
				return sendErrorResponse(req.res, new AuthError('Missing required parameters'));
			}

			const user = await this.azureAdService.handleCallback(code, state);

			// Ensure res exists
			if (!req.res) {
				throw new AuthError('Response object not available');
			}

			await issueCookie(req.res, user);

			this.logger.info('User successfully authenticated via Azure AD');
			this.eventService.emit('user-logged-in', {
				user,
				authenticationMethod: 'azuread',
			});

			this.logger.info('User logged in via Azure AD');
			return req.res.redirect(this.urlService.getInstanceBaseUrl());
		} catch (error) {
			this.logger.error('Error in Azure AD callback', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (req.res) {
				return sendErrorResponse(req.res, error as Error);
			}
		}
	}

	/**
	 * SSO login endpoint - accepts id_token from already authenticated SPA
	 */
	@Get('/sso-login', { skipAuth: true })
	async handleSsoLogin(req: AzureAdRequest.SsoLogin): Promise<void> {
		try {
			const { token } = req.query;

			if (!req.res) {
				this.logger.error('Response object is undefined');
				return;
			}

			if (!token) {
				this.logger.error('Missing token in SSO login request');
				return sendErrorResponse(req.res, new AuthError('Missing authentication token'));
			}

			this.logger.debug('SSO login attempt with token');

			const user = await this.azureAdService.handleSsoLogin(token);

			// Ensure res exists
			if (!req.res) {
				throw new AuthError('Response object not available');
			}

			await issueCookie(req.res, user);

			this.logger.info('User successfully authenticated via SSO');
			this.eventService.emit('user-logged-in', {
				user,
				authenticationMethod: 'azuread',
			});

			return req.res.redirect(this.urlService.getInstanceBaseUrl());
		} catch (error) {
			this.logger.error('Error in SSO login', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (req.res) {
				return sendErrorResponse(req.res, error as Error);
			}
		}
	} /**
	 * Get Azure AD configuration info (for frontend)
	 * GET /rest/azure-ad/config
	 */
	@Get('/config', { skipAuth: true })
	getConfig() {
		return {
			enabled: this.azureAdService.isEnabled(),
			loginLabel: this.azureAdService.getLoginLabel(),
		};
	}

	/**
	 * Test endpoint to check Azure AD configuration
	 * GET /rest/azure-ad/test
	 */
	@Get('/test')
	testConfig(req: AuthenticatedRequest) {
		// Only allow owner to test config
		if (req.user.role.slug !== 'owner') {
			throw new BadRequestError('Only owners can test Azure AD configuration');
		}

		const validation = this.azureAdService.validateConfig();

		return {
			...validation,
			enabled: this.azureAdService.isEnabled(),
			loginLabel: this.azureAdService.getLoginLabel(),
		};
	}

	/**
	 * Clean up expired state tokens
	 */
	private cleanupExpiredStates() {
		const now = Date.now();
		const expiredStates: string[] = [];

		for (const [state, data] of this.stateStore.entries()) {
			if (now - data.createdAt > this.STATE_TIMEOUT) {
				expiredStates.push(state);
			}
		}

		for (const state of expiredStates) {
			this.stateStore.delete(state);
		}

		if (expiredStates.length > 0) {
			this.logger.debug(`Cleaned up ${expiredStates.length} expired state tokens`);
		}
	}

	/**
	 * Validate redirect URL is safe
	 */
	private isRedirectSafe(redirect: string): boolean {
		// Allow relative URLs
		if (redirect.startsWith('/')) {
			return true;
		}

		try {
			// Only allow same origin
			const url = new URL(redirect);
			const currentOrigin = new URL(
				process.env.N8N_EDITOR_BASE_URL ?? `http://localhost:${process.env.N8N_PORT ?? 5678}`,
			).origin;

			return url.origin === currentOrigin;
		} catch {
			return false;
		}
	}
}
