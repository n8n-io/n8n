import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { InstanceSettings, type DeploymentStateRepo } from 'n8n-core';

import {
	LEGACY_UNBOUND_PURPOSES,
	TOKEN_PURPOSES,
	type TokenPurpose,
} from '@/services/token-purposes';

/**
 * `audience` is omitted on purpose: it is derived from the token's purpose, so
 * a caller cannot bind a token to the wrong audience or forget to bind it.
 */
export type PurposedSignOptions = Omit<jwt.SignOptions, 'audience'>;
export type PurposedVerifyOptions = Omit<jwt.VerifyOptions, 'audience'>;

@Service()
export class JwtService {
	private jwtSecret: string = '';
	private readonly jwtSecretFromEnv: boolean;

	constructor(
		{ encryptionKey }: InstanceSettings,
		globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {
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

	/** Signs a token bound to the audience of `purpose`. */
	sign(purpose: TokenPurpose, payload: object, options: PurposedSignOptions = {}): string {
		return jwt.sign(payload, this.jwtSecret, {
			...options,
			audience: TOKEN_PURPOSES[purpose],
		});
	}

	/**
	 * Signs a token bound to a protected resource rather than to a fixed
	 * purpose. Only OAuth access tokens need this: their audience is the
	 * requested resource indicator (RFC 8707), known at runtime.
	 */
	signForResource(payload: object, audience: string, options: PurposedSignOptions = {}): string {
		return jwt.sign(payload, this.jwtSecret, { ...options, audience });
	}

	/**
	 * Reads the claims without checking the signature. Use only to route a
	 * token to the code that then verifies it — never to make a decision.
	 */
	decodeUnverified<T = JwtPayload>(token: string) {
		return jwt.decode(token) as T;
	}

	/** Verifies a token and requires it to carry the audience of `purpose`. */
	verify<T = JwtPayload>(
		purpose: TokenPurpose,
		token: string,
		options: PurposedVerifyOptions = {},
	) {
		try {
			return jwt.verify(token, this.jwtSecret, {
				...options,
				audience: TOKEN_PURPOSES[purpose],
			}) as T;
		} catch (error) {
			return this.verifyUnbound<T>(purpose, token, options, error);
		}
	}

	/** Verifies an OAuth access token against the resource(s) it may be used for. */
	verifyForResource<T = JwtPayload>(
		token: string,
		audience: string | [string, ...string[]],
		options: PurposedVerifyOptions = {},
	) {
		return jwt.verify(token, this.jwtSecret, { ...options, audience }) as T;
	}

	/**
	 * Accepts a token minted before its purpose carried an `aud` claim. A
	 * session lasts a week and an invite link three months, so those tokens are
	 * still in flight after an upgrade.
	 *
	 * This only admits a token that carries no audience at all. A token bound to
	 * a different audience still fails, so the allowance cannot be used to
	 * present one kind of bound token as another.
	 *
	 * DEPRECATED: removed on the v3 line, by which point every token in flight
	 * carries an audience.
	 */
	private verifyUnbound<T>(
		purpose: TokenPurpose,
		token: string,
		options: PurposedVerifyOptions,
		verifyError: unknown,
	): T {
		if (!LEGACY_UNBOUND_PURPOSES.has(purpose)) throw verifyError;

		const claims = jwt.decode(token);
		if (!isRecord(claims) || 'aud' in claims) throw verifyError;

		const payload = jwt.verify(token, this.jwtSecret, options) as T;
		this.logger.warn('Accepted a token minted before its purpose carried an audience', {
			purpose,
		});
		return payload;
	}
}

export type JwtPayload = jwt.JwtPayload;
