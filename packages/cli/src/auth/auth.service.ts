import { Service } from 'typedi';
import type { NextFunction, Response } from 'express';
import { createHash } from 'crypto';
import { JsonWebTokenError, TokenExpiredError, type JwtPayload } from 'jsonwebtoken';

import config from '@/config';
import { AUTH_COOKIE_NAME, RESPONSE_ERROR_MESSAGES, Time } from '@/constants';
import type { User } from '@db/entities/User';
import { UserRepository } from '@db/repositories/user.repository';
import { AuthError } from '@/errors/response-errors/auth.error';
import { UnauthorizedError } from '@/errors/response-errors/unauthorized.error';
import { License } from '@/License';
import { Logger } from '@/Logger';
import type { AuthenticatedRequest } from '@/requests';
import { JwtService } from '@/services/jwt.service';
import { UrlService } from '@/services/url.service';

interface AuthJwtPayload {
	/** User Id */
	id: string;
	/** User's email */
	email: string | null;
	/** SHA-256 hash of bcrypt hash of the user's password */
	password: string | null;
}

interface IssuedJWT extends AuthJwtPayload {
	exp: number;
}

@Service()
export class AuthService {
	constructor(
		private readonly logger: Logger,
		private readonly license: License,
		private readonly jwtService: JwtService,
		private readonly urlService: UrlService,
		private readonly userRepository: UserRepository,
	) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		this.authMiddleware = this.authMiddleware.bind(this);
	}

	async authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		const token = req.cookies[AUTH_COOKIE_NAME];
		if (token) {
			try {
				req.user = await this.resolveJwt(token, res);
			} catch (error) {
				if (error instanceof JsonWebTokenError || error instanceof AuthError) {
					this.clearCookie(res);
				} else {
					throw error;
				}
			}
		}

		if (req.user) next();
		else res.status(401).json({ status: 'error', message: 'Unauthorized' });
	}

	clearCookie(res: Response) {
		res.clearCookie(AUTH_COOKIE_NAME);
	}

	issueCookie(res: Response, user: User) {
		// If the instance has exceeded its user quota, prevent non-owners from logging in
		const isWithinUsersLimit = this.license.isWithinUsersLimit();
		if (
			config.getEnv('userManagement.isInstanceOwnerSetUp') &&
			!user.isOwner &&
			!isWithinUsersLimit
		) {
			throw new UnauthorizedError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		}

		const token = this.issueJWT(user);
		res.cookie(AUTH_COOKIE_NAME, token, {
			maxAge: this.jwtExpiration * Time.seconds.toMilliseconds,
			httpOnly: true,
			sameSite: 'lax',
		});
	}

	issueJWT(user: User) {
		const { id, email, password } = user;
		const payload: AuthJwtPayload = {
			id,
			email,
			password: password ? this.createPasswordSha(user) : null,
		};
		return this.jwtService.sign(payload, {
			expiresIn: this.jwtExpiration,
		});
	}

	async resolveJwt(token: string, res: Response): Promise<User> {
		const jwtPayload: IssuedJWT = this.jwtService.verify(token, {
			algorithms: ['HS256'],
		});

		// TODO: Use an in-memory ttl-cache to cache the User object for upto a minute
		const user = await this.userRepository.findOne({
			where: { id: jwtPayload.id },
		});

		// TODO: include these checks in the cache, to avoid computed this over and over again
		const passwordHash = user?.password ? this.createPasswordSha(user) : null;

		if (
			// If not user is found
			!user ||
			// or, If the user has been deactivated (i.e. LDAP users)
			user.disabled ||
			// or, If the password has been updated
			jwtPayload.password !== passwordHash ||
			// or, If the email has been updated
			user.email !== jwtPayload.email
		) {
			throw new AuthError('Unauthorized');
		}

		if (jwtPayload.exp * 1000 - Date.now() < this.jwtRefreshTimeout) {
			this.logger.debug('JWT about to expire. Will be refreshed');
			this.issueCookie(res, user);
		}

		return user;
	}

	generatePasswordResetToken(user: User, expiresIn = '20m') {
		return this.jwtService.sign(
			{ sub: user.id, passwordSha: this.createPasswordSha(user) },
			{ expiresIn },
		);
	}

	generatePasswordResetUrl(user: User) {
		const instanceBaseUrl = this.urlService.getInstanceBaseUrl();
		const url = new URL(`${instanceBaseUrl}/change-password`);

		url.searchParams.append('token', this.generatePasswordResetToken(user));
		url.searchParams.append('mfaEnabled', user.mfaEnabled.toString());

		return url.toString();
	}

	async resolvePasswordResetToken(token: string): Promise<User | undefined> {
		let decodedToken: JwtPayload & { passwordSha: string };
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
			relations: ['authIdentities'],
		});

		if (!user) {
			this.logger.debug(
				'Request to resolve password token failed because no user was found for the provided user ID',
				{ userId: decodedToken.sub, token },
			);
			return;
		}

		if (this.createPasswordSha(user) !== decodedToken.passwordSha) {
			this.logger.debug('Password updated since this token was generated');
			return;
		}

		return user;
	}

	private createPasswordSha({ password }: User) {
		return createHash('sha256')
			.update(password.slice(password.length / 2))
			.digest('hex');
	}

	/** How many **milliseconds** before expiration should a JWT be renewed */
	get jwtRefreshTimeout() {
		const { jwtRefreshTimeoutHours, jwtSessionDurationHours } = config.get('userManagement');
		if (jwtRefreshTimeoutHours === 0) {
			return Math.floor(jwtSessionDurationHours * 0.25 * Time.hours.toMilliseconds);
		} else {
			return Math.floor(jwtRefreshTimeoutHours * Time.hours.toMilliseconds);
		}
	}

	/** How many **seconds** is an issued JWT valid for */
	get jwtExpiration() {
		return config.get('userManagement.jwtSessionDurationHours') * Time.hours.toSeconds;
	}
}
