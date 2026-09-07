import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { InstanceSettings, type DeploymentStateRepo } from 'n8n-core';

@Service()
export class JwtService {
	private jwtSecret: string = '';
	private readonly jwtSecretFromEnv: boolean;

	constructor({ encryptionKey }: InstanceSettings, globalConfig: GlobalConfig) {
		this.jwtSecretFromEnv = Boolean(globalConfig.userManagement.jwtSecret);
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
			globalConfig.userManagement.jwtSecret = this.jwtSecret;
		}
	}

	/**
	 * Two-phase init: reads or creates the signing.jwt deployment-key row.
	 * Must be called after DB migrations complete, before request handlers register.
	 * Precedence: N8N_USER_MANAGEMENT_JWT_SECRET env → DB active row → derive-from-key (and persist)
	 */
	async initialize(
		repo: Pick<DeploymentStateRepo, 'findActiveSigningSecret' | 'seedSigningSecret'>,
	): Promise<void> {
		if (this.jwtSecretFromEnv) {
			return;
		}
		const existing = await repo.findActiveSigningSecret('signing.jwt', { rewrapLegacy: true });
		if (existing !== null) {
			this.jwtSecret = existing;
			return;
		}
		await repo.seedSigningSecret('signing.jwt', this.jwtSecret);
		// The winner may be a pre-wrap row inserted concurrently by an older
		// process — rewrap on this read too, so startup always leaves it wrapped.
		const winner = await repo.findActiveSigningSecret('signing.jwt', { rewrapLegacy: true });
		if (winner !== null) this.jwtSecret = winner;
	}

	sign(payload: object, options: jwt.SignOptions = {}): string {
		return jwt.sign(payload, this.jwtSecret, options);
	}

	decode<T = JwtPayload>(token: string) {
		return jwt.decode(token) as T;
	}

	verify<T = JwtPayload>(token: string, options: jwt.VerifyOptions = {}) {
		return jwt.verify(token, this.jwtSecret, options) as T;
	}
}

export type JwtPayload = jwt.JwtPayload;
