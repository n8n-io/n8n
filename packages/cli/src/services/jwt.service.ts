import { GlobalConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import { createHash, createSecretKey, KeyObject } from 'crypto';
import jwt from 'jsonwebtoken';
import { InstanceSettings } from 'n8n-core';

@Service()
export class JwtService {
	readonly jwtSecretKey: KeyObject;

	constructor({ encryptionKey }: InstanceSettings, globalConfig: GlobalConfig) {
		let jwtSecret = globalConfig.userManagement.jwtSecret;
		if (!jwtSecret) {
			// If we don't have a JWT secret set, generate one based on encryption key.
			// For a key off every other letter from encryption key
			// CAREFUL: do not change this or it breaks all existing tokens.
			let baseKey = '';
			for (let i = 0; i < encryptionKey.length; i += 2) {
				baseKey += encryptionKey[i];
			}
			jwtSecret = createHash('sha256').update(baseKey).digest('hex');
			Container.get(GlobalConfig).userManagement.jwtSecret = jwtSecret;
		}

		this.jwtSecretKey = createSecretKey(jwtSecret, 'utf8');
	}

	sign(payload: object, options: jwt.SignOptions = {}): string {
		return jwt.sign(payload, this.jwtSecretKey, options);
	}

	decode<T = JwtPayload>(token: string) {
		return jwt.decode(token) as T;
	}

	verify<T = JwtPayload>(token: string, options: jwt.VerifyOptions = {}) {
		return jwt.verify(token, this.jwtSecretKey, options) as T;
	}
}

export type JwtPayload = jwt.JwtPayload;
