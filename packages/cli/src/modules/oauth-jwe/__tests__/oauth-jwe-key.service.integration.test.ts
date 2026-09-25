import { Logger } from '@n8n/backend-common';
import { mockInstance, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { DeploymentKey, DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';
import type { CryptoKey } from 'jose';
import { CompactEncrypt, compactDecrypt, exportJWK, generateKeyPair, importJWK } from 'jose';
import { Cipher, InstanceSettings } from 'n8n-core';

import { CacheService } from '@/services/cache/cache.service';

import { OAuthJweKeyService } from '../oauth-jwe-key.service';
import {
	JWE_KEY_ALGORITHMS,
	JWE_KEY_CACHE_KEY,
	JWE_PRIVATE_KEY_TYPE,
} from '../oauth-jwe.constants';

let keyStore: Repository<DeploymentKey>;

beforeAll(async () => {
	mockInstance(InstanceSettings, {
		encryptionKey: 'oauth-jwe-test-encryption-key',
		n8nFolder: '/tmp/n8n-test',
	});
	await testDb.init();
	keyStore = Container.get(DataSource).getRepository(DeploymentKey);
});

beforeEach(async () => {
	await testDb.resetDeploymentKeys();
	await Container.get(CacheService).delete(JWE_KEY_CACHE_KEY);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('OAuthJweKeyService (integration)', () => {
	it('persists exactly one active private-key row per algorithm on first initialize', async () => {
		await Container.get(OAuthJweKeyService).initialize();

		const rows = await keyStore.find({
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

		const rows = await keyStore.find({
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

	it('stores new private JWKs in the DEK-style wrap', async () => {
		await Container.get(OAuthJweKeyService).initialize();

		const rows = await keyStore.find({
			where: { type: JWE_PRIVATE_KEY_TYPE, status: 'active' },
		});
		const cipher = Container.get(Cipher);
		for (const row of rows) {
			expect(row.value.startsWith('U2FsdGVkX1')).toBe(false);
			const jwk = JSON.parse(cipher.decryptDEKWithInstanceKey(row.value)) as { kid?: string };
			expect(jwk.kid).toBe(row.id);
		}
	});

	it('reads a row in the earlier wrap format and leaves its stored wrap in place', async () => {
		const algorithm = JWE_KEY_ALGORITHMS[0];
		const cipher = Container.get(Cipher);

		// A row as earlier releases persisted it.
		const id = 'legacy-format-row-1';
		const { privateKey } = await generateKeyPair(algorithm, { extractable: true });
		const privateJwk = { ...(await exportJWK(privateKey)), kid: id, alg: algorithm, use: 'enc' };
		const legacyValue = cipher.encryptWithInstanceKey(JSON.stringify(privateJwk));
		expect(legacyValue.startsWith('U2FsdGVkX1')).toBe(true);
		await keyStore.insert({
			id,
			type: JWE_PRIVATE_KEY_TYPE,
			value: legacyValue,
			algorithm,
			status: 'active',
		});

		const service = Container.get(OAuthJweKeyService);
		await service.initialize();

		// The pair is usable and keeps its identity.
		const pair = await service.getKeyPair(algorithm);
		expect(pair.kid).toBe(id);

		// The stored value keeps its wrap byte for byte: older instances in a
		// rolling deployment can only read this format, and the cache is shared.
		const row = await keyStore.findOne({ where: { id } });
		expect(row!.value).toBe(legacyValue);

		// A cold re-read leaves it untouched too.
		await Container.get(CacheService).delete(JWE_KEY_CACHE_KEY);
		await service.initialize();
		const rowAfter = await keyStore.findOne({ where: { id } });
		expect(rowAfter!.value).toBe(legacyValue);
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

	describe('multi-main', () => {
		const MAIN_COUNT = 3;

		/** Resolves every caller at once, after `count` callers have arrived. */
		const createBarrier = (count: number) => {
			let arrived = 0;
			let releaseAll: () => void = () => {};
			const released = new Promise<void>((resolve) => {
				releaseAll = resolve;
			});
			return async () => {
				arrived++;
				if (arrived === count) releaseAll();
				await released;
			};
		};

		/**
		 * Each main gets its own memory cache, so each main must end up with the
		 * database row itself. A shared Redis cache only holds a copy of that row.
		 */
		const createMains = () =>
			Array.from(
				{ length: MAIN_COUNT },
				() =>
					new OAuthJweKeyService(
						Container.get(DeploymentKeyRepository),
						Container.get(Cipher),
						new CacheService(Container.get(GlobalConfig)),
						Container.get(Logger),
					),
			);

		let insertSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			// Hold every insert until all mains reach it. This makes all mains read
			// "no key" and try to insert together, so the unique index must resolve
			// the race.
			const repository = Container.get(DeploymentKeyRepository);
			const insert = repository.insertActiveOAuthJweKey.bind(repository);
			const barriers = new Map<string, () => Promise<void>>(
				JWE_KEY_ALGORITHMS.map((algorithm) => [algorithm, createBarrier(MAIN_COUNT)]),
			);
			insertSpy = vi
				.spyOn(repository, 'insertActiveOAuthJweKey')
				.mockImplementation(async (id, value, algorithm) => {
					await barriers.get(algorithm)?.();
					await insert(id, value, algorithm);
				});
		});

		afterEach(() => {
			insertSpy.mockRestore();
		});

		it('keeps one active key per algorithm when several mains start at the same time', async () => {
			const mains = createMains();

			await Promise.all(mains.map(async (main) => await main.initialize()));

			expect(insertSpy).toHaveBeenCalledTimes(MAIN_COUNT * JWE_KEY_ALGORITHMS.length);
			const rows = await keyStore.find({
				where: { type: JWE_PRIVATE_KEY_TYPE, status: 'active' },
			});
			expect(rows).toHaveLength(JWE_KEY_ALGORITHMS.length);
		});

		it('serves the same key on every main after they start at the same time', async () => {
			const mains = createMains();
			await Promise.all(mains.map(async (main) => await main.initialize()));

			const rows = await keyStore.find({
				where: { type: JWE_PRIVATE_KEY_TYPE, status: 'active' },
			});
			const jwksPerMain = await Promise.all(mains.map(async (main) => await main.getPublicJwks()));
			for (const jwks of jwksPerMain) {
				expect(jwks).toEqual(jwksPerMain[0]);
				expect(jwks.map((jwk) => jwk.kid).sort()).toEqual(rows.map((row) => row.id).sort());
			}

			// The IdP encrypts with the key it fetched from one main. Another main
			// decrypts the token.
			const [firstMain, , lastMain] = mains;
			const { publicJwk, algorithm } = await firstMain.getKeyPair();
			const publicKey = (await importJWK(publicJwk, algorithm)) as CryptoKey;
			const token = await new CompactEncrypt(new TextEncoder().encode('hello-multi-main'))
				.setProtectedHeader({ alg: algorithm, enc: 'A256GCM' })
				.encrypt(publicKey);

			const { privateKey } = await lastMain.getKeyPair();
			const { plaintext } = await compactDecrypt(token, privateKey);
			expect(new TextDecoder().decode(plaintext)).toBe('hello-multi-main');
		});
	});
});
