import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { Response } from 'express';

import { JwtService } from '@/services/jwt.service';

export interface OAuthSessionPayload {
	clientId: string;
	redirectUri: string;
	codeChallenge: string;
	state: string | null;
	resource?: string;
	/** Scopes the client asked for on /authorize, pre-filtered to the resource's supported scopes. */
	requestedScopes?: string[];
}

export const OAUTH_SESSION_COOKIE_NAME = 'n8n-oauth-session';
const SESSION_EXPIRY_MS = 10 * Time.minutes.toMilliseconds; // 10 minutes

/**
 * Manages OAuth authorization session state using JWT-based cookies
 * Stores temporary session data during the authorization flow
 */
@Service()
export class OAuthSessionService {
	constructor(
		private readonly jwtService: JwtService,
		private readonly globalConfig: GlobalConfig,
	) {}

	/**
	 * Create OAuth session token and set it as a cookie
	 */
	createSession(res: Response, payload: OAuthSessionPayload): void {
		const sessionToken = this.jwtService.sign(payload, {
			expiresIn: '10m',
		});

		res.cookie(OAUTH_SESSION_COOKIE_NAME, sessionToken, {
			httpOnly: true,
			secure: this.globalConfig.auth.cookie.secure,
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
		res.clearCookie(OAUTH_SESSION_COOKIE_NAME);
	}

	/**
	 * Extract session token from request cookies
	 */
	getSessionToken(cookies: Record<string, string | undefined>): string | undefined {
		return cookies[OAUTH_SESSION_COOKIE_NAME];
	}
}
