import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { Response } from 'express';
import { z } from 'zod';

import { JwtService } from '@/services/jwt.service';

const oauthSessionPayloadSchema = z.object({
	clientId: z.string(),
	redirectUri: z.string(),
	codeChallenge: z.string(),
	state: z.string().nullable(),
	resource: z.string().optional(),
	/** Scopes the client asked for on /authorize, pre-filtered to the resource's supported scopes. */
	requestedScopes: z.array(z.string()).optional(),
});

export type OAuthSessionPayload = z.infer<typeof oauthSessionPayloadSchema>;

export const OAUTH_SESSION_COOKIE_NAME = 'n8n-oauth-session';
const SESSION_EXPIRY_MS = 10 * Time.minutes.toMilliseconds; // 10 minutes

/**
 * Manages OAuth authorization session state using JWT-based cookies
 * Stores temporary session data during the authorization flow
 */
@Service()
export class OAuthSessionService {
	constructor(private readonly jwtService: JwtService) {}

	/**
	 * Create OAuth session token and set it as a cookie
	 */
	createSession(res: Response, payload: OAuthSessionPayload): void {
		const sessionToken = this.jwtService.sign(payload, {
			expiresIn: '10m',
		});

		res.cookie(OAUTH_SESSION_COOKIE_NAME, sessionToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: SESSION_EXPIRY_MS,
		});
	}

	/**
	 * Verify and decode OAuth session token.
	 *
	 * A valid signature proves only that this instance signed the token. The
	 * callers below read every field as a present string, so parse the payload
	 * here and reject anything that is not an authorization session.
	 */
	verifySession(sessionToken: string): OAuthSessionPayload {
		const payload = this.jwtService.verify<unknown>(sessionToken);
		return oauthSessionPayloadSchema.parse(payload);
	}

	/**
	 * Clear OAuth session cookie
	 */
	clearSession(res: Response): void {
		res.clearCookie(OAUTH_SESSION_COOKIE_NAME);
	}

	/**
	 * Extract session token from request cookies
	 */
	getSessionToken(cookies: Record<string, string | undefined>): string | undefined {
		return cookies[OAUTH_SESSION_COOKIE_NAME];
	}
}
