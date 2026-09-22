import { mockInstance } from '@n8n/backend-test-utils';
import type { DeploymentKey } from '@n8n/db';
import { DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { QueryFailedError } from '@n8n/typeorm';
import { exportJWK, generateKeyPair } from 'jose';
import type { JWK } from 'jose';
import { Cipher } from 'n8n-core';

import { CacheService } from '@/services/cache/cache.service';

import { OAuthJweKeyService } from '../oauth-jwe-key.service';
import { JWE_KEY_ALGORITHMS, JWE_PRIVATE_KEY_TYPE } from '../oauth-jwe.constants';

const ALGORITHM = JWE_KEY_ALGORITHMS[0];

let privateJwkFixture: JWK;

const makeRow = (overrides: Partial<DeploymentKey> = {}): DeploymentKey =>
	({
		id: 'row-1',
		type: JWE_PRIVATE_KEY_TYPE,
		value: 'enc-private-jwk',
		algorithm: ALGORITHM,
		status: 'active',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	}) as DeploymentKey;

const makeUniqueViolation = (code: string): QueryFailedError => {
	const err = new QueryFailedError('insert', [], new Error('duplicate'));
	(err as unknown as { driverError: { code: string } }).driverError = { code };
	return err;
};

describe('OAuthJweKeyService', () => {
	const repository = mockInstance(DeploymentKeyRepository);
	const cipher = mockInstance(Cipher);
	const cacheService = mockInstance(CacheService);

	beforeAll(async () => {
		const pair = await generateKeyPair(ALGORITHM, { extractable: true });
		privateJwkFixture = {
			...(await exportJWK(pair.privateKey)),
			kid: 'row-1',
			alg: ALGORITHM,
			use: 'enc',
		};
	});

	beforeEach(() => {
		vi.clearAllMocks();

		// Default: cache miss; refreshFn runs and its result is returned.
		cacheService.get.mockImplementation(async (_key, options) => {
			return await options?.refreshFn?.('cache-key');
		});
		cipher.encryptDEKWithInstanceKey.mockImplementation((value: string) => `enc(${value})`);
		cipher.decryptDEKWithInstanceKey.mockImplementation((value: string) =>
			value.startsWith('enc(') ? value.slice(4, -1) : JSON.stringify(privateJwkFixture),
		);
	});

	describe('initialize / loadOrGenerate', () => {
		it('reuses an existing active row without inserting', async () => {
			repository.findActiveOAuthJweKey.mockResolvedValue(
				makeRow({ value: JSON.stringify(privateJwkFixture) }),
			);
			cipher.decryptDEKWithInstanceKey.mockReturnValue(JSON.stringify(privateJwkFixture));

			await Container.get(OAuthJweKeyService).initialize();

			expect(repository.insertActiveOAuthJweKey).not.toHaveBeenCalled();
		});

		it('generates and persists a new key pair when none exists', async () => {
			let row: DeploymentKey | null = null;
			repository.findActiveOAuthJweKey.mockImplementation(async () => row);
			repository.insertActiveOAuthJweKey.mockImplementation(async (id, value, algorithm) => {
				row = makeRow({
					id,
					value,
					algorithm,
				});
			});

			await Container.get(OAuthJweKeyService).initialize();

			expect(repository.insertActiveOAuthJweKey).toHaveBeenCalledTimes(1);
			const [id, value, algorithm] = repository.insertActiveOAuthJweKey.mock.calls[0];
			expect(id).toEqual(expect.any(String));
			expect(value).toEqual(expect.any(String));
			expect(algorithm).toBe(ALGORITHM);
			expect(cipher.encryptDEKWithInstanceKey).toHaveBeenCalledTimes(1);
		});

		it('throws when the persisted private JWK has no kid', async () => {
			const { kid: _kid, ...kidless } = privateJwkFixture;
			repository.findActiveOAuthJweKey.mockResolvedValue(makeRow({ value: 'enc-row' }));
			cipher.decryptDEKWithInstanceKey.mockReturnValue(JSON.stringify(kidless));

			await expect(Container.get(OAuthJweKeyService).initialize()).rejects.toThrow(
				`OAuth JWE private key for "${ALGORITHM}" is missing a kid`,
			);
		});

		it('throws when the persisted JWK kid does not match the row id', async () => {
			repository.findActiveOAuthJweKey.mockResolvedValue(
				makeRow({ id: 'different-id', value: 'enc-row' }),
			);
			cipher.decryptDEKWithInstanceKey.mockReturnValue(JSON.stringify(privateJwkFixture));

			await expect(Container.get(OAuthJweKeyService).initialize()).rejects.toThrow(
				`OAuth JWE private key for "${ALGORITHM}" has a kid that does not match its row id`,
			);
		});

		it('throws when the post-generate re-read returns null', async () => {
			repository.findActiveOAuthJweKey.mockResolvedValue(null);
			repository.insertActiveOAuthJweKey.mockResolvedValue(undefined);

			await expect(Container.get(OAuthJweKeyService).initialize()).rejects.toThrow(
				`OAuth JWE key for algorithm "${ALGORITHM}" not found after generation`,
			);
		});
	});

	describe('race handling', () => {
		it('swallows a postgres unique-constraint violation and re-reads the winner', async () => {
			let row: DeploymentKey | null = null;
			repository.findActiveOAuthJweKey.mockImplementation(async () => row);
			repository.insertActiveOAuthJweKey.mockImplementation(async () => {
				row = makeRow({ value: 'winner-row' });
				cipher.decryptDEKWithInstanceKey.mockImplementation((value: string) =>
					value === 'winner-row' ? JSON.stringify(privateJwkFixture) : '',
				);
				throw makeUniqueViolation('23505');
			});

			await expect(Container.get(OAuthJweKeyService).initialize()).resolves.not.toThrow();
		});

		it('swallows a sqlite unique-constraint violation', async () => {
			let row: DeploymentKey | null = null;
			repository.findActiveOAuthJweKey.mockImplementation(async () => row);
			repository.insertActiveOAuthJweKey.mockImplementation(async () => {
				row = makeRow({ value: 'winner-row' });
				cipher.decryptDEKWithInstanceKey.mockImplementation((value: string) =>
					value === 'winner-row' ? JSON.stringify(privateJwkFixture) : '',
				);
				throw makeUniqueViolation('SQLITE_CONSTRAINT_UNIQUE');
			});

			await expect(Container.get(OAuthJweKeyService).initialize()).resolves.not.toThrow();
		});

		it('re-throws non-unique-constraint errors unchanged', async () => {
			repository.findActiveOAuthJweKey.mockResolvedValue(null);
			const connectionError = makeUniqueViolation('ECONNREFUSED');
			repository.insertActiveOAuthJweKey.mockRejectedValue(connectionError);

			await expect(Container.get(OAuthJweKeyService).initialize()).rejects.toBe(connectionError);
		});
	});

	describe('getKeyPair / getPublicJwk', () => {
		beforeEach(() => {
			repository.findActiveOAuthJweKey.mockResolvedValue(makeRow({ value: 'enc-active' }));
			cipher.decryptDEKWithInstanceKey.mockReturnValue(JSON.stringify(privateJwkFixture));
		});

		it('uses the first algorithm by default', async () => {
			const pair = await Container.get(OAuthJweKeyService).getKeyPair();

			expect(pair.algorithm).toBe(ALGORITHM);
			expect(pair.kid).toBe('row-1');
		});

		it('throws for an unsupported algorithm', async () => {
			await expect(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				Container.get(OAuthJweKeyService).getKeyPair('NOT-A-REAL-ALG' as any),
			).rejects.toThrow('No active OAuth JWE key found for algorithm "NOT-A-REAL-ALG"');
		});

		it('strips private RSA fields from the derived public JWK', async () => {
			const { publicJwk } = await Container.get(OAuthJweKeyService).getKeyPair();

			expect(publicJwk).not.toHaveProperty('d');
			expect(publicJwk).not.toHaveProperty('p');
			expect(publicJwk).not.toHaveProperty('q');
			expect(publicJwk).not.toHaveProperty('dp');
			expect(publicJwk).not.toHaveProperty('dq');
			expect(publicJwk).not.toHaveProperty('qi');
			expect(publicJwk).toHaveProperty('n');
			expect(publicJwk).toHaveProperty('e');
			expect(publicJwk.kid).toBe('row-1');
		});

		it('getPublicJwk returns the same JWK as getKeyPair().publicJwk', async () => {
			const service = Container.get(OAuthJweKeyService);

			const publicJwk = await service.getPublicJwk();
			const fromPair = (await service.getKeyPair()).publicJwk;

			expect(publicJwk).toEqual(fromPair);
		});

		it('getPublicJwks returns one JWK per supported algorithm', async () => {
			const jwks = await Container.get(OAuthJweKeyService).getPublicJwks();

			expect(jwks).toHaveLength(JWE_KEY_ALGORITHMS.length);
			expect(jwks[0]).toHaveProperty('n');
		});
	});

	describe('earlier wrap format', () => {
		const legacyValue = 'U2FsdGVkX1-legacy-wrapped';

		beforeEach(() => {
			repository.findActiveOAuthJweKey.mockResolvedValue(makeRow({ value: legacyValue }));
			cipher.decryptWithInstanceKey.mockReturnValue(JSON.stringify(privateJwkFixture));
		});

		it('reads a row in the earlier wrap format and leaves the stored value untouched', async () => {
			repository.findActiveOAuthJweKey.mockResolvedValue(makeRow({ value: legacyValue }));

			const pair = await Container.get(OAuthJweKeyService).getKeyPair();

			expect(pair.kid).toBe('row-1');
			expect(cipher.decryptWithInstanceKey).toHaveBeenCalledWith(legacyValue);
			// Older instances in a rolling deployment can only read this format,
			// and the cache is shared — the stored row must not be rewritten.
			expect(repository.insertActiveOAuthJweKey).not.toHaveBeenCalled();
		});

		it('does not touch a row already in the DEK-style wrap', async () => {
			repository.findActiveOAuthJweKey.mockResolvedValue(makeRow({ value: 'enc-active' }));

			await Container.get(OAuthJweKeyService).getKeyPair();

			expect(repository.insertActiveOAuthJweKey).not.toHaveBeenCalled();
			expect(cipher.decryptWithInstanceKey).not.toHaveBeenCalled();
		});
	});

	describe('cache hit', () => {
		it('does not invoke refreshFn when the cache returns data', async () => {
			cacheService.get.mockResolvedValue([
				{
					algorithm: ALGORITHM,
					encryptedPrivateJwk: 'cached-row',
					kid: 'row-1',
				},
			]);
			cipher.decryptDEKWithInstanceKey.mockReturnValue(JSON.stringify(privateJwkFixture));

			await Container.get(OAuthJweKeyService).getKeyPair();

			expect(repository.findActiveOAuthJweKey).not.toHaveBeenCalled();
			expect(repository.insertActiveOAuthJweKey).not.toHaveBeenCalled();
		});
	});
});
