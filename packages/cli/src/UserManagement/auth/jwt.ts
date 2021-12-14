/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */

import { Strategy } from 'passport-jwt';
import * as jwt from 'jsonwebtoken';

import { PassportStatic } from 'passport';
import { Db } from '../..';
import { JwtOptions, JwtToken } from '../Interfaces';
import { User } from '../../databases/entities/User';

export async function useJwt(passport: PassportStatic, options: JwtOptions): Promise<void> {
	// The JWT payload is passed into the verify callback
	passport.use(
		new Strategy(options, async function (jwt_payload, done) {
			// We will assign the `sub` property on the JWT to the database ID of user
			const user = await Db.collections.User!.findOne(
				{
					id: jwt_payload.id,
					email: jwt_payload.email,
				},
				{ relations: ['globalRole'] },
			);
			if (!user) {
				return done(null, false, { message: 'User not found' });
			}
			return done(null, user);
		}),
	);
}

export async function issueJWT(user: User, options: JwtOptions): Promise<JwtToken> {
	const { id, email } = user;
	const expiresIn = 14 * 86400000; // 14 days

	const payload = {
		id,
		email,
	};

	const signedToken = jwt.sign(payload, options.secretOrKey, {
		expiresIn: expiresIn / 1000 /* in seconds */,
	});

	return {
		token: `Bearer ${signedToken}`,
		expiresIn,
		validTill: Date.now() + expiresIn,
	};
}
