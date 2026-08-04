import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { GLOBAL_OWNER_ROLE, InvalidAuthTokenRepository, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { createHash, randomBytes } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import type { StringValue as TimeUnitValue } from 'ms';

import { AUTH_COOKIE_NAME, RESPONSE_ERROR_MESSAGES } from '@/constants';
import { AuthError } from '@/errors/response-errors/auth.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { License } from '@/license';
import { MfaService } from '@/mfa/mfa.service';
import { JwtService } from '@/services/jwt.service';
import { UrlService } from '@/services/url.service';

interface AuthJwtPayload {
	/** User Id */
	id: string;
	/** This hash is derived from email and bcrypt of password */
	hash: string;
	/** This is a client generated unique string to prevent session hijacking */
	browserId?: string;
	/** This indicates if mfa was used during the creation of this token */
	usedMfa?: boolean;
	/** This indicates if the session originated from an embed login (cross-site cookie required) */
	isEmbed?: boolean;
	/**
	 * Delegation claim, RFC 8693 vocabulary. Present only on impersonated
	 * sessions: `id` above is the service account and `act.sub` is the human who
	 * entered impersonation.
	 *
	 * **Polarity note.** `token-exchange`'s `ScopedJwtStrategy` resolves the acting
	 * principal as `actor ?? subject` — the actor wins, because there a service
	 * speaks *for* a user with its own authority. Here it is the inverse: the human
	 * deliberately drops their authority and adopts the service account's, so the
	 * **subject is the acting principal** and the actor is inert for authorization.
	 * That is what makes API-key creation mint a key for the SA. Never derive a
	 * principal from `act`, and never route this through `req.tokenGrant`.
	 *
	 * `hash` is the *actor's* `createJWTHash`, not the subject's — see
	 * `validateToken` for why.
	 */
	act?: { sub: string; hash: string };
	/**
	 * Random nonce, set only on impersonation transitions — see
	 * `DelegationOptions.isImpersonationTransition`.
	 */
	jti?: string;
}

interface IssuedJWT extends AuthJwtPayload {
	exp: number;
}

export interface DelegationOptions {
	/**
	 * The human on whose behalf an impersonated session runs. Recorded as the `act`
	 * claim; never the authorization principal.
	 */
	actor?: User;
	/**
	 * Set when entering or leaving impersonation, to add a random `jti`.
	 *
	 * Both transitions revoke the cookie they replace, and a JWT's only varying
	 * field is `iat`, in whole seconds. Without a nonce, exiting within a second of
	 * entering re-mints the exact token entry revoked — and the operator is locked
	 * out of their own session until it expires.
	 */
	isImpersonationTransition?: boolean;
}

interface PasswordResetToken {
	sub: string;
	hash: string;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface CreateAuthMiddlewareOptions {
	/**
	 * If true, MFA is not enforced
	 */
	allowSkipMFA: boolean;
	/**
	 * If true, authentication becomes optional in preview mode
	 */
	allowSkipPreviewAuth?: boolean;
	/**
	 * If true, the middleware will not throw an error if authentication fails
	 * and will instead call next() regardless of authentication status.
	 * Use this for endpoints that should return different data for authenticated vs unauthenticated users.
	 */
	allowUnauthenticated?: boolean;
}

@Service()
export class AuthService {
	/**
	 * Endpoints exempt from the browser-id check on GET requests. Strings are
	 * matched exactly against `baseUrl + route path`; RegExps cover routes
	 * whose controller prefix carries resolved params (e.g. a `:projectId`
	 * that express substitutes into `req.baseUrl`).
	 */
	private skipBrowserIdCheckEndpoints: Array<string | RegExp>;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly license: License,
		private readonly jwtService: JwtService,
		private readonly urlService: UrlService,
		private readonly userRepository: UserRepository,
		private readonly invalidAuthTokenRepository: InvalidAuthTokenRepository,
		private readonly mfaService: MfaService,
	) {
		const restEndpoint = globalConfig.endpoints.rest;
		this.skipBrowserIdCheckEndpoints = [
			// we need to exclude push endpoint because we can't send custom header on websocket requests
			// TODO: Implement a custom handshake for push, to avoid having to send any data on querystring or headers
			`/${restEndpoint}/push`,

			// We need to exclude binary-data downloading endpoint because we can't send custom headers on `<embed>` tags
			`/${restEndpoint}/binary-data/`,

			// oAuth callback urls aren't called by the frontend. therefore we can't send custom header on these requests
			`/${restEndpoint}/oauth1-credential/callback`,
			`/${restEndpoint}/oauth2-credential/callback`,

			// The dynamic-credential authorize link is a top-level browser navigation
			// (link click / redirect), so it can't carry the browser-id header. The
			// GET method guard below keeps this GET-only; POST authorize is unaffected.
			`/${restEndpoint}/credentials/:id/authorize`,

			// Skip browser ID check for type files
			'/types/nodes.json',
			'/types/credentials.json',
			'/types/node-versions.json',
			'/mcp-oauth/authorize/',

			// Skip browser ID check for chat hub attachments
			`/${restEndpoint}/chat/conversations/:sessionId/messages/:messageId/attachments/:index`,

			// Skip browser ID check for Instance AI SSE endpoint — EventSource can't send custom headers
			`/${restEndpoint}/instance-ai/events/:threadId`,

			// Agent chat attachments render via <img> tags, which can't send the
			// browser-id header. The controller prefix carries a resolved
			// :projectId in req.baseUrl, so this one needs a pattern.
			new RegExp(
				`^/${escapeRegExp(restEndpoint)}/projects/[^/]+/agents/v2/:agentId/chat/attachments/:attachmentId$`,
			),
		];
	}

	createAuthMiddleware({
		allowSkipMFA,
		allowSkipPreviewAuth,
		allowUnauthenticated,
	}: CreateAuthMiddlewareOptions) {
		return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
			const token = req.cookies[AUTH_COOKIE_NAME];

			if (token) {
				try {
					const isInvalid = await this.invalidAuthTokenRepository.existsBy({ token });
					if (isInvalid) throw new AuthError('Unauthorized');

					const [user, { usedMfa, actor }] = await this.resolveJwt(token, req, res);
					const mfaEnforced = await this.mfaService.isMFAEnforced();

					// On an impersonated session the MFA gate must be evaluated against the
					// human, not the service account: an SA is always `mfaEnabled: false`, so
					// the "enforced but not enabled" branch below would 401 with
					// `mfaRequired: true` and push the operator to an enrolment screen for a
					// principal that can never enrol.
					const mfaSubject = actor ?? user;

					if (mfaEnforced && !usedMfa && !allowSkipMFA) {
						// If MFA is enforced, we need to check if the user has MFA enabled and used it during authentication
						if (mfaSubject.mfaEnabled) {
							// If the user has MFA enforced, but did not use it during authentication, we need to throw an error
							throw new AuthError('MFA not used during authentication');
						} else {
							// User doesn't have MFA enabled, but MFA is enforced
							// They need to set up MFA before accessing most endpoints
							if (allowUnauthenticated) {
								// Don't set req.user to avoid giving full access to semi-authenticated users
								// Instead, set a flag in authInfo to indicate MFA enrollment is required
								// This allows endpoints to handle this state appropriately (e.g., return public settings)
								req.authInfo = {
									usedMfa,
									mfaEnrollmentRequired: true,
								};
								return next();
							}

							// In this case we don't want to clear the cookie, to allow for MFA setup
							res.status(401).json({ status: 'error', message: 'Unauthorized', mfaRequired: true });
							return;
						}
					}

					req.user = user;
					req.authInfo = {
						usedMfa,
						actor,
					};

					if (actor && req.method !== 'GET') {
						// POC audit trail. Every event and `updatedAt` during impersonation
						// records the service account, so this log line is the only place the
						// human is attributed. Not a substitute for real audit logging.
						this.logger.info('Impersonated request', {
							actorId: actor.id,
							serviceAccountId: user.id,
							method: req.method,
							path: this.getEndpoint(req),
						});
					}
				} catch (error) {
					if (error instanceof JsonWebTokenError || error instanceof AuthError) {
						this.clearCookie(res);
					} else {
						throw error;
					}
				}
			}

			const isPreviewMode = process.env.N8N_PREVIEW_MODE === 'true';
			const shouldSkipAuth = (allowSkipPreviewAuth && isPreviewMode) || allowUnauthenticated;

			if (Object.hasOwn(req, 'user') && req.user) next();
			else if (shouldSkipAuth) next();
			else res.status(401).json({ status: 'error', message: 'Unauthorized' });
		};
	}

	getCookieToken(req: Request) {
		// This models the behavior of an AuthenticatedRequest type having an optional cookies property of type Record<string, string>
		if (typeof req.cookies === 'object' && req.cookies !== null) {
			const cookies = req.cookies as Record<string, string | undefined>;
			return cookies[AUTH_COOKIE_NAME];
		}
		return undefined;
	}

	getBrowserId(req: Request) {
		// This models the behavior of APIRequest type having an optional browserId property of type string
		if ('browserId' in req && typeof req.browserId === 'string') {
			return req.browserId;
		}
		return undefined;
	}

	getMethod(req: Request) {
		return req.method;
	}

	getEndpoint(req: Request) {
		return req.route ? `${req.baseUrl}${req.route.path}` : req.baseUrl;
	}

	clearCookie(res: Response) {
		res.clearCookie(AUTH_COOKIE_NAME);
	}

	async invalidateToken(req: AuthenticatedRequest) {
		const token = req.cookies[AUTH_COOKIE_NAME];
		if (!token) return;
		try {
			const { exp } = this.jwtService.decode(token);
			if (exp) {
				await this.invalidAuthTokenRepository.insert({
					token,
					expiresAt: new Date(exp * 1000),
				});
			}
		} catch (e) {
			this.logger.warn('failed to invalidate auth token', { error: (e as Error).message });
		}
	}

	issueCookie(
		res: Response,
		user: User,
		usedMfa: boolean,
		browserId?: string,
		isEmbed?: boolean,
		cookieOverrides?: { sameSite?: 'strict' | 'lax' | 'none'; secure?: boolean },
		delegation?: DelegationOptions,
	) {
		// TODO: move this check to the login endpoint in AuthController
		// If the instance has exceeded its user quota, prevent non-owners from logging in
		//
		// Service accounts are exempt: `isWithinUsersLimit()` is
		// `getUsersLimit() === UNLIMITED_LICENSE_QUOTA`, so on *any* seat-capped
		// licence it is false and every non-owner cookie issuance throws — which
		// would break entering impersonation and mid-session refresh alike. Nothing
		// counts rows today, so exempting them is enough; if a real seat count is
		// ever added it must filter `type = 'user'` (see `countUsersByRole`).
		const isWithinUsersLimit = this.license.isWithinUsersLimit();
		if (
			user.type !== 'serviceAccount' &&
			user.role.slug !== GLOBAL_OWNER_ROLE.slug &&
			!isWithinUsersLimit
		) {
			throw new ForbiddenError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		}

		const token = this.issueJWT(user, usedMfa, browserId, isEmbed, delegation);
		const { samesite, secure } = this.globalConfig.auth.cookie;
		res.cookie(AUTH_COOKIE_NAME, token, {
			maxAge: this.jwtExpiration * Time.seconds.toMilliseconds,
			httpOnly: true,
			sameSite: cookieOverrides?.sameSite ?? samesite,
			secure: cookieOverrides?.secure ?? secure,
		});
	}

	issueJWT(
		user: User,
		usedMfa: boolean = false,
		browserId?: string,
		isEmbed?: boolean,
		delegation?: DelegationOptions,
	) {
		const { actor, isImpersonationTransition } = delegation ?? {};

		const payload: AuthJwtPayload = {
			id: user.id,
			hash: this.createJWTHash(user),
			browserId: browserId && this.hash(browserId),
			usedMfa,
			...(isEmbed && { isEmbed }),
			...(actor && { act: { sub: actor.id, hash: this.createJWTHash(actor) } }),
			...(isImpersonationTransition && { jti: randomBytes(8).toString('hex') }),
		};
		return this.jwtService.sign(payload, {
			expiresIn: this.jwtExpiration,
		});
	}

	/**
	 * Validate a cookie auth token: checks revocation, JWT signature/expiry,
	 * user existence, and hash consistency. Skips browser-id and MFA checks
	 * since those are not applicable to webhook cookie validation.
	 *
	 * @returns the authenticated `User` on success
	 * @throws `AuthError('Unauthorized')` if the token is revoked or invalid
	 */
	async validateCookieToken(token: string): Promise<User> {
		const isInvalid = await this.invalidAuthTokenRepository.existsBy({ token });
		if (isInvalid) throw new AuthError('Unauthorized');
		const { user } = await this.validateToken(token);
		return user;
	}

	async authenticateUserBasedOnToken(
		token: string,
		method: string,
		endpoint: string,
		browserId: string | undefined,
	): Promise<User> {
		const isInvalid = await this.invalidAuthTokenRepository.existsBy({ token });
		if (isInvalid) throw new AuthError('Unauthorized');

		const { user, actor, jwtPayload } = await this.validateToken(token);

		this.validateBrowserId(jwtPayload, browserId, endpoint, method);

		await this.checkMfaGate(actor ?? user, jwtPayload);

		return user;
	}

	/**
	 * Validates an n8n auth cookie (JWT) without request-bound checks (browserId / endpoint / method).
	 *
	 * Use when the cookie was captured at the controller boundary and must be re-validated
	 * later in the execution lifecycle, after the original HTTP request is no longer available.
	 *
	 * @param cookie - The JWT string extracted from the `n8n-auth` browser cookie.
	 */
	async authenticateUserByCookie(cookie: string): Promise<User> {
		const isInvalid = await this.invalidAuthTokenRepository.existsBy({ token: cookie });
		if (isInvalid) throw new AuthError('Unauthorized');

		const { user, actor, jwtPayload } = await this.validateToken(cookie);

		await this.checkMfaGate(actor ?? user, jwtPayload);
		return user;
	}

	/**
	 * @param user The principal whose MFA state gates access. On an impersonated
	 * session callers pass the **actor**, not `req.user`: a service account is
	 * always `mfaEnabled: false`, so gating on it would reject the session outright
	 * on an MFA-enforced instance.
	 */
	private async checkMfaGate(user: User, jwtPayload: IssuedJWT): Promise<void> {
		if (jwtPayload.usedMfa ?? false) {
			return;
		}

		const mfaEnforced = await this.mfaService.isMFAEnforced();
		if (!mfaEnforced && !user.mfaEnabled) {
			// MFA is not enforced and the user has MFA not enabled
			// we are good
			return;
		}

		// either MFA is enforced or user has MFA enabled
		throw new AuthError('Unauthorized');
	}

	private endpointSkipsBrowserIdCheck(endpoint: string): boolean {
		return this.skipBrowserIdCheckEndpoints.some((entry) =>
			typeof entry === 'string' ? entry === endpoint : entry.test(endpoint),
		);
	}

	private validateBrowserId(
		jwtPayload: IssuedJWT,
		browserId: string | undefined,
		endpoint: string,
		method: string,
	) {
		if (method === 'GET' && this.endpointSkipsBrowserIdCheck(endpoint)) {
			this.logger.debug(`Skipped browserId check on ${endpoint}`);
		} else if (
			jwtPayload.browserId &&
			(!browserId || jwtPayload.browserId !== this.hash(browserId))
		) {
			this.logger.warn(`browserId check failed on ${endpoint}`);
			throw new AuthError('Unauthorized');
		}
	}

	private async validateToken(token: string): Promise<{
		user: User;
		actor?: User;
		jwtPayload: IssuedJWT;
	}> {
		const jwtPayload: IssuedJWT = this.jwtService.verify(token, {
			algorithms: ['HS256'],
		});

		// TODO: Use an in-memory ttl-cache to cache the User object for upto a minute
		const user = await this.userRepository.findOne({
			where: { id: jwtPayload.id },
			relations: ['role'],
		});

		if (
			// If not user is found
			!user ||
			// or, If the user has been deactivated (i.e. LDAP users)
			user.disabled ||
			// or, If the email or password has been updated
			jwtPayload.hash !== this.createJWTHash(user)
		) {
			throw new AuthError('Unauthorized');
		}

		const actor = jwtPayload.act
			? await this.validateImpersonationActor(jwtPayload.act, user)
			: undefined;

		return {
			user,
			actor,
			jwtPayload,
		};
	}

	/**
	 * Resolve and validate the human behind an impersonated session.
	 *
	 * **Why bind the actor's hash and not the subject's.** `createJWTHash` hashes
	 * `[email, password]` plus an MFA-secret prefix. For a passwordless service
	 * account that is permanently `hash('sa-x@…:null')` — no action can ever change
	 * it, so the SA's own token is unrevocable by hash. Binding the *actor's* hash
	 * buys the property that matters: the human changing their password or email,
	 * or enabling/rotating MFA, kills every impersonation session they hold.
	 *
	 * The scope is re-checked live rather than trusted from the token, so revoking
	 * `serviceAccount:impersonate` takes effect on the next request. `role.scopes`
	 * is `eager: true`, so this costs nothing extra.
	 */
	private async validateImpersonationActor(
		act: NonNullable<AuthJwtPayload['act']>,
		subject: User,
	): Promise<User> {
		const actor = await this.userRepository.findOne({
			where: { id: act.sub },
			relations: ['role'],
		});

		if (
			!actor ||
			actor.disabled ||
			// No service account may impersonate — closes the admin-roled-SA hole that
			// scopes alone leave open.
			actor.type !== 'user' ||
			// Only service accounts can be impersonated.
			subject.type !== 'serviceAccount' ||
			act.hash !== this.createJWTHash(actor) ||
			!hasGlobalScope(actor, 'serviceAccount:impersonate')
		) {
			throw new AuthError('Unauthorized');
		}

		return actor;
	}

	async resolveJwt(
		token: string,
		req: AuthenticatedRequest,
		res: Response,
	): Promise<[User, { usedMfa: boolean; actor?: User }]> {
		const { user, actor, jwtPayload } = await this.validateToken(token);

		const browserId = this.getBrowserId(req);
		const endpoint = this.getEndpoint(req);
		const method = this.getMethod(req);
		this.validateBrowserId(jwtPayload, browserId, endpoint, method);

		if (jwtPayload.exp * 1000 - Date.now() < this.jwtRefreshTimeout) {
			this.logger.debug('JWT about to expire. Will be refreshed');
			const embedCookieOverrides = jwtPayload.isEmbed
				? ({ sameSite: 'none' as const, secure: true } as const)
				: undefined;
			this.issueCookie(
				res,
				user,
				jwtPayload.usedMfa ?? false,
				browserId,
				jwtPayload.isEmbed,
				embedCookieOverrides,
				// `issueJWT` rebuilds the payload from scratch, so the `act` claim must be
				// passed back in explicitly. Without this the refresh silently drops it
				// mid-session and strands the operator inside the service account: the
				// exit endpoint 400s "not impersonating" and the audit trail vanishes.
				{ actor },
			);
		}

		return [user, { usedMfa: jwtPayload.usedMfa ?? false, actor }];
	}

	generatePasswordResetToken(user: User, expiresIn: TimeUnitValue = '20m') {
		const payload: PasswordResetToken = { sub: user.id, hash: this.createJWTHash(user) };
		return this.jwtService.sign(payload, { expiresIn });
	}

	generatePasswordResetUrl(user: User) {
		const instanceBaseUrl = this.urlService.getInstanceBaseUrl();
		const url = new URL(`${instanceBaseUrl}/change-password`);

		url.searchParams.append('token', this.generatePasswordResetToken(user));
		url.searchParams.append('mfaEnabled', user.mfaEnabled.toString());

		return url.toString();
	}

	async resolvePasswordResetToken(token: string): Promise<User | undefined> {
		let decodedToken: PasswordResetToken;
		try {
			decodedToken = this.jwtService.verify(token);
		} catch (e) {
			if (e instanceof TokenExpiredError) {
				this.logger.debug('Reset password token expired');
			} else {
				this.logger.debug('Error verifying token');
			}
			return;
		}

		const user = await this.userRepository.findOne({
			where: { id: decodedToken.sub },
			relations: ['authIdentities', 'role'],
		});

		if (!user) {
			this.logger.debug(
				'Request to resolve password token failed because no user was found for the provided user ID',
				{ userId: decodedToken.sub },
			);
			return;
		}

		if (decodedToken.hash !== this.createJWTHash(user)) {
			this.logger.debug('Password updated since this token was generated');
			return;
		}

		return user;
	}

	createJWTHash({ email, password, mfaEnabled, mfaSecret }: User) {
		const payload = [email, password];
		if (mfaEnabled && mfaSecret) {
			payload.push(mfaSecret.substring(0, 3));
		}
		return this.hash(payload.join(':')).substring(0, 10);
	}

	private hash(input: string) {
		return createHash('sha256').update(input).digest('base64');
	}

	/** How many **milliseconds** before expiration should a JWT be renewed. */
	get jwtRefreshTimeout() {
		const { jwtRefreshTimeoutHours, jwtSessionDurationHours } = this.globalConfig.userManagement;
		if (jwtRefreshTimeoutHours === 0) {
			return Math.floor(jwtSessionDurationHours * 0.25 * Time.hours.toMilliseconds);
		} else {
			return Math.floor(jwtRefreshTimeoutHours * Time.hours.toMilliseconds);
		}
	}

	/** How many **seconds** is an issued JWT valid for. */
	get jwtExpiration() {
		return this.globalConfig.userManagement.jwtSessionDurationHours * Time.hours.toSeconds;
	}
}
