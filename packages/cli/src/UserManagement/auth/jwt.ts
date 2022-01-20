/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */

import * as jwt from 'jsonwebtoken';
import { Response } from 'express';
import { createHash } from 'crypto';
import { JwtToken, JwtPayload } from '../Interfaces';
import { User } from '../../databases/entities/User';
import config = require('../../../config');

export async function issueJWT(user: User): Promise<JwtToken> {
	const { id, email, password } = user;
	const expiresIn = 7 * 86400000; // 7 days

	const payload: JwtPayload = {
		id,
		email,
		password: password ?? null,
	};

	if (password) {
		payload.password = createHash('sha256')
			.update(password.slice(password.length / 2))
			.digest('hex');
	}

	const signedToken = jwt.sign(payload, config.get('userManagement.jwtSecret'), {
		expiresIn: expiresIn / 1000 /* in seconds */,
	});

	return {
		token: signedToken,
		expiresIn,
	};
}

export async function issueCookie(res: Response, user: User): Promise<void> {
	const userData = await issueJWT(user);
	res.cookie('n8n-auth', userData.token, { maxAge: userData.expiresIn, httpOnly: true });
}
