import { Logger } from '@n8n/backend-common';
import { DeploymentKeyRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { QueryFailedError } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils';
import type { CryptoKey, JWK } from 'jose';
import { exportJWK, generateKeyPair, importJWK } from 'jose';
import { Cipher } from 'n8n-core';
import { jsonParse, UnexpectedError } from 'n8n-workflow';

import { CacheService } from '@/services/cache/cache.service';

import {
	JWE_KEY_ALGORITHMS,
	JWE_KEY_CACHE_KEY,
	JWE_KEY_USE,
	JWE_PRIVATE_KEY_TYPE,
	type JweKeyAlgorithm,
} from './oauth-jwe.constants';

type OAuthJweKeyEntry = {
	algorithm: JweKeyAlgorithm;
	encryptedPrivateJwk: string;
	kid: string;
};

type OAuthJweKeyPair = {
	algorithm: JweKeyAlgorithm;
	privateKey: CryptoKey;
	publicKey: CryptoKey;
	publicJwk: JWK;
	kid: string;
};

/**
 * Manages the instance-level OAuth JWE key pairs. One active private JWK is
 * stored in `deployment_key` per algorithm in {@link JWE_KEY_ALGORITHMS},
 * enforced by a partial unique index on `(type, algorithm)`. Today the list
 * holds only `RSA-OAEP-256`; adding another algorithm is a constant-only
 * change and the next boot generates the missing key pair.
 *
 * The JWK `kid` and the `deployment_key.id` are the same nanoid, so a future
 * kid-keyed lookup over decryption-only inactive rows can use the row's
 * primary key directly.
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
	 * Ensures every supported algorithm has an active private JWK in the
	 * database and is present in the shared cache. Safe to call concurrently
	 * across mains: the partial unique index serialises insertion attempts
	 * per algorithm and losers re-read the winner's row.
	 */
	async initialize(): Promise<void> {
		await this.loadData();
	}

	/**
	 * Returns the OAuth JWE key pair for the given algorithm, with imported
	 * {@link CryptoKey} handles. Reads from the shared cache (populated from
	 * the database on miss) so every main and worker sees the same pair under
	 * queue mode.
	 */
	async getKeyPair(algorithm: JweKeyAlgorithm = JWE_KEY_ALGORITHMS[0]): Promise<OAuthJweKeyPair> {
		const entry = await this.findEntry(algorithm);
		return await this.deriveKeyPair(entry);
	}

	/**
	 * Returns the public JWK for the given algorithm. For credential-setup
	 * UIs or a future JWKS endpoint that advertises the key to an IdP.
	 */
	async getPublicJwk(algorithm: JweKeyAlgorithm = JWE_KEY_ALGORITHMS[0]): Promise<JWK> {
		const { publicJwk } = await this.getKeyPair(algorithm);
		return publicJwk;
	}

	/** Returns the public JWK for every supported algorithm, e.g. for a JWKS endpoint. */
	async getPublicJwks(): Promise<JWK[]> {
		const data = await this.loadData();
		return await Promise.all(
			data.map(async (entry) => (await this.deriveKeyPair(entry)).publicJwk),
		);
	}

	private async findEntry(algorithm: JweKeyAlgorithm): Promise<OAuthJweKeyEntry> {
		const data = await this.loadData();
		const entry = data.find((e) => e.algorithm === algorithm);
		if (!entry) {
			throw new UnexpectedError(`No active OAuth JWE key found for algorithm "${algorithm}"`);
		}
		return entry;
	}

	private async loadData(): Promise<OAuthJweKeyEntry[]> {
		const data = await this.cacheService.get<OAuthJweKeyEntry[]>(JWE_KEY_CACHE_KEY, {
			refreshFn: async () => await this.loadOrGenerate(),
		});
		if (!data || data.length === 0) {
			throw new UnexpectedError('OAuth JWE key pair unavailable');
		}
		return data;
	}

	private async deriveKeyPair(entry: OAuthJweKeyEntry): Promise<OAuthJweKeyPair> {
		const decryptedPrivate = this.cipher.decryptWithInstanceKey(entry.encryptedPrivateJwk);
		const privateJwk = jsonParse<JWK>(decryptedPrivate, {
			errorMessage: 'Failed to parse OAuth JWE private key',
		});
		const publicJwk = toPublicJwk(privateJwk, entry.algorithm);

		const [publicKey, privateKey] = await Promise.all([
			importJWK(publicJwk, entry.algorithm),
			importJWK(privateJwk, entry.algorithm),
		]);

		return {
			algorithm: entry.algorithm,
			publicKey: publicKey as CryptoKey,
			privateKey: privateKey as CryptoKey,
			publicJwk,
			kid: entry.kid,
		};
	}

	private async loadOrGenerate(): Promise<OAuthJweKeyEntry[]> {
		const entries: OAuthJweKeyEntry[] = [];

		for (const algorithm of JWE_KEY_ALGORITHMS) {
			let entry = await this.readActiveEntry(algorithm);

			if (!entry) {
				await this.generateAndPersist(algorithm);
				entry = await this.readActiveEntry(algorithm);
			}

			if (!entry) {
				throw new UnexpectedError(
					`OAuth JWE key for algorithm "${algorithm}" not found after generation`,
				);
			}

			entries.push(entry);
		}

		return entries;
	}

	private async readActiveEntry(algorithm: JweKeyAlgorithm): Promise<OAuthJweKeyEntry | null> {
		const privateRow = await this.deploymentKeyRepository.findOne({
			where: {
				type: JWE_PRIVATE_KEY_TYPE,
				algorithm,
				status: 'active',
			},
		});
		if (!privateRow) return null;

		const decryptedPrivate = this.cipher.decryptWithInstanceKey(privateRow.value);
		const privateJwk = jsonParse<JWK>(decryptedPrivate, {
			errorMessage: 'Failed to parse OAuth JWE private key',
		});

		if (!privateJwk.kid) {
			throw new UnexpectedError(`OAuth JWE private key for "${algorithm}" is missing a kid`);
		}

		if (privateJwk.kid !== privateRow.id) {
			throw new UnexpectedError(
				`OAuth JWE private key for "${algorithm}" has a kid that does not match its row id`,
			);
		}

		return {
			algorithm,
			encryptedPrivateJwk: privateRow.value,
			kid: privateRow.id,
		};
	}

	private async generateAndPersist(algorithm: JweKeyAlgorithm): Promise<void> {
		const { privateKey } = await generateKeyPair(algorithm, { extractable: true });
		// The JWK kid is the deployment_key row's primary key.
		const id = generateNanoId();

		const privateJwk: JWK = {
			...(await exportJWK(privateKey)),
			kid: id,
			alg: algorithm,
			use: JWE_KEY_USE,
		};

		const encryptedPrivate = this.cipher.encryptWithInstanceKey(JSON.stringify(privateJwk));

		try {
			await this.deploymentKeyRepository.insert({
				id,
				type: JWE_PRIVATE_KEY_TYPE,
				value: encryptedPrivate,
				algorithm,
				status: 'active',
			});

			this.logger.info('Generated new instance OAuth JWE key pair', { algorithm, kid: id });
		} catch (error) {
			if (!isUniqueConstraintViolation(error)) throw error;

			this.logger.debug(
				'OAuth JWE key insert raced with another main; re-reading winner',
				error instanceof Error ? { algorithm, message: error.message } : { algorithm },
			);
		}
	}
}

