import { AUTH_COOKIE_NAME, RESPONSE_ERROR_MESSAGES } from '@/constants';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { GLOBAL_OWNER_ROLE, InvalidAuthTokenRepository, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { createHash } from 'crypto';
import type { NextFunction, Response } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import type { StringValue as TimeUnitValue } from 'ms';

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
}

interface IssuedJWT extends AuthJwtPayload {
	exp: number;
}

interface PasswordResetToken {
	sub: string;
	hash: string;
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
	// The browser-id check needs to be skipped on these endpoints
	private skipBrowserIdCheckEndpoints: string[];

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

			// Skip browser ID check for type files
			'/types/nodes.json',
			'/types/credentials.json',
			'/types/node-versions.json',
			'/mcp-oauth/authorize/',

			// Skip browser ID check for chat hub attachments
			`/${restEndpoint}/chat/conversations/:sessionId/messages/:messageId/attachments/:index`,
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

					const [user, { usedMfa }] = await this.resolveJwt(token, req, res);
					const mfaEnforced = await this.mfaService.isMFAEnforced();

					if (mfaEnforced && !usedMfa && !allowSkipMFA) {
						// If MFA is enforced, we need to check if the user has MFA enabled and used it during authentication
						if (user.mfaEnabled) {
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
					};
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

			if (req.user) next();
			else if (shouldSkipAuth) next();
			else res.status(401).json({ status: 'error', message: 'Unauthorized' });
		};
	}

	getCookieToken(req: AuthenticatedRequest) {
		return req.cookies[AUTH_COOKIE_NAME];
	}

	getBrowserId(req: AuthenticatedRequest) {
		return req.browserId;
	}

	getMethod(req: AuthenticatedRequest) {
		return req.method;
	}

	getEndpoint(req: AuthenticatedRequest) {
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

	issueCookie(res: Response, user: User, usedMfa: boolean, browserId?: string) {
		// TODO: move this check to the login endpoint in AuthController
		// If the instance has exceeded its user quota, prevent non-owners from logging in
		const isWithinUsersLimit = this.license.isWithinUsersLimit();
		if (user.role.slug !== GLOBAL_OWNER_ROLE.slug && !isWithinUsersLimit) {
			throw new ForbiddenError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		}

		const token = this.issueJWT(user, usedMfa, browserId);
		const { samesite, secure } = this.globalConfig.auth.cookie;
		res.cookie(AUTH_COOKIE_NAME, token, {
			maxAge: this.jwtExpiration * Time.seconds.toMilliseconds,
			httpOnly: true,
			sameSite: samesite,
			secure,
		});
	}

	issueJWT(user: User, usedMfa: boolean = false, browserId?: string) {
		const payload: AuthJwtPayload = {
			id: user.id,
			hash: this.createJWTHash(user),
			browserId: browserId && this.hash(browserId),
			usedMfa,
		};
		return this.jwtService.sign(payload, {
			expiresIn: this.jwtExpiration,
		});
	}

	async authenticateUserBasedOnToken(
		token: string,
		method: string,
		endpoint: string,
		browserId: string | undefined,
	): Promise<User> {
		const isInvalid = await this.invalidAuthTokenRepository.existsBy({ token });
		if (isInvalid) throw new AuthError('Unauthorized');

		const { user, jwtPayload } = await this.validateToken(token);

		this.validateBrowserId(jwtPayload, browserId, endpoint, method);

		const usedMfa = jwtPayload.usedMfa ?? false;

		// MFA was used, we are good either way.
		if (usedMfa) {
			return user;
		}
		const mfaEnforced = await this.mfaService.isMFAEnforced();

		if (!mfaEnforced && !user.mfaEnabled) {
			// MFA is not enforced and the user has MFA not enabled
			// we are good
			return user;
		}

		// either MFA is enforced or user has MFA enabled
		throw new AuthError('Unauthorized');
	}

	private validateBrowserId(
		jwtPayload: IssuedJWT,
		browserId: string | undefined,
		endpoint: string,
		method: string,
	) {
		if (method === 'GET' && this.skipBrowserIdCheckEndpoints.includes(endpoint)) {
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

		return {
			user,
			jwtPayload,
		};
	}

	async resolveJwt(
		token: string,
		req: AuthenticatedRequest,
		res: Response,
	): Promise<[User, { usedMfa: boolean }]> {
		const { user, jwtPayload } = await this.validateToken(token);

		const browserId = this.getBrowserId(req);
		const endpoint = this.getEndpoint(req);
		const method = this.getMethod(req);
		this.validateBrowserId(jwtPayload, browserId, endpoint, method);

		if (jwtPayload.exp * 1000 - Date.now() < this.jwtRefreshTimeout) {
			this.logger.debug('JWT about to expire. Will be refreshed');
			this.issueCookie(res, user, jwtPayload.usedMfa ?? false, browserId);
		}

		return [user, { usedMfa: jwtPayload.usedMfa ?? false }];
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
				this.logger.debug('Reset password token expired', { token });
			} else {
				this.logger.debug('Error verifying token', { token });
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
				{ userId: decodedToken.sub, token },
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
