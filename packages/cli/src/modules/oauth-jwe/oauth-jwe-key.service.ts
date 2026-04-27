import { Logger } from '@n8n/backend-common';
import { DeploymentKeyRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { QueryFailedError } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils';
import type { CryptoKey, JWK } from 'jose';
import { exportJWK, generateKeyPair, importJWK } from 'jose';
import { Cipher } from 'n8n-core';
import { jsonParse, UnexpectedError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import {
	JWE_KEY_ALGORITHM,
	JWE_KEY_CACHE_KEY,
	JWE_KEY_USE,
	JWE_PRIVATE_KEY_TYPE,
} from './oauth-jwe.constants';

import { CacheService } from '@/services/cache/cache.service';

type OAuthJweKeyPairData = {
	encryptedPrivateJwk: string;
	kid: string;
};

type OAuthJweKeyPair = {
	privateKey: CryptoKey;
	publicKey: CryptoKey;
	publicJwk: JWK;
	kid: string;
};

/**
 * Manages a single instance-level JWE key pair pinned to {@link JWE_KEY_ALGORITHM}
 * (`RSA-OAEP-256`). The `deployment_key` storage layer and partial unique index
 * are scoped per algorithm, so future work can add a second active key under a
 * different algorithm without changing the schema; this service would then need
 * to expose lookups by algorithm.
 */
@Service()
export class OAuthJweKeyService {
	constructor(
		private readonly deploymentKeyRepository: DeploymentKeyRepository,
		private readonly cipher: Cipher,
		private readonly cacheService: CacheService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('oauth-jwe');
	}

	/**
	 * Ensures the instance OAuth JWE key pair exists in the database and is
	 * present in the shared cache. Safe to call concurrently across mains:
	 * the database's partial unique index serialises insertion attempts and
	 * losers re-read the winner's row.
	 */
	async initialize(): Promise<void> {
		await this.loadData();
	}

	/**
	 * Returns the instance OAuth JWE key pair with imported {@link CryptoKey}
	 * handles. Reads from the shared cache (populated from the database on
	 * miss) so every main and worker sees the same pair under queue mode.
	 */
	async getKeyPair(): Promise<OAuthJweKeyPair> {
		const data = await this.loadData();
		return await this.deriveKeyPair(data);
	}

	/**
	 * Returns the public JWK of the instance OAuth JWE key pair. For
	 * credential-setup UIs or a future JWKS endpoint that advertises the key
	 * to an IdP.
	 */
	async getPublicJwk(): Promise<JWK> {
		const { publicJwk } = await this.getKeyPair();
		return publicJwk;
	}

	private async loadData(): Promise<OAuthJweKeyPairData> {
		const data = await this.cacheService.get<OAuthJweKeyPairData>(JWE_KEY_CACHE_KEY, {
			refreshFn: async () => await this.loadOrGenerate(),
		});
		if (!data) {
			throw new UnexpectedError('OAuth JWE key pair unavailable');
		}
		return data;
	}

	private async deriveKeyPair(data: OAuthJweKeyPairData): Promise<OAuthJweKeyPair> {
		const decryptedPrivate = this.cipher.decryptWithInstanceKey(data.encryptedPrivateJwk);
		const privateJwk = jsonParse<JWK>(decryptedPrivate, {
			errorMessage: 'Failed to parse OAuth JWE private key',
		});
		const publicJwk = toPublicJwk(privateJwk);

		const [publicKey, privateKey] = await Promise.all([
			importJWK(publicJwk, JWE_KEY_ALGORITHM),
			importJWK(privateJwk, JWE_KEY_ALGORITHM),
		]);

		return {
			publicKey: publicKey as CryptoKey,
			privateKey: privateKey as CryptoKey,
			publicJwk,
			kid: data.kid,
		};
	}

	private async loadOrGenerate(): Promise<OAuthJweKeyPairData> {
		const existing = await this.readActivePairData();
		if (existing) return existing;

		await this.generateAndPersist();

		const winner = await this.readActivePairData();
		if (!winner) {
			throw new UnexpectedError('OAuth JWE key pair not found after generation');
		}
		return winner;
	}

	private async readActivePairData(): Promise<OAuthJweKeyPairData | null> {
		const privateRow = await this.deploymentKeyRepository.findOne({
			where: {
				type: JWE_PRIVATE_KEY_TYPE,
				algorithm: JWE_KEY_ALGORITHM,
				status: 'active',
			},
		});
		if (!privateRow) return null;

		const decryptedPrivate = this.cipher.decryptWithInstanceKey(privateRow.value);
		const privateJwk = jsonParse<JWK>(decryptedPrivate, {
			errorMessage: 'Failed to parse OAuth JWE private key',
		});

		if (!privateJwk.kid) {
			throw new UnexpectedError('OAuth JWE private key is missing a kid');
		}

		return {
			encryptedPrivateJwk: privateRow.value,
			kid: privateJwk.kid,
		};
	}

	private async generateAndPersist(): Promise<void> {
		const { privateKey } = await generateKeyPair(JWE_KEY_ALGORITHM, {
			extractable: true,
		});
		const kid = randomUUID();

		const privateJwk: JWK = {
			...(await exportJWK(privateKey)),
			kid,
			alg: JWE_KEY_ALGORITHM,
			use: JWE_KEY_USE,
		};

		const encryptedPrivate = this.cipher.encryptWithInstanceKey(JSON.stringify(privateJwk));

		try {
			await this.deploymentKeyRepository.insert({
				id: generateNanoId(),
				type: JWE_PRIVATE_KEY_TYPE,
				value: encryptedPrivate,
				algorithm: JWE_KEY_ALGORITHM,
				status: 'active',
			});

			this.logger.info('Generated new instance OAuth JWE key pair', { kid });
		} catch (error) {
			if (!isUniqueConstraintViolation(error)) throw error;

			this.logger.debug(
				'OAuth JWE key insert raced with another main; re-reading winner',
				error instanceof Error ? { message: error.message } : {},
			);
		}
	}
}

/**
 * Strips the private-only fields from an RSA private JWK to produce its
 * public counterpart.
 */
function toPublicJwk(privateJwk: JWK): JWK {
	const { d, p, q, dp, dq, qi, ...publicJwk } = privateJwk;
	return publicJwk;
}

function isUniqueConstraintViolation(error: unknown): boolean {
	if (!(error instanceof QueryFailedError)) return false;
	const driverError = error.driverError as { code?: string };
	const code = driverError?.code;
	return code === '23505' /* postgres */ || code === 'SQLITE_CONSTRAINT_UNIQUE';
}
