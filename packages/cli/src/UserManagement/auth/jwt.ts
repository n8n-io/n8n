// @ts-nocheck

import { ExtractJwt, JwtStrategy } from 'passport-jwt';
import * as jwt from 'jsonwebtoken';
import * as passport from 'passport';

import { Db } from '../..';
import config = require('../../../config');

const options = {
	jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
	secretOrKey: 'abc', //config.get('jwt_key'),
};

// The JWT payload is passed into the verify callback
passport.use(
	new JwtStrategy(options, function (jwt_payload, done) {
		// We will assign the `sub` property on the JWT to the database ID of user
		// const { id, email } = jwt_payload;
		Db.collections.User.findOne({
			id: jwt_payload.id,
			email: jwt_payload.email,
		}).then((user) => {
			if (!user) {
				return done('User not found', false);
			}
			return done(null, user);
		});
	}),
);

export function issueJWT(user) {
	const { id, email } = user;
	const expiresIn = '7d';

	const payload = {
		id,
		email,
		issuedAt: Date.now(),
	};

	const signedToken = jwt.sign(payload, options.secretOrKey, {
		expiresIn,
		algorithm: 'RS256',
	});

	return {
		token: 'Bearer ' + signedToken,
		expires: expiresIn,
	};
}
