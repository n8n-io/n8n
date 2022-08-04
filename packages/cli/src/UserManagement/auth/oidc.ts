/* eslint-disable import/no-cycle */
import type { IdTokenClaims, TokenSet, UserinfoResponse } from 'openid-client';
import { Db } from '../..';
import type { User } from '../../databases/entities/User';

export async function resolveFedUser(
	tokenData: IdTokenClaims,
	userInfo: UserinfoResponse,
): Promise<User | undefined> {
	const federatedUser = await Db.collections.FederatedUser.findOne({
		where: { identifier: userInfo.sub, issuer: tokenData.iss },
	});

	if (federatedUser) {
		return Db.collections.User.findOne(federatedUser.userId, {
			relations: ['globalRole'],
		});
	}
	return undefined;
}

export async function oidcHandler(
	tokenSet: TokenSet,
	userInfo: UserinfoResponse,
	done: (error: Error | null, user: User | boolean, options?: { message: string }) => void,
): Promise<void> {
	const tokenData = tokenSet.claims();

	let user = await resolveFedUser(tokenData, userInfo);

	if (user) {
		return done(null, user);
	}

	if (!userInfo.email_verified) {
		return done(null, false, { message: 'Unverified email address from provider' });
	}

	user = await Db.collections.User.findOne({
		where: { email: userInfo.email },
		relations: ['globalRole'],
	});

	if (!user) {
		return done(null, false, { message: 'User not found' });
	}

	await Db.collections.FederatedUser.insert({
		user,
		identifier: userInfo.sub,
		issuer: tokenData.iss,
	});

	if (userInfo.given_name) {
		user.firstName = userInfo.given_name;
	}
	if (userInfo.family_name) {
		user.lastName = userInfo.family_name;
	}

	user = await Db.collections.User.save(user);

	return done(null, user);
}
