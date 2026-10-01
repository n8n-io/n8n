import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import type { CookieOptions, Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
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

/** Each pending authorization request owns a cookie, named by its flow id. */
export const OAUTH_SESSION_COOKIE_PREFIX = 'n8n-oauth-session-';
const SESSION_EXPIRY_MS = 10 * Time.minutes.toMilliseconds; // 10 minutes

/**
 * Pending flows one browser may hold at once, which is what keeps the request
 * header bounded: the consent screen is sent every pending flow's cookie.
 *
 * Two /authorize calls that overlap both read the same cookie snapshot, so a
 * burst can hold more than this for a moment. The next /authorize sees them all
 * and prunes back to the cap, so an overshoot decays instead of accumulating.
 */
const MAX_PENDING_FLOWS = 3;

/** The shape `newFlowId` mints. Checked before a flow id reaches a cookie name. */
const FLOW_ID_PATTERN = /^[0-9a-z]{6,12}-[0-9a-f]{24}$/;

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
	 * Store one authorization request under a new flow id, and return that id
	 * for the consent screen to ask for its own session by.
	 *
	 * One cookie per /authorize call, so a second request cannot replace the one
	 * a consent screen is already showing: the parameters the user approves stay
	 * the ones they were shown.
	 */
	createSession(res: Response, payload: OAuthSessionPayload): string {
		const flowId = this.newFlowId();
		const sessionToken = this.jwtService.sign(payload, {
			expiresIn: '10m',
		});

		this.evictOldestFlows(res, MAX_PENDING_FLOWS - 1);

		res.cookie(OAUTH_SESSION_COOKIE_PREFIX + flowId, sessionToken, {
			...this.cookieOptions(),
			maxAge: SESSION_EXPIRY_MS,
		});

		return flowId;
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

	/** Clear one flow's cookie, leaving the browser's other pending flows. */
	clearSession(res: Response, flowId: string): void {
		if (!FLOW_ID_PATTERN.test(flowId)) return;
		res.clearCookie(OAUTH_SESSION_COOKIE_PREFIX + flowId, this.cookieOptions());
	}

	getSessionToken(cookies: Record<string, string | undefined>, flowId: string): string | undefined {
		if (!FLOW_ID_PATTERN.test(flowId)) return undefined;
		return cookies[OAUTH_SESSION_COOKIE_PREFIX + flowId];
	}

	/**
	 * A base36 millisecond prefix plus 96 random bits. The prefix makes the
	 * cookie names sort by age, which is all `evictOldestFlows` needs; the
	 * random half is what makes a flow id unguessable.
	 */
	private newFlowId(): string {
		return `${Date.now().toString(36)}-${randomBytes(12).toString('hex')}`;
	}

	/**
	 * Drop the oldest pending flows, leaving room for `keep` of them. Flow ids
	 * minted by one instance share a prefix length, so sorting the cookie names
	 * sorts the flows oldest first.
	 */
	private evictOldestFlows(res: Response, keep: number): void {
		const pending = Object.keys(this.parsedCookies(res.req))
			.filter((name) => name.startsWith(OAUTH_SESSION_COOKIE_PREFIX))
			.sort();

		for (const name of pending.slice(0, Math.max(0, pending.length - keep))) {
			res.clearCookie(name, this.cookieOptions());
		}
	}

	/**
	 * Attributes come from the instance's cookie config, the same source as the
	 * auth cookie, with `sameSite` clamped to a `lax` minimum because `strict`
	 * would drop the cookie on a hand-off into /authorize from another site.
	 *
	 * The default path is deliberate. /authorize and the consent endpoints sit
	 * under different roots, so scoping to either one hides the pending flows
	 * from the other, and `evictOldestFlows` would never see a cookie to evict.
	 */
	private cookieOptions(): CookieOptions {
		const { secure, samesite } = this.globalConfig.auth.cookie;
		return {
			httpOnly: true,
			secure,
			sameSite: samesite === 'strict' ? 'lax' : samesite,
		};
	}

	private parsedCookies(req: Request): Record<string, unknown> {
		const cookies: unknown = req.cookies;
		if (cookies === null || typeof cookies !== 'object') return {};
		return { ...cookies };
	}
}
