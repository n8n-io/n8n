import { Service } from 'typedi';
import type { NextFunction, Response } from 'express';
import { createHash } from 'crypto';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

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
	/** This hash is derived from email and bcrypt of password */
	hash: string;
}

interface IssuedJWT extends AuthJwtPayload {
	exp: number;
}

interface PasswordResetToken {
	sub: string;
	hash: string;
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
			secure: config.getEnv('secure_cookie'),
		});
	}

	issueJWT(user: User) {
		const payload: AuthJwtPayload = {
			id: user.id,
			hash: this.createJWTHash(user),
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

		if (jwtPayload.exp * 1000 - Date.now() < this.jwtRefreshTimeout) {
			this.logger.debug('JWT about to expire. Will be refreshed');
			this.issueCookie(res, user);
		}

		return user;
	}

	generatePasswordResetToken(user: User, expiresIn = '20m') {
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
			relations: ['authIdentities'],
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

	createJWTHash({ email, password }: User) {
		const hash = createHash('sha256')
			.update(email + ':' + password)
			.digest('base64');
		return hash.substring(0, 10);
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