/**
 * Per-algorithm allow-list of JWK fields safe to expose publicly. Adding a
 * new algorithm to {@link JWE_KEY_ALGORITHMS} forces a corresponding entry
 * here at compile time, so the failure mode for an unrecognised algorithm
 * is "we forgot to expose a public field" (visible) rather than "we leaked
 * a private one" (silent).
 */
const PUBLIC_JWK_FIELDS: Record<JweKeyAlgorithm, ReadonlyArray<keyof JWK>> = {
	'RSA-OAEP-256': ['kty', 'kid', 'alg', 'use', 'n', 'e'],
};

/**
 * Picks only the public fields of a private JWK based on the algorithm's
 * allow-list. Any field not explicitly listed is dropped.
 */
function toPublicJwk(privateJwk: JWK, algorithm: JweKeyAlgorithm): JWK {
	const allowed = PUBLIC_JWK_FIELDS[algorithm];
	const entries = allowed
		.filter((field) => privateJwk[field] !== undefined)
		.map((field) => [field, privateJwk[field]] as const);
	return Object.fromEntries(entries) as JWK;
}

function isUniqueConstraintViolation(error: unknown): boolean {
	if (!(error instanceof QueryFailedError)) return false;
	const driverError = error.driverError as { code?: string };
	const code = driverError?.code;
	return code === '23505' /* postgres */ || code === 'SQLITE_CONSTRAINT_UNIQUE';
}
