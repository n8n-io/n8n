/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */

import * as jwt from 'jsonwebtoken';
import { JwtPayload, JwtToken } from '../Interfaces';
import { User } from '../../databases/entities/User';
import config = require('../../../config');

export async function issueJWT(user: User): Promise<JwtToken> {
	const { id, email, firstName, lastName, password, personalizationAnswers } = user;
	const expiresIn = 14 * 86400000; // 14 days

	const payload = {
		id,
		email,
		firstName,
		lastName,
		password: password.slice(Math.round(password.length / 2)),
		personalizationAnswers,
	} as JwtPayload;

	const signedToken = jwt.sign(payload, config.get('userManagement.jwtSecret'), {
		expiresIn: expiresIn / 1000 /* in seconds */,
	});

	return {
		token: signedToken,
		expiresIn,
		validTill: Date.now() + expiresIn,
	};
}
