import { mockInstance, testDb } from '@n8n/backend-test-utils';
import { DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { CryptoKey } from 'jose';
import { CompactEncrypt, compactDecrypt, importJWK } from 'jose';
import { InstanceSettings } from 'n8n-core';

import { CacheService } from '@/services/cache/cache.service';

import { OAuthJweKeyService } from '../oauth-jwe-key.service';
import {
	JWE_KEY_ALGORITHMS,
	JWE_KEY_CACHE_KEY,
	JWE_PRIVATE_KEY_TYPE,
} from '../oauth-jwe.constants';

beforeAll(async () => {
	mockInstance(InstanceSettings, {
		encryptionKey: 'oauth-jwe-test-encryption-key',
		n8nFolder: '/tmp/n8n-test',
	});
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['DeploymentKey']);
	await Container.get(CacheService).delete(JWE_KEY_CACHE_KEY);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('OAuthJweKeyService (integration)', () => {
	it('persists exactly one active private-key row per algorithm on first initialize', async () => {
		await Container.get(OAuthJweKeyService).initialize();

		const rows = await Container.get(DeploymentKeyRepository).find({
			where: { type: JWE_PRIVATE_KEY_TYPE, status: 'active' },
		});

		expect(rows).toHaveLength(JWE_KEY_ALGORITHMS.length);
		expect(rows.map((r) => r.algorithm).sort()).toEqual([...JWE_KEY_ALGORITHMS].sort());
		for (const row of rows) {
			expect(row.value).toEqual(expect.any(String));
			expect(row.id).toEqual(expect.any(String));
		}
	});

	it('does not insert a second row when initialize is called again on a fresh process', async () => {
		const service = Container.get(OAuthJweKeyService);

		await service.initialize();
		// Simulate a fresh process / cluster mate that has not warmed the cache yet:
		// it must read the existing row instead of inserting a duplicate.
		await Container.get(CacheService).delete(JWE_KEY_CACHE_KEY);
		await service.initialize();

		const rows = await Container.get(DeploymentKeyRepository).find({
			where: { type: JWE_PRIVATE_KEY_TYPE, status: 'active' },
		});
		expect(rows).toHaveLength(JWE_KEY_ALGORITHMS.length);
	});

	it('returns a key pair whose public JWK has no private RSA material', async () => {
		const service = Container.get(OAuthJweKeyService);
		await service.initialize();

		const { publicJwk, kid, algorithm } = await service.getKeyPair();

		expect(algorithm).toBe(JWE_KEY_ALGORITHMS[0]);
		expect(typeof kid).toBe('string');
		expect(publicJwk).toHaveProperty('n');
		expect(publicJwk).toHaveProperty('e');
		expect(publicJwk).not.toHaveProperty('d');
		expect(publicJwk).not.toHaveProperty('p');
		expect(publicJwk).not.toHaveProperty('q');
	});

	it('generates a usable JWE key pair (encrypt with public, decrypt with private)', async () => {
		const service = Container.get(OAuthJweKeyService);
		await service.initialize();

		const { publicJwk, privateKey, algorithm } = await service.getKeyPair();
		const publicKey = (await importJWK(publicJwk, algorithm)) as CryptoKey;

		const token = await new CompactEncrypt(new TextEncoder().encode('hello-jwe'))
			.setProtectedHeader({ alg: algorithm, enc: 'A256GCM' })
			.encrypt(publicKey);

		const { plaintext } = await compactDecrypt(token, privateKey);
		expect(new TextDecoder().decode(plaintext)).toBe('hello-jwe');
	});
});
