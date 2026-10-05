import { Logger } from '@n8n/backend-common';
import { DeploymentKeyRepository, isUniqueConstraintError } from '@n8n/db';
import type { DeploymentKey } from '@n8n/db';
import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import type { JWK } from 'jose';
import { JsonWebTokenError } from 'jsonwebtoken';
import { Cipher } from 'n8n-core';
import { jsonParse, UnexpectedError } from 'n8n-workflow';
import type { JsonWebKey, KeyObject } from 'node:crypto';
import { createPrivateKey, createPublicKey, generateKeyPair } from 'node:crypto';
import { promisify } from 'node:util';

import { JwtService, type JwtPayload } from '@/services/jwt.service';

import {
	ACCESS_TOKEN_TYPES,
	OAUTH_SIGNING_ALGORITHM,
	OAUTH_SIGNING_CURVE,
	OAUTH_SIGNING_KEY_USE,
	RETIRED_SIGNING_KEY_GRACE_MS,
	SIGNING_KEYS_REFRESH_MS,
	UNKNOWN_KID_REFRESH_MS,
} from './oauth-signing-key.constants';

const generateKeyPairAsync = promisify(generateKeyPair);

/** A signing key as process memory holds it. It never holds the private key. */
type PublishedSigningKey = {
	kid: string;
	publicJwk: JWK;
	publicKey: KeyObject;
	active: boolean;
	/** Epoch ms of the last row update. For an inactive key, this is when it was retired. */
	updatedAt: number;
};

type PublishedKeyList = {
	keys: PublishedSigningKey[];
	/** Epoch ms of the database read. */
	readAt: number;
};

type ActiveSigningKey = {
	kid: string;
	privateKey: KeyObject;
};

type VerifyAccessTokenOptions = {
	/** The `kid` header value. Its type is not checked yet. */
	kid: unknown;
	audiences: string[];
	issuer: string;
};

/** The only JWK members safe to publish for an EC signing key. */
const PUBLIC_JWK_FIELDS = ['kty', 'crv', 'x', 'y', 'kid', 'alg', 'use'] as const;

/**
 * Manages the ES256 key pair that signs OAuth access tokens. One active
 * private JWK is stored in `deployment_key` per algorithm, enforced by a
 * partial unique index on `(type, algorithm)`. The JWK `kid` and the
 * `deployment_key.id` are the same nanoid, as for the JWE keys.
 *
 * Signing is synchronous: {@link initialize} loads the private key into
 * memory once. Each process also keeps the public keys in memory, so
 * verification does not call Redis or the database for each token. Workers
 * read the public keys on first use and never keep a private key.
 */
@Service()
export class OAuthSigningKeyService {
	private activeKey: ActiveSigningKey | null = null;

	private publishedKeys: PublishedKeyList | null = null;

	private pendingRead: Promise<PublishedKeyList> | null = null;

	constructor(
		private readonly deploymentKeyRepository: DeploymentKeyRepository,
		private readonly cipher: Cipher,
		private readonly logger: Logger,
		private readonly jwtService: JwtService,
	) {}

	/**
	 * Loads the active signing key, and generates it on first boot. Safe to
	 * call concurrently across processes: the partial unique index lets one
	 * insert win, and the others read the winner's row.
	 */
	async initialize(): Promise<void> {
		let row = await this.deploymentKeyRepository.findActiveOAuthSigningKey(OAUTH_SIGNING_ALGORITHM);

		if (!row) {
			await this.generateAndPersist();
			row = await this.deploymentKeyRepository.findActiveOAuthSigningKey(OAUTH_SIGNING_ALGORITHM);
		}

		if (!row) {
			throw new UnexpectedError('OAuth signing key not found after generation');
		}

		const privateJwk = this.readPrivateJwk(row);
		this.activeKey = {
			kid: row.id,
			privateKey: createPrivateKey({ key: privateJwk, format: 'jwk' }),
		};
	}

	/** Signs an RFC 9068 access token for `audience` with the active key. */
	signAccessToken(payload: object, audience: string): string {
		if (!this.activeKey) {
			throw new UnexpectedError('OAuth signing key is not initialized');
		}

		const { kid, privateKey } = this.activeKey;
		return this.jwtService.signForResource(payload, audience, privateKey, {
			algorithm: OAUTH_SIGNING_ALGORITHM,
			header: { alg: OAUTH_SIGNING_ALGORITHM, typ: 'at+jwt', kid },
		});
	}

	/**
	 * Public JWKs of the active key and of the keys retired within
	 * {@link RETIRED_SIGNING_KEY_GRACE_MS}. The window is checked on every
	 * call, so the in-memory list does not keep a retired key alive.
	 */
	async getPublicJwks(): Promise<JWK[]> {
		const keys = await this.loadPublishedKeys();
		return keys.map((key) => key.publicJwk);
	}

