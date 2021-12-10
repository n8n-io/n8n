// @ts-nocheck

import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwt from 'jsonwebtoken';

import { Db } from '../..';
import config = require('../../../config');

const options = {
	jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
	secretOrKey: 'abc', //config.get('jwt_key'),
};

export function useJwt(passport) {
	// The JWT payload is passed into the verify callback
	passport.use(
		new Strategy(options, async function (jwt_payload, done) {
			// We will assign the `sub` property on the JWT to the database ID of user
			const user = await Db.collections.User.findOne(
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

export function issueJWT(user) {
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
		token: 'Bearer ' + signedToken,
		expiresIn,
		validTill: Date.now() + expiresIn,
	};
}
