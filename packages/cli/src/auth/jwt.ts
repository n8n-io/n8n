import type { Response } from 'express';
import { createHash } from 'crypto';
import { AUTH_COOKIE_NAME, RESPONSE_ERROR_MESSAGES, Time } from '@/constants';
import type { JwtPayload, JwtToken } from '@/Interfaces';
import type { User } from '@db/entities/User';
import config from '@/config';
import { License } from '@/License';
import { Container } from 'typedi';
import { UserRepository } from '@db/repositories/user.repository';
import { JwtService } from '@/services/jwt.service';
import { UnauthorizedError } from '@/errors/response-errors/unauthorized.error';
import { AuthError } from '@/errors/response-errors/auth.error';
import { ApplicationError } from 'n8n-workflow';

export function issueJWT(user: User): JwtToken {
	const { id, email, password } = user;
	const expiresInHours = config.getEnv('userManagement.jwtSessionDurationHours');
	const expiresInSeconds = expiresInHours * Time.hours.toSeconds;

	const isWithinUsersLimit = Container.get(License).isWithinUsersLimit();

	const payload: JwtPayload = {
		id,
		email,
		password: password ?? null,
	};

	if (
		config.getEnv('userManagement.isInstanceOwnerSetUp') &&
		!user.isOwner &&
		!isWithinUsersLimit
	) {
		throw new UnauthorizedError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
	}
	if (password) {
		payload.password = createHash('sha256')
			.update(password.slice(password.length / 2))
			.digest('hex');
	}

	const signedToken = Container.get(JwtService).sign(payload, {
		expiresIn: expiresInSeconds,
	});

	return {
		token: signedToken,
		expiresIn: expiresInSeconds,
	};
}

export const createPasswordSha = (user: User) =>
	createHash('sha256')
		.update(user.password.slice(user.password.length / 2))
		.digest('hex');

export async function resolveJwtContent(jwtPayload: JwtPayload): Promise<User> {
	const user = await Container.get(UserRepository).findOne({
		where: { id: jwtPayload.id },
	});

	let passwordHash = null;
	if (user?.password) {
		passwordHash = createPasswordSha(user);
	}

	// currently only LDAP users during synchronization
	// can be set to disabled
	if (user?.disabled) {
		throw new AuthError('Unauthorized');
	}

	if (!user || jwtPayload.password !== passwordHash || user.email !== jwtPayload.email) {
		// When owner hasn't been set up, the default user
		// won't have email nor password (both equals null)
		throw new ApplicationError('Invalid token content');
	}
	return user;
}

export async function resolveJwt(token: string): Promise<User> {
	const jwtPayload: JwtPayload = Container.get(JwtService).verify(token, {
		algorithms: ['HS256'],
	});
	return await resolveJwtContent(jwtPayload);
}

export async function issueCookie(res: Response, user: User): Promise<void> {
	const userData = issueJWT(user);
	res.cookie(AUTH_COOKIE_NAME, userData.token, {
		maxAge: userData.expiresIn * Time.seconds.toMilliseconds,
		httpOnly: true,
		sameSite: 'lax',
	});
}
