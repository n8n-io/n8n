/**
 * Google OAuth2 SSO for OmiGroup
 *
 * Implements Google Sign-In using google-auth-library.
 * This is a completely independent implementation that does NOT use
 * n8n's enterprise OIDC module.
 *
 * Flow:
 * 1. User clicks "Sign in with Google" -> GET /omi/auth/google/login
 * 2. Redirect to Google consent screen
 * 3. Google redirects back -> GET /omi/auth/google/callback
 * 4. We verify the token, check domain whitelist, find/create user
 * 5. Issue n8n-compatible JWT (with correct hash format), set cookie, redirect
 *
 * JWT compatibility:
 * n8n's JWT payload = { id, hash, browserId?, usedMfa? }
 * where hash = SHA256(email:password).base64().substring(0, 10)
 * Cookie config matches n8n's auth.cookie settings.
 */

import { OAuth2Client } from 'google-auth-library';
import type { Express, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { getConfig } from '../../config';
import { AUTH_COOKIE_NAME, createN8nCompatibleJwt } from '../../utils/jwt';
import { isDomainAllowed } from '../../admin/domain-whitelist';
import { findOrCreateUser } from './user-sync';

let oauthClient: OAuth2Client | null = null;

function getOAuthClient(): OAuth2Client {
	if (oauthClient) return oauthClient;

	const config = getConfig();
	oauthClient = new OAuth2Client(
		config.google.clientId,
		config.google.clientSecret,
		config.google.callbackUrl,
	);

	return oauthClient;
}

/**
 * Mount Google SSO routes on the Express app.
 * Called from the n8n.ready external hook.
 */
export function mountGoogleSsoRoutes(app: Express): void {
	const config = getConfig();

	// -----------------------------------------------
	// GET /omi/auth/google/login
	// Initiates Google OAuth2 flow
	// -----------------------------------------------
	app.get('/omi/auth/google/login', (_req: Request, res: Response) => {
		const client = getOAuthClient();
		const state = randomBytes(16).toString('hex');

		const authorizeUrl = client.generateAuthUrl({
			access_type: 'offline',
			scope: [
				'openid',
				'https://www.googleapis.com/auth/userinfo.email',
				'https://www.googleapis.com/auth/userinfo.profile',
			],
			state,
			prompt: 'select_account',
		});

		// Store state in cookie for CSRF protection
		res.cookie('omi-oauth-state', state, {
			httpOnly: true,
			secure: config.cookie.secure,
			maxAge: 5 * 60 * 1000, // 5 minutes
			sameSite: 'lax',
		});

		res.redirect(authorizeUrl);
	});

	// -----------------------------------------------
	// GET /omi/auth/google/callback
	// Handles the Google OAuth2 callback
	// -----------------------------------------------
	app.get('/omi/auth/google/callback', async (req: Request, res: Response) => {
		try {
			const { code, state, error: oauthError } = req.query as Record<string, string>;

			if (oauthError) {
				console.error('[OmiGroup] Google OAuth error:', oauthError);
				return res.redirect(`${config.n8n.baseUrl}/signin?error=oauth_denied`);
			}

			if (!code) {
				return res.redirect(`${config.n8n.baseUrl}/signin?error=no_code`);
			}

			// Verify CSRF state
			const storedState = req.cookies?.['omi-oauth-state'];
			if (!storedState || storedState !== state) {
				console.error('[OmiGroup] OAuth state mismatch');
				return res.redirect(`${config.n8n.baseUrl}/signin?error=invalid_state`);
			}

			// Clear state cookie
			res.clearCookie('omi-oauth-state');

			// Exchange code for tokens
			const client = getOAuthClient();
			const { tokens } = await client.getToken(code);

			if (!tokens.id_token) {
				console.error('[OmiGroup] No id_token received from Google');
				return res.redirect(`${config.n8n.baseUrl}/signin?error=no_token`);
			}

			// Verify the ID token
			const ticket = await client.verifyIdToken({
				idToken: tokens.id_token,
				audience: config.google.clientId,
			});

			const googlePayload = ticket.getPayload();
			if (!googlePayload || !googlePayload.email) {
				console.error('[OmiGroup] Invalid Google token payload');
				return res.redirect(`${config.n8n.baseUrl}/signin?error=invalid_token`);
			}

			// Check domain whitelist
			const email = googlePayload.email.toLowerCase();
			if (!isDomainAllowed(email)) {
				console.warn(`[OmiGroup] Login rejected for domain: ${email}`);
				return res.redirect(`${config.n8n.baseUrl}/signin?error=domain_not_allowed`);
			}

			// Find or create user in n8n's database
			const user = await findOrCreateUser({
				email,
				firstName: googlePayload.given_name ?? '',
				lastName: googlePayload.family_name ?? '',
				googleId: googlePayload.sub,
			});

			if (!user) {
				console.error(`[OmiGroup] Failed to find/create user: ${email}`);
				return res.redirect(`${config.n8n.baseUrl}/signin?error=user_creation_failed`);
			}

			if (user.disabled) {
				console.warn(`[OmiGroup] Login rejected for disabled user: ${email}`);
				return res.redirect(`${config.n8n.baseUrl}/signin?error=user_disabled`);
			}

			// Extract browser ID from request headers (same as n8n does)
			const browserId = req.headers['browser-id'] as string | undefined;

			// Create n8n-compatible JWT with correct payload format:
			// { id, hash: SHA256(email:bcryptHash).base64().substring(0,10), browserId?, usedMfa }
			const jwtToken = createN8nCompatibleJwt(
				{
					id: user.id,
					email: user.email,
					password: user.password, // bcrypt hash from DB, used in JWT hash computation
				},
				browserId,
			);

			// Set the auth cookie using n8n's cookie configuration
			const durationHours = parseInt(
				process.env.N8N_USER_MANAGEMENT_JWT_DURATION_HOURS ?? '168',
				10,
			);

			res.cookie(AUTH_COOKIE_NAME, jwtToken, {
				httpOnly: true,
				secure: config.cookie.secure,
				sameSite: config.cookie.sameSite,
				maxAge: durationHours * 3600 * 1000, // Convert hours to milliseconds
			});

			console.log(`[OmiGroup] User logged in via Google SSO: ${email}`);

			// Redirect to n8n dashboard
			res.redirect(config.n8n.baseUrl);
		} catch (err) {
			console.error('[OmiGroup] Google SSO callback error:', err);
			res.redirect(`${config.n8n.baseUrl}/signin?error=sso_error`);
		}
	});

	// -----------------------------------------------
	// GET /omi/auth/google/status
	// Returns SSO configuration status (for frontend)
	// -----------------------------------------------
	app.get('/omi/auth/google/status', (_req: Request, res: Response) => {
		res.json({
			enabled: true,
			provider: 'google',
			loginUrl: '/omi/auth/google/login',
		});
	});

	console.log('[OmiGroup] Google SSO routes mounted');
}