	/**
	 * Verifies a token that carries a `kid` header. The key comes from this
	 * service's own list, and the algorithm comes from the key, never from
	 * the token header. There is no fallback to the HMAC secret.
	 */
	async verifyAccessToken(
		token: string,
		{ kid, audiences, issuer }: VerifyAccessTokenOptions,
	): Promise<JwtPayload> {
		if (typeof kid !== 'string' || kid.length === 0) {
			throw new JsonWebTokenError('kid is invalid');
		}

		const key = await this.findPublishedKey(kid);
		if (!key) {
			throw new JsonWebTokenError('kid is unknown');
		}

		const verified = this.jwtService.verifyForResource(
			token,
			audiences as [string, ...string[]],
			key.publicKey,
			{ algorithms: [OAUTH_SIGNING_ALGORITHM], issuer },
		);

		const { typ } = verified.header;
		if (typeof typ !== 'string' || !ACCESS_TOKEN_TYPES.some((t) => t === typ.toLowerCase())) {
			throw new JsonWebTokenError('typ is invalid');
		}

		const { payload } = verified;
		if (typeof payload !== 'object' || typeof payload.exp !== 'number') {
			throw new JsonWebTokenError('exp is missing');
		}

		return payload;
	}

	/**
	 * A kid that is not in the list reads the list again, because another
	 * process may have created the key since this process read it.
	 */
	private async findPublishedKey(kid: string): Promise<PublishedSigningKey | undefined> {
		const keys = await this.loadPublishedKeys(SIGNING_KEYS_REFRESH_MS);
		const key = keys.find((k) => k.kid === kid);
		if (key) return key;

		const refreshed = await this.loadPublishedKeys(UNKNOWN_KID_REFRESH_MS);
		return refreshed.find((k) => k.kid === kid);
	}

	/** Reads the list again only when it is older than `maxAgeMs`. */
	private async loadPublishedKeys(
		maxAgeMs = SIGNING_KEYS_REFRESH_MS,
	): Promise<PublishedSigningKey[]> {
		let list = this.publishedKeys;
		if (!list || Date.now() - list.readAt >= maxAgeMs) {
			list = await this.readPublishedKeys();
		}

		const now = Date.now();
		return list.keys.filter(
			(key) => key.active || now - key.updatedAt <= RETIRED_SIGNING_KEY_GRACE_MS,
		);
	}

	/** Concurrent callers share one database read. */
	private async readPublishedKeys(): Promise<PublishedKeyList> {
		this.pendingRead ??= this.readPublishedKeyRows().finally(() => {
			this.pendingRead = null;
		});
		return await this.pendingRead;
	}

	private async readPublishedKeyRows(): Promise<PublishedKeyList> {
		const rows = await this.deploymentKeyRepository.findOAuthSigningKeys();
		const keys = rows
			.filter((row) => row.algorithm === OAUTH_SIGNING_ALGORITHM)
			.map((row) => {
				const publicJwk = toPublicJwk(this.readPrivateJwk(row));
				const { kty, crv, x, y } = publicJwk;
				return {
					kid: row.id,
					publicJwk,
					publicKey: createPublicKey({ key: { kty, crv, x, y }, format: 'jwk' }),
					active: row.status === 'active',
					updatedAt: new Date(row.updatedAt).getTime(),
				};
			});

		this.publishedKeys = { keys, readAt: Date.now() };
		return this.publishedKeys;
	}

	private readPrivateJwk(row: DeploymentKey): JsonWebKey {
		const privateJwk = jsonParse<JsonWebKey>(this.cipher.decryptDEKWithInstanceKey(row.value), {
			errorMessage: 'Failed to parse OAuth signing key',
		});

		if (privateJwk.kid !== row.id) {
			throw new UnexpectedError('OAuth signing key has a kid that does not match its row id');
		}

		return privateJwk;
	}

	private async generateAndPersist(): Promise<void> {
		const { privateKey } = await generateKeyPairAsync('ec', {
			namedCurve: OAUTH_SIGNING_CURVE,
		});
		// The JWK kid is the deployment_key row's primary key.
		const id = generateNanoId();

		const privateJwk: JsonWebKey = {
			...privateKey.export({ format: 'jwk' }),
			kid: id,
			alg: OAUTH_SIGNING_ALGORITHM,
			use: OAUTH_SIGNING_KEY_USE,
		};

		// Same wrapping as data-encryption keys: instance-key wrapped, GCM.
		const encryptedPrivate = this.cipher.encryptDEKWithInstanceKey(JSON.stringify(privateJwk));

		try {
			await this.deploymentKeyRepository.insertActiveOAuthSigningKey(
				id,
				encryptedPrivate,
				OAUTH_SIGNING_ALGORITHM,
			);
			// Other processes read the new key when they first see its kid.
			this.publishedKeys = null;

			this.logger.info('Generated new OAuth access-token signing key', { kid: id });
		} catch (error) {
			if (!isUniqueConstraintError(error)) throw error;

			this.logger.debug('OAuth signing key insert raced with another process; re-reading winner');
		}
	}
}

/** Picks only the allow-listed public members. Any other member is dropped. */
function toPublicJwk(privateJwk: JsonWebKey): JWK {
	const entries = PUBLIC_JWK_FIELDS.filter((field) => privateJwk[field] !== undefined).map(
		(field) => [field, privateJwk[field]] as const,
	);
	return Object.fromEntries(entries);
}
