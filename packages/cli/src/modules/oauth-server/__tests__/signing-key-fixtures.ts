import type { Logger } from '@n8n/backend-common';
import type { CacheService } from '@n8n/backend-services';
import type { DeploymentKey, DeploymentKeyRepository } from '@n8n/db';
import type { Cipher, InstanceSettings } from 'n8n-core';
import type { JsonWebKey, KeyObject } from 'node:crypto';
import { createPrivateKey, sign as cryptoSign } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { JwtService } from '@/services/jwt.service';

import { OAUTH_SIGNING_KEY_TYPE } from '../oauth-signing-key.constants';
import { OAuthSigningKeyService } from '../oauth-signing-key.service';

const WRAP_PREFIX = 'wrapped:';

/** A cipher that tags values, so tests can read stored private JWKs back. */
export const createTaggingCipher = () => {
	const cipher = mock<Cipher>();
	cipher.encryptDEKWithInstanceKey.mockImplementation((value: string) => `${WRAP_PREFIX}${value}`);
	cipher.decryptDEKWithInstanceKey.mockImplementation((value: string) =>
		value.slice(WRAP_PREFIX.length),
	);
	return cipher;
};

/** A cache backed by a map, with the `refreshFn` semantics of `CacheService.get`. */
export const createMapCache = () => {
	const store = new Map<string, unknown>();
	const cache = mock<CacheService>();
	cache.get.mockImplementation(async (key, options) => {
		if (store.has(key)) return store.get(key);
		const value = await options?.refreshFn?.(key);
		if (value !== undefined) store.set(key, value);
		return value;
	});
	cache.delete.mockImplementation(async (key) => {
		store.delete(key);
	});
	return { cache, store };
};

/** `deployment_key` rows in memory, behind the repository methods the service calls. */
export const createDeploymentKeyStore = () => {
	const rows: DeploymentKey[] = [];
	const repository = mock<DeploymentKeyRepository>();
	repository.findActiveOAuthSigningKey.mockImplementation(
		async (algorithm) =>
			rows.find(
				(r) =>
					r.type === OAUTH_SIGNING_KEY_TYPE && r.algorithm === algorithm && r.status === 'active',
			) ?? null,
	);
	repository.findOAuthSigningKeys.mockImplementation(async () =>
		rows.filter((r) => r.type === OAUTH_SIGNING_KEY_TYPE),
	);
	repository.insertActiveOAuthSigningKey.mockImplementation(async (id, value, algorithm) => {
		const now = new Date();
		rows.push(
			mock<DeploymentKey>({
				id,
				type: OAUTH_SIGNING_KEY_TYPE,
				value,
				algorithm,
				status: 'active',
				createdAt: now,
				updatedAt: now,
			}),
		);
	});
	return { rows, repository };
};

/** A real signing-key service over in-memory storage. */
export const createSigningKeyService = () => {
	const keyStore = createDeploymentKeyStore();
	const cipher = createTaggingCipher();
	const { cache, store: cacheStore } = createMapCache();
	const jwtService = new JwtService(
		mock<InstanceSettings>({ encryptionKey: 'test-key' }),
		mock(),
		mock(),
	);
	const service = new OAuthSigningKeyService(
		keyStore.repository,
		cipher,
		cache,
		mock<Logger>(),
		jwtService,
	);
	return { service, keyStore, cipher, cache, cacheStore };
};

/** Reads a stored private key back, e.g. to sign tokens the service would not sign. */
export const readStoredPrivateKey = (row: DeploymentKey): KeyObject => {
	const jwk = JSON.parse(row.value.slice(WRAP_PREFIX.length)) as JsonWebKey;
	return createPrivateKey({ key: jwk, format: 'jwk' });
};

const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/**
 * Builds a compact JWS by hand, so a test can set any header and signature
 * that a JWT library would refuse to produce.
 */
export const forgeJwt = (
	header: Record<string, unknown>,
	payload: Record<string, unknown>,
	signWith: ((signingInput: string) => Buffer) | null,
): string => {
	const signingInput = `${base64url(header)}.${base64url(payload)}`;
	const signature = signWith ? signWith(signingInput).toString('base64url') : '';
	return `${signingInput}.${signature}`;
};

export const rs256Signer = (privateKey: KeyObject) => (signingInput: string) =>
	cryptoSign('sha256', Buffer.from(signingInput), privateKey);

/** JWS carries an ECDSA signature as raw `r || s`, not DER (RFC 7518 §3.4). */
export const es256Signer = (privateKey: KeyObject) => (signingInput: string) =>
	cryptoSign('sha256', Buffer.from(signingInput), { key: privateKey, dsaEncoding: 'ieee-p1363' });
