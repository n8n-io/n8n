import { GlobalConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { InstanceSettings } from 'n8n-core';

@Service()
export class JwtService {
	jwtSecret: string = '';

	constructor({ encryptionKey }: InstanceSettings, globalConfig: GlobalConfig) {
		this.jwtSecret = globalConfig.userManagement.jwtSecret;
		if (!this.jwtSecret) {
			// If we don't have a JWT secret set, generate one based on encryption key.
			// For a key off every other letter from encryption key
			// CAREFUL: do not change this or it breaks all existing tokens.
			let baseKey = '';
			for (let i = 0; i < encryptionKey.length; i += 2) {
				baseKey += encryptionKey[i];
			}
			this.jwtSecret = createHash('sha256').update(baseKey).digest('hex');
			Container.get(GlobalConfig).userManagement.jwtSecret = this.jwtSecret;
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
