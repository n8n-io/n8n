import { createPublicKey } from 'node:crypto';

import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { Algorithm } from 'jsonwebtoken';
import { UnexpectedError } from 'n8n-workflow';
import { z } from 'zod';

import { TokenExchangeConfig } from '../token-exchange.config';
import type { ResolvedTrustedKey, StaticKeySource } from '../token-exchange.schemas';
import { TrustedKeySourceSchema } from '../token-exchange.schemas';

type AlgorithmFamily = 'RSA' | 'EC' | 'EdDSA';

const ALGORITHM_FAMILY: Record<string, AlgorithmFamily> = {
	RS256: 'RSA',
	RS384: 'RSA',
	RS512: 'RSA',
	PS256: 'RSA',
	PS384: 'RSA',
	PS512: 'RSA',
	ES256: 'EC',
	ES384: 'EC',
	ES512: 'EC',
	EdDSA: 'EdDSA',
};

/**
 * Loads and validates trusted public keys at startup, then serves
 * them by Key ID (`kid`) for JWT signature verification.
 *
 * Keys are loaded from the `N8N_TOKEN_EXCHANGE_TRUSTED_KEYS` config
 * (or `_FILE` variant) and stored in-process. JWKS sources are
 * recognised but not yet supported — they log a warning and are skipped.
 */
@Service()
export class TrustedKeyService {
	private readonly logger: Logger;

	private readonly keys = new Map<string, ResolvedTrustedKey>();

	constructor(
		logger: Logger,
		private readonly tokenExchangeConfig: TokenExchangeConfig,
	) {
		this.logger = logger.scoped('token-exchange');
	}

	/**
	 * Parse, validate, and store all configured trusted key sources.
	 * Must be called once during module initialisation — validation
	 * failures throw and prevent startup.
	 */
	async initialize(): Promise<void> {
		const raw = this.tokenExchangeConfig.trustedKeys;

		if (!raw) {
			this.logger.info('No trusted keys configured');
			return;
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch (error) {
			this.logger.error('Failed to parse trusted keys JSON', { error });
			throw new UnexpectedError('Failed to parse trusted keys JSON');
		}

		const sourcesResult = z.array(TrustedKeySourceSchema).safeParse(parsed);

		if (!sourcesResult.success) {
			this.logger.error('Trusted keys JSON has invalid format', { error: sourcesResult.error });
			throw new UnexpectedError('Trusted keys JSON has invalid format');
		}

		const sources = sourcesResult.data;

		for (const source of sources) {
			if (source.type === 'jwks') {
				this.logger.warn('JWKS key sources are not yet supported, skipping kid in source');
				continue;
			}
			this.validateAndStoreStaticKey(source);
		}

		this.logger.info(`Loaded ${this.keys.size} trusted key(s)`);
	}

	/**
	 * Look up a resolved trusted key by its `kid`.
	 * @returns the resolved key, or `undefined` if the kid is unknown.
	 */
	async getByKid(kid: string): Promise<ResolvedTrustedKey | undefined> {
		return this.keys.get(kid);
	}

	/** Number of loaded keys — useful for diagnostics and tests. */
	get size(): number {
		return this.keys.size;
	}

	private validateAndStoreStaticKey(source: StaticKeySource): void {
		const { kid, algorithms, key: pemString, issuer, expectedAudience, allowedRoles } = source;

		// 1. Reject duplicate kid
		if (this.keys.has(kid)) {
			throw new UnexpectedError(`Trusted key "${kid}": duplicate kid`);
		}

		// 2. Resolve and validate algorithm families
		const families = new Set<AlgorithmFamily>();
		for (const alg of algorithms) {
			const family = ALGORITHM_FAMILY[alg];
			if (!family) {
				throw new UnexpectedError(`Trusted key "${kid}": unknown algorithm "${alg}"`);
			}
			families.add(family);
		}

		// 3. Reject cross-family mixing
		if (families.size > 1) {
			throw new UnexpectedError(
				`Trusted key "${kid}": algorithms must belong to the same family, got ${[...families].join(', ')}`,
			);
		}

		const family = [...families][0];

		// 4. Parse PEM
		let keyObject: ReturnType<typeof createPublicKey>;
		try {
			keyObject = createPublicKey(pemString);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'unknown error';
			throw new UnexpectedError(`Trusted key "${kid}": failed to parse public key — ${message}`);
		}

		// 5. Validate key type matches algorithm family
		const keyType = keyObject.asymmetricKeyType;
		const expectedTypes: Record<AlgorithmFamily, string[]> = {
			RSA: ['rsa'],
			EC: ['ec'],
			EdDSA: ['ed25519', 'ed448'],
		};

		if (!expectedTypes[family].includes(keyType ?? '')) {
			throw new UnexpectedError(
				`Trusted key "${kid}": key type "${keyType}" does not match algorithm family "${family}"`,
			);
		}

		// 6. Store resolved key
		this.keys.set(kid, {
			kid,
			algorithms: algorithms as Algorithm[],
			key: keyObject,
			issuer,
			expectedAudience,
			allowedRoles,
		});
	}
}
