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
	async handleCallback(
		req: AuthlessRequest<
			{},
			{},
			{},
			{ code?: string; state?: string; error?: string; error_description?: string }
		>,
		res: Response,
	): Promise<void> {
		console.log('=== AZURE AD CALLBACK HANDLER CALLED ===');

		if (!this.azureAdService.isEnabled()) {
			throw new BadRequestError('Azure AD authentication is not enabled');
		}

		const { code, state, error, error_description } = req.query;

		this.logger.debug('Azure AD callback received', {
			hasCode: !!code,
			hasState: !!state,
			hasError: !!error,
			error,
			error_description,
		});

		// Also console.log for debugging
		console.log('Azure AD callback:', {
			code: code ? `${code.substring(0, 20)}...` : 'missing',
			state: state ? `${state.substring(0, 20)}...` : 'missing',
			error,
			error_description,
			fullQueryKeys: Object.keys(req.query),
		});

		// Handle Azure AD errors
		if (error) {
			console.log('ERROR FROM AZURE AD:', { error, error_description });
			this.logger.error('Azure AD returned an error', {
				error,
				description: error_description,
				fullQuery: req.query,
			});

			// Redirect to home page (which will show setup or login page)
			res.redirect(
				`/?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(error_description || '')}`,
			);
			return;
		}

		// Validate required parameters
		if (typeof code !== 'string' || typeof state !== 'string') {
			throw new BadRequestError('Invalid callback parameters');
		}

		// Verify state
		const stateData = this.stateStore.get(state);
		if (!stateData) {
			this.logger.warn('Invalid or expired state token', { state });
			throw new BadRequestError('Invalid or expired authentication request');
		}

		// Remove used state
		this.stateStore.delete(state);

		try {
			// Exchange code for user information
			const user = await this.azureAdService.handleCallback(code, state);

			// Issue authentication cookie
			this.authService.issueCookie(res, user, false, req.browserId);

			// Emit login event
			this.eventService.emit('user-logged-in', {
				user,
				authenticationMethod: 'email', // Using 'email' as base authentication method
			});

			this.logger.info('User logged in via Azure AD', {
				userId: user.id,
				email: user.email,
			});

			// Determine redirect URL
			let redirectUrl = '/';
			if (stateData.redirectUrl) {
				// Validate redirect URL is safe
				if (this.isRedirectSafe(stateData.redirectUrl)) {
					redirectUrl = stateData.redirectUrl;
				} else {
					this.logger.warn('Unsafe redirect URL detected', {
						url: stateData.redirectUrl,
					});
				}
			}

			// Redirect to app
			res.redirect(redirectUrl);
		} catch (error) {
			this.logger.error('Azure AD callback failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			this.eventService.emit('user-login-failed', {
				userEmail: 'unknown',
				authenticationMethod: 'email',
				reason: 'callback_failed',
			});

			// Redirect to login page with error
			res.redirect('/signin?error=authentication_failed');
		}
	}

	/**
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
