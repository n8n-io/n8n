import { Logger } from '@n8n/backend-common';
import { DeploymentKey, DeploymentKeyRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { CryptoKey, JWK } from 'jose';
import { exportJWK, generateKeyPair, importJWK } from 'jose';
import { Cipher } from 'n8n-core';
import { jsonParse, UnexpectedError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { CacheService } from '@/services/cache/cache.service';

import {
	JWE_KEY_ALGORITHM,
	JWE_KEY_CACHE_KEY,
	JWE_KEY_USE,
	JWE_PRIVATE_KEY_TYPE,
	JWE_PUBLIC_KEY_TYPE,
} from './oauth-jwe.constants';

type OAuthJweKeyPairData = {
	publicJwk: JWK;
	encryptedPrivateJwk: string;
	kid: string;
};

type OAuthJweKeyPair = {
	privateKey: CryptoKey;
	publicKey: CryptoKey;
	publicJwk: JWK;
	kid: string;
};

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
	 * the database's partial unique indexes serialise insertion attempts and
	 * losers re-read the winner's pair.
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
		const data = await this.loadData();
		return data.publicJwk;
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

		const [publicKey, privateKey] = await Promise.all([
			importJWK(data.publicJwk, JWE_KEY_ALGORITHM),
			importJWK(privateJwk, JWE_KEY_ALGORITHM),
		]);

		return {
			publicKey: publicKey as CryptoKey,
			privateKey: privateKey as CryptoKey,
			publicJwk: data.publicJwk,
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
		const [publicRow, privateRow] = await Promise.all([
			this.deploymentKeyRepository.findActiveByType(JWE_PUBLIC_KEY_TYPE),
			this.deploymentKeyRepository.findActiveByType(JWE_PRIVATE_KEY_TYPE),
		]);

		if (!publicRow && !privateRow) return null;

		if (!publicRow || !privateRow) {
			throw new UnexpectedError(
				'OAuth JWE key pair is in an inconsistent state: one row is missing',
			);
		}

		const publicJwk = jsonParse<JWK>(publicRow.value, {
			errorMessage: 'Failed to parse OAuth JWE public key',
		});
		const decryptedPrivate = this.cipher.decryptWithInstanceKey(privateRow.value);
		const privateJwk = jsonParse<JWK>(decryptedPrivate, {
			errorMessage: 'Failed to parse OAuth JWE private key',
		});

		if (!publicJwk.kid || publicJwk.kid !== privateJwk.kid) {
			throw new UnexpectedError('OAuth JWE key pair kid mismatch');
		}

		return {
			publicJwk,
			encryptedPrivateJwk: privateRow.value,
			kid: publicJwk.kid,
		};
	}

	private async generateAndPersist(): Promise<void> {
		const { publicKey, privateKey } = await generateKeyPair(JWE_KEY_ALGORITHM, {
			extractable: true,
		});
		const kid = randomUUID();

		const publicJwk: JWK = {
			...(await exportJWK(publicKey)),
			kid,
			alg: JWE_KEY_ALGORITHM,
			use: JWE_KEY_USE,
		};
		const privateJwk: JWK = {
			...(await exportJWK(privateKey)),
			kid,
			alg: JWE_KEY_ALGORITHM,
			use: JWE_KEY_USE,
		};

		const encryptedPrivate = this.cipher.encryptWithInstanceKey(JSON.stringify(privateJwk));

		try {
			await this.deploymentKeyRepository.manager.transaction(async (tx) => {
				await tx.insert(DeploymentKey, {
					type: JWE_PUBLIC_KEY_TYPE,
					value: JSON.stringify(publicJwk),
					algorithm: JWE_KEY_ALGORITHM,
					status: 'active',
				});
				await tx.insert(DeploymentKey, {
					type: JWE_PRIVATE_KEY_TYPE,
					value: encryptedPrivate,
					algorithm: JWE_KEY_ALGORITHM,
					status: 'active',
				});
			});

			this.logger.info('Generated new instance OAuth JWE key pair', { kid });
		} catch (error) {
			this.logger.debug(
				'OAuth JWE key pair insert raced with another main; re-reading winner',
				error instanceof Error ? { message: error.message } : {},
			);
		}
	}
}
