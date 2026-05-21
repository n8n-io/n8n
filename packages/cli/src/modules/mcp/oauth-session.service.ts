import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { Response } from 'express';

import { JwtService } from '@/services/jwt.service';

export interface OAuthSessionPayload {
	clientId: string;
	redirectUri: string;
	codeChallenge: string;
	state: string | null;
}

const COOKIE_NAME = 'n8n-oauth-session';
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

		res.cookie(COOKIE_NAME, sessionToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: SESSION_EXPIRY_MS,
		});
	}

	/**
	 * Verify and decode OAuth session token
	 */
	verifySession(sessionToken: string): OAuthSessionPayload {
		return this.jwtService.verify<OAuthSessionPayload>(sessionToken);
	}

	/**
	 * Clear OAuth session cookie
	 */
	clearSession(res: Response): void {
		res.clearCookie(COOKIE_NAME);
	}

	/**
	 * Extract session token from request cookies
	 */
	getSessionToken(cookies: Record<string, string | undefined>): string | undefined {
		return cookies[COOKIE_NAME];
	}
}
