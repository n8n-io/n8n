import { mock } from 'vitest-mock-extended';
import type { DeploymentKey } from '@n8n/db';
import { QueryFailedError } from '@n8n/typeorm';
import { createLocalJWKSet, jwtVerify } from 'jose';
import jwt from 'jsonwebtoken';
import { generateKeyPairSync } from 'node:crypto';

import {
	OAUTH_SIGNING_ALGORITHM,
	OAUTH_SIGNING_KEY_TYPE,
	OAUTH_SIGNING_KEYS_CACHE_KEY,
	RETIRED_SIGNING_KEY_GRACE_MS,
} from '../oauth-signing-key.constants';
import type { OAuthSigningKeyService } from '../oauth-signing-key.service';
import { createSigningKeyService } from './signing-key-fixtures';

const ISSUER = 'https://n8n.example.com';
const AUDIENCE = `${ISSUER}/mcp-server/http`;

const claims = () => {
	const now = Math.floor(Date.now() / 1000);
	return { iss: ISSUER, aud: AUDIENCE, sub: 'user-1', iat: now, exp: now + 3600 };
};

const makeUniqueViolation = (code: string): QueryFailedError => {
	const err = new QueryFailedError('insert', [], new Error('duplicate'));
	(err as unknown as { driverError: { code: string } }).driverError = { code };
	return err;
};

/** A stored row for a fresh RSA key, wrapped the way the fixture cipher unwraps it. */
const makeKeyRow = (id: string, overrides: Partial<DeploymentKey> = {}): DeploymentKey => {
	const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
	const privateJwk = {
		...privateKey.export({ format: 'jwk' }),
		kid: id,
		alg: OAUTH_SIGNING_ALGORITHM,
		use: 'sig',
	};
	const now = new Date();
	return mock<DeploymentKey>({
		id,
		type: OAUTH_SIGNING_KEY_TYPE,
		value: `wrapped:${JSON.stringify(privateJwk)}`,
		algorithm: OAUTH_SIGNING_ALGORITHM,
		status: 'active',
		createdAt: now,
		updatedAt: now,
		...overrides,
	});
};

describe('OAuthSigningKeyService', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	describe('initialize', () => {
		it('reuses an existing active key without inserting', async () => {
			const { service, keyStore } = createSigningKeyService();
			keyStore.rows.push(makeKeyRow('existing-key'));

			await service.initialize();

			expect(keyStore.repository.insertActiveOAuthSigningKey).not.toHaveBeenCalled();
			expect(jwt.decode(service.signAccessToken(claims()), { complete: true })?.header.kid).toBe(
				'existing-key',
			);
		});

		it('generates a key whose kid is the row id, wraps it, and drops the cached key list', async () => {
			const { service, keyStore, cipher, cache } = createSigningKeyService();

			await service.initialize();

			expect(keyStore.repository.insertActiveOAuthSigningKey).toHaveBeenCalledTimes(1);
			const [id, value, algorithm] = keyStore.repository.insertActiveOAuthSigningKey.mock.calls[0];
			expect(algorithm).toBe(OAUTH_SIGNING_ALGORITHM);
			expect(cipher.encryptDEKWithInstanceKey).toHaveBeenCalledTimes(1);
			expect(value).toBe(cipher.encryptDEKWithInstanceKey.mock.results[0].value);
			expect(JSON.parse(cipher.decryptDEKWithInstanceKey(value))).toMatchObject({
				kid: id,
				alg: 'RS256',
				use: 'sig',
				kty: 'RSA',
			});
			expect(cache.delete).toHaveBeenCalledWith(OAUTH_SIGNING_KEYS_CACHE_KEY);
			expect(jwt.decode(service.signAccessToken(claims()), { complete: true })?.header.kid).toBe(
				id,
			);
		});

		it.each([
			['postgres', '23505'],
			['sqlite', 'SQLITE_CONSTRAINT_UNIQUE'],
		])('uses the winning key when a %s insert races with another process', async (_, code) => {
			const { service, keyStore } = createSigningKeyService();
			keyStore.repository.insertActiveOAuthSigningKey.mockImplementation(async () => {
				keyStore.rows.push(makeKeyRow('winner'));
				throw makeUniqueViolation(code);
			});

			await service.initialize();

			expect(keyStore.rows).toHaveLength(1);
			expect(jwt.decode(service.signAccessToken(claims()), { complete: true })?.header.kid).toBe(
				'winner',
			);
		});

		it('rejects a stored key whose kid does not match its row id', async () => {
			const { service, keyStore } = createSigningKeyService();
			const row = makeKeyRow('row-id');
			row.id = 'another-row-id';
			keyStore.rows.push(row);

			await expect(service.initialize()).rejects.toThrow(
				'OAuth signing key has a kid that does not match its row id',
			);
		});
	});

	it('throws when signing before initialize', () => {
		const { service } = createSigningKeyService();

		expect(() => service.signAccessToken(claims())).toThrow('OAuth signing key is not initialized');
	});

	it('publishes only the public members of the key', async () => {
		const { service } = createSigningKeyService();
		await service.initialize();

		const jwks = await service.getPublicJwks();

		expect(jwks).toHaveLength(1);
		expect(Object.keys(jwks[0]).sort()).toEqual(['alg', 'e', 'kid', 'kty', 'n', 'use']);
		expect(jwks[0]).toMatchObject({ kty: 'RSA', alg: 'RS256', use: 'sig' });
	});

	describe('retired keys', () => {
		const setUp = async () => {
			vi.useFakeTimers({ toFake: ['Date'] });
			const { service, keyStore } = createSigningKeyService();
			keyStore.rows.push(makeKeyRow('retired', { status: 'inactive', updatedAt: new Date() }));
			await service.initialize();
			return { service };
		};

		const publishedKids = async (service: OAuthSigningKeyService) =>
			(await service.getPublicJwks()).map((k) => k.kid);

		it('stay published within the grace window', async () => {
			const { service } = await setUp();

			// One second before the window closes.
			vi.advanceTimersByTime(RETIRED_SIGNING_KEY_GRACE_MS - 1000);
			expect(await publishedKids(service)).toContain('retired');
		});

		it('drop out after the grace window, even from a cached key list', async () => {
			const { service } = await setUp();
			// Fill the cache while the retired key is still in its window.
			await service.getPublicJwks();
			vi.advanceTimersByTime(RETIRED_SIGNING_KEY_GRACE_MS + 1000);

			expect(await publishedKids(service)).not.toContain('retired');
		});
	});

	it('signs tokens that jose verifies against the published keys', async () => {
		const { service } = createSigningKeyService();
		await service.initialize();

		const token = service.signAccessToken(claims());
		const jwks = createLocalJWKSet({ keys: await service.getPublicJwks() });

		const { payload, protectedHeader } = await jwtVerify(token, jwks, {
			issuer: ISSUER,
			audience: AUDIENCE,
			typ: 'at+jwt',
			algorithms: ['RS256'],
		});
		expect(payload.sub).toBe('user-1');
		expect(protectedHeader.alg).toBe('RS256');
	});
});
