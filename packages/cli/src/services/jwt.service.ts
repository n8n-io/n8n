import { Service } from '@n8n/di';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { InstanceSettings } from 'n8n-core';

import config from '@/config';

@Service()
export class JwtService {
	readonly jwtSecret = config.getEnv('userManagement.jwtSecret');

	constructor({ signingSecret }: InstanceSettings) {
		this.jwtSecret = config.getEnv('userManagement.jwtSecret');
		if (!this.jwtSecret) {
			this.jwtSecret = createHash('sha256').update(signingSecret).digest('hex');
			config.set('userManagement.jwtSecret', this.jwtSecret);
		}
	}

	sign(payload: object, options: jwt.SignOptions = {}): string {
		return jwt.sign(payload, this.jwtSecret, options);
	}

	decode(token: string) {
		return jwt.decode(token) as JwtPayload;
	}

	verify<T = JwtPayload>(token: string, options: jwt.VerifyOptions = {}) {
		return jwt.verify(token, this.jwtSecret, options) as T;
	}
}

export type JwtPayload = jwt.JwtPayload;
