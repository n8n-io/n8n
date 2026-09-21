import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { DeploymentKey } from '@n8n/db';
import { DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	Cipher,
	CipherAes256CBC,
	CipherAes256GCM,
	type EncryptionKeyProxy,
	InstanceSettings,
} from 'n8n-core';
import { randomBytes } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { KeyManagerService } from '@/encryption/key-manager.service';

const makeKey = (overrides: Partial<DeploymentKey> = {}): DeploymentKey =>
	({
		id: 'key-1',
		type: 'data_encryption',
		value: 'secret',
		algorithm: 'aes-256-gcm',
		status: 'active',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	}) as DeploymentKey;

// Builds a service with its own mocks so the memoized keys and the by-id LRU
// start cold, independent of the shared DI singleton and test order.
const makeFreshService = () => {
	const repo = mock<DeploymentKeyRepository>();
	const cipherMock = mock<Cipher>();
	const service = new KeyManagerService(
		repo,
		cipherMock,
		mock<InstanceSettings>({ encryptionKey: 'test_key' }),
		mock<Logger>(),
	);
	return { service, repo, cipherMock };
};

describe('KeyManagerService', () => {
	const repository = mockInstance(DeploymentKeyRepository);
	const cipher = mockInstance(Cipher);
	const instanceSettings = mockInstance(InstanceSettings, {
		encryptionKey: 'test-instance-key',
	});
	mockInstance(Logger);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getActiveKey() with rotation enabled', () => {
		beforeEach(() => {
			process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION = 'true';
		});

		afterEach(() => {
			delete process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION;
		});

		it('returns the active key as a prefixed descriptor', async () => {
			const { service, repo } = makeFreshService();
			const key = makeKey();
			repo.findActiveDataEncryptionKeys.mockResolvedValue([key]);

			const result = await service.getActiveKey();

			expect(result).toEqual({
				id: key.id,
				value: key.value,
				algorithm: key.algorithm,
				format: 'prefixed',
			});
		});

		it('throws NotFoundError when no active key exists, without memoizing the absence', async () => {
			const { service, repo } = makeFreshService();
			repo.findActiveDataEncryptionKeys.mockResolvedValue([]);

			await expect(service.getActiveKey()).rejects.toThrow(NotFoundError);
			// The absence is re-checked, not memoized.
			await expect(service.getActiveKey()).rejects.toThrow(NotFoundError);
			expect(repo.findActiveDataEncryptionKeys).toHaveBeenCalledTimes(2);
		});

		it('throws when multiple active keys exist (invariant violation)', async () => {
			const { service, repo } = makeFreshService();
			repo.findActiveDataEncryptionKeys.mockResolvedValue([
				makeKey({ id: 'key-1' }),
				makeKey({ id: 'key-2' }),
			]);

			await expect(service.getActiveKey()).rejects.toThrow(
				'Encryption key invariant violated: multiple active keys found',
			);
		});
	});

	describe('getActiveKey() with rotation disabled', () => {
		beforeEach(() => {
			// The disabled path must not depend on the ambient environment.
			delete process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION;
		});

		// Fresh instances: the legacy descriptor is memoized per service instance.
		const createService = () =>
			new KeyManagerService(repository, cipher, instanceSettings, mock<Logger>());

		it('returns the legacy no-prefix descriptor without touching the database', async () => {
			cipher.encryptDEKWithInstanceKey.mockReturnValue('wrapped-instance-key');

			const result = await createService().getActiveKey();

			expect(result).toEqual({
				id: 'instance-key',
				value: 'wrapped-instance-key',
				algorithm: 'aes-256-cbc',
				format: 'no-prefix',
			});
			expect(cipher.encryptDEKWithInstanceKey).toHaveBeenCalledWith('test-instance-key');
			expect(repository.findActiveDataEncryptionKeys).not.toHaveBeenCalled();
		});

		it('memoizes the legacy descriptor', async () => {
			cipher.encryptDEKWithInstanceKey.mockReturnValue('wrapped-instance-key');
			const service = createService();

			const first = await service.getActiveKey();
			const second = await service.getActiveKey();

			expect(second).toBe(first);
			expect(cipher.encryptDEKWithInstanceKey).toHaveBeenCalledTimes(1);
		});
	});

	describe('getKeyById()', () => {
		it('returns KeyInfo when key exists', async () => {
			const { service, repo } = makeFreshService();
			const key = makeKey();
			repo.findDataEncryptionKeyById.mockResolvedValue(key);

			const result = await service.getKeyById('key-1');

			expect(result).toEqual({
				id: key.id,
				value: key.value,
				algorithm: key.algorithm,
				format: 'prefixed',
			});
			expect(repo.findDataEncryptionKeyById).toHaveBeenCalledWith('key-1');
		});

		it('returns null when key not found', async () => {
			const { service, repo } = makeFreshService();
			repo.findDataEncryptionKeyById.mockResolvedValue(null);

			const result = await service.getKeyById('missing');

			expect(result).toBeNull();
		});

		it('serves repeated lookups from the LRU without another database read', async () => {
			const { service, repo } = makeFreshService();
			repo.findDataEncryptionKeyById.mockResolvedValue(makeKey());

			const first = await service.getKeyById('key-1');
			const second = await service.getKeyById('key-1');

			expect(repo.findDataEncryptionKeyById).toHaveBeenCalledTimes(1);
			expect(second).toBe(first);
		});

		it('does not cache misses, so an unknown id cannot evict real keys', async () => {
			const { service, repo } = makeFreshService();
			repo.findDataEncryptionKeyById.mockResolvedValue(null);

			await service.getKeyById('missing');
			await service.getKeyById('missing');

			expect(repo.findDataEncryptionKeyById).toHaveBeenCalledTimes(2);
		});

		it('caches exactly up to capacity without evicting', async () => {
			const { service, repo } = makeFreshService();
			repo.findDataEncryptionKeyById.mockImplementation(async (id) => makeKey({ id }));

			// Fill the LRU to exactly its capacity of 10 — no eviction yet.
			for (let i = 0; i < 10; i++) {
				await service.getKeyById(`key-${i}`);
			}
			for (let i = 0; i < 10; i++) {
				await service.getKeyById(`key-${i}`);
			}
			expect(repo.findDataEncryptionKeyById).toHaveBeenCalledTimes(10);
		});

		it('evicts the LEAST RECENTLY USED entry beyond capacity, not the oldest inserted', async () => {
			const { service, repo } = makeFreshService();
			repo.findDataEncryptionKeyById.mockImplementation(async (id) => makeKey({ id }));

			for (let i = 0; i < 10; i++) {
				await service.getKeyById(`key-${i}`);
			}
			// Touch the oldest-inserted entry so key-1 becomes least recently used.
			await service.getKeyById('key-0');
			expect(repo.findDataEncryptionKeyById).toHaveBeenCalledTimes(10);

			// The 11th distinct id evicts key-1 (LRU), not key-0 (refreshed).
			await service.getKeyById('key-10');
			expect(repo.findDataEncryptionKeyById).toHaveBeenCalledTimes(11);

			await service.getKeyById('key-0');
			expect(repo.findDataEncryptionKeyById).toHaveBeenCalledTimes(11);
			await service.getKeyById('key-1');
			expect(repo.findDataEncryptionKeyById).toHaveBeenCalledTimes(12);
		});
	});

	describe('active-key memo', () => {
		beforeEach(() => {
			process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION = 'true';
		});

		afterEach(() => {
			delete process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION;
		});

		it('memoizes the database view and refreshes it after the memo expires', async () => {
			vi.useFakeTimers();
			try {
				const { service, repo } = makeFreshService();
				repo.findActiveDataEncryptionKeys.mockResolvedValue([makeKey()]);

				const first = await service.getActiveKey();
				const second = await service.getActiveKey();
				expect(second).toBe(first);
				expect(repo.findActiveDataEncryptionKeys).toHaveBeenCalledTimes(1);

				// Past the memo TTL the database view is re-read — this is also the
				// propagation window for a rotation done on another instance.
				vi.advanceTimersByTime(6000);
				await service.getActiveKey();
				expect(repo.findActiveDataEncryptionKeys).toHaveBeenCalledTimes(2);
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe('getLegacyKey()', () => {
		it('returns the stored KeyInfo for the aes-256-cbc key when the store serves it', async () => {
			const { service, repo, cipherMock } = makeFreshService();
			const key = makeKey({ algorithm: 'aes-256-cbc' });
			repo.findDataEncryptionKeyByAlgorithm.mockResolvedValue(key);

			const result = await service.getLegacyKey();

			expect(result).toEqual({
				id: key.id,
				value: key.value,
				algorithm: 'aes-256-cbc',
				format: 'no-prefix',
			});
			expect(repo.findDataEncryptionKeyByAlgorithm).toHaveBeenCalledWith('aes-256-cbc');
			expect(cipherMock.encryptDEKWithInstanceKey).not.toHaveBeenCalled();
		});

		it('memoizes the stored legacy key — the row is immutable once seeded', async () => {
			const { service, repo } = makeFreshService();
			repo.findDataEncryptionKeyByAlgorithm.mockResolvedValue(
				makeKey({ algorithm: 'aes-256-cbc' }),
			);

			const first = await service.getLegacyKey();
			const second = await service.getLegacyKey();

			expect(repo.findDataEncryptionKeyByAlgorithm).toHaveBeenCalledTimes(1);
			expect(second).toBe(first);
		});

		it('falls back to the instance key when the legacy key is not seeded', async () => {
			const { service, repo, cipherMock } = makeFreshService();
			repo.findDataEncryptionKeyByAlgorithm.mockResolvedValue(null);
			cipherMock.encryptDEKWithInstanceKey.mockReturnValue('wrapped-instance-key');

			const result = await service.getLegacyKey();

			expect(result.value).toBe('wrapped-instance-key');
			expect(result.algorithm).toBe('aes-256-cbc');
			expect(cipherMock.encryptDEKWithInstanceKey).toHaveBeenCalledWith('test_key');
		});

		it('falls back to the instance key when the store lookup fails', async () => {
			const { service, repo, cipherMock } = makeFreshService();
			repo.findDataEncryptionKeyByAlgorithm.mockRejectedValue(new Error('connection refused'));
			cipherMock.encryptDEKWithInstanceKey.mockReturnValue('wrapped-instance-key');

			const result = await service.getLegacyKey();

			expect(result.value).toBe('wrapped-instance-key');
			expect(result.algorithm).toBe('aes-256-cbc');
			expect(cipherMock.encryptDEKWithInstanceKey).toHaveBeenCalledWith('test_key');
		});

		// The seeded legacy key IS the instance key, so the fallback wraps the
		// instance key exactly as bootstrap would.
		it('wraps the instance key only once and reuses the result', async () => {
			const { service, repo, cipherMock } = makeFreshService();
			repo.findDataEncryptionKeyByAlgorithm.mockResolvedValue(null);
			cipherMock.encryptDEKWithInstanceKey.mockReturnValue('wrapped-instance-key');

			const first = await service.getLegacyKey();
			const second = await service.getLegacyKey();

			expect(cipherMock.encryptDEKWithInstanceKey).toHaveBeenCalledTimes(1);
			expect(cipherMock.encryptDEKWithInstanceKey).toHaveBeenCalledWith('test_key');
			expect(first).toEqual({
				id: 'instance-key',
				value: 'wrapped-instance-key',
				algorithm: 'aes-256-cbc',
				format: 'no-prefix',
			});
			expect(second).toBe(first);
		});
	});

	describe('bootstrapLegacyCbcKey()', () => {
		it('is a no-op when a CBC key already exists', async () => {
			repository.findDataEncryptionKeyByAlgorithm.mockResolvedValue(
				makeKey({ algorithm: 'aes-256-cbc', status: 'inactive' }),
			);

			await Container.get(KeyManagerService).bootstrapLegacyCbcKey('instance-key');

			expect(repository.findDataEncryptionKeyByAlgorithm).toHaveBeenCalledWith('aes-256-cbc');
			expect(repository.seedLegacyCbcKey).not.toHaveBeenCalled();
		});

		it('encrypts the instance key and seeds it when no CBC key exists', async () => {
			repository.findDataEncryptionKeyByAlgorithm.mockResolvedValue(null);
			cipher.encryptDEKWithInstanceKey.mockReturnValue('encrypted-instance-key');

			await Container.get(KeyManagerService).bootstrapLegacyCbcKey('instance-key');

			expect(cipher.encryptDEKWithInstanceKey).toHaveBeenCalledWith('instance-key');
			// The repository seeds inside a DbLock critical section, which keeps
			// concurrent startups from creating duplicate rows.
			expect(repository.seedLegacyCbcKey).toHaveBeenCalledWith('encrypted-instance-key');
			expect(repository.insertInactiveDataEncryptionKey).not.toHaveBeenCalled();
		});
	});

	describe('bootstrapGcmKey()', () => {
		it('is a no-op when an active GCM key already exists', async () => {
			repository.findActiveDataEncryptionKeyByAlgorithm.mockResolvedValue(
				makeKey({ algorithm: 'aes-256-gcm', status: 'active' }),
			);

			await Container.get(KeyManagerService).bootstrapGcmKey();

			expect(repository.findActiveDataEncryptionKeyByAlgorithm).toHaveBeenCalledWith('aes-256-gcm');
			expect(repository.seedActiveDataEncryptionKey).not.toHaveBeenCalled();
		});

		it('generates a 64-char hex key and inserts as active when no active GCM key exists', async () => {
			repository.findActiveDataEncryptionKeyByAlgorithm.mockResolvedValue(null);
			cipher.encryptDEKWithInstanceKey.mockReturnValue('encrypted-gcm-key');

			await Container.get(KeyManagerService).bootstrapGcmKey();

			expect(cipher.encryptDEKWithInstanceKey).toHaveBeenCalledTimes(1);
			const [rawKey] = cipher.encryptDEKWithInstanceKey.mock.calls[0];
			expect(typeof rawKey).toBe('string');
			expect(rawKey).toHaveLength(64);
			expect(repository.seedActiveDataEncryptionKey).toHaveBeenCalledWith(
				'encrypted-gcm-key',
				'aes-256-gcm',
			);
		});
	});

	describe('addKey()', () => {
		it('encrypts the value and inserts as inactive when setAsActive is not set', async () => {
			const saved = makeKey({ id: 'new-key', status: 'inactive' });
			repository.insertInactiveDataEncryptionKey.mockResolvedValue(saved);
			cipher.encryptDEKWithInstanceKey.mockReturnValue('encrypted-base64');

			const result = await Container.get(KeyManagerService).addKey('secret', 'aes-256-gcm');

			expect(cipher.encryptDEKWithInstanceKey).toHaveBeenCalledWith('secret');
			expect(repository.insertAndActivateDataEncryptionKey).not.toHaveBeenCalled();
			expect(repository.insertInactiveDataEncryptionKey).toHaveBeenCalledWith(
				'encrypted-base64',
				'aes-256-gcm',
			);
			expect(result).toBe(saved);
		});

		it('encrypts the value and inserts it as active when setAsActive=true', async () => {
			const saved = makeKey({ id: 'new-key', status: 'active' });
			repository.insertAndActivateDataEncryptionKey.mockResolvedValue(saved);
			cipher.encryptDEKWithInstanceKey.mockReturnValue('encrypted-base64');

			const result = await Container.get(KeyManagerService).addKey('secret', 'aes-256-gcm', true);

			expect(cipher.encryptDEKWithInstanceKey).toHaveBeenCalledWith('secret');
			expect(repository.insertInactiveDataEncryptionKey).not.toHaveBeenCalled();
			expect(repository.insertAndActivateDataEncryptionKey).toHaveBeenCalledWith(
				'encrypted-base64',
				'aes-256-gcm',
			);
			expect(result).toBe(saved);
		});

		describe('active-key memo effects (rotation on)', () => {
			beforeEach(() => {
				process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION = 'true';
			});

			afterEach(() => {
				delete process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION;
			});

			it('switches the very next write to the new key after the insert commits', async () => {
				const { service, repo, cipherMock } = makeFreshService();
				const saved = makeKey({ id: 'new-key', status: 'active' });
				repo.insertAndActivateDataEncryptionKey.mockResolvedValue(saved);
				cipherMock.encryptDEKWithInstanceKey.mockReturnValue('encrypted-base64');

				await service.addKey('secret', 'aes-256-gcm', true);
				const active = await service.getActiveKey();

				expect(active.id).toBe('new-key');
				// Served from the memo the commit refreshed — no database read.
				expect(repo.findActiveDataEncryptionKeys).not.toHaveBeenCalled();
			});

			it('does not update the memo when the insert fails', async () => {
				const { service, repo, cipherMock } = makeFreshService();
				repo.insertAndActivateDataEncryptionKey.mockRejectedValue(new Error('db down'));
				cipherMock.encryptDEKWithInstanceKey.mockReturnValue('encrypted-base64');

				await expect(service.addKey('secret', 'aes-256-gcm', true)).rejects.toThrow('db down');

				// The next write must re-read the store, not trust a failed rotation.
				repo.findActiveDataEncryptionKeys.mockResolvedValue([makeKey({ id: 'still-active' })]);
				const active = await service.getActiveKey();
				expect(active.id).toBe('still-active');
			});

			it('does not touch the memo for an inactive key insert', async () => {
				const { service, repo, cipherMock } = makeFreshService();
				const saved = makeKey({ id: 'spare-key', status: 'inactive' });
				repo.insertInactiveDataEncryptionKey.mockResolvedValue(saved);
				cipherMock.encryptDEKWithInstanceKey.mockReturnValue('encrypted-base64');

				await service.addKey('secret', 'aes-256-gcm');

				repo.findActiveDataEncryptionKeys.mockResolvedValue([makeKey({ id: 'the-active-one' })]);
				const active = await service.getActiveKey();
				expect(active.id).toBe('the-active-one');
			});
		});
	});

	describe('rotateKey()', () => {
		it('generates a 64-char hex key and inserts it as active with aes-256-gcm', async () => {
			const saved = makeKey({ id: 'rotated', status: 'active', algorithm: 'aes-256-gcm' });
			repository.insertAndActivateDataEncryptionKey.mockResolvedValue(saved);
			cipher.encryptDEKWithInstanceKey.mockReturnValue('encrypted-base64');

			const result = await Container.get(KeyManagerService).rotateKey();

			expect(cipher.encryptDEKWithInstanceKey).toHaveBeenCalledTimes(1);
			const [rawKey] = cipher.encryptDEKWithInstanceKey.mock.calls[0];
			expect(typeof rawKey).toBe('string');
			expect(rawKey.length).toBe(64);

			expect(repository.insertAndActivateDataEncryptionKey).toHaveBeenCalledWith(
				'encrypted-base64',
				'aes-256-gcm',
			);
			expect(result).toBe(saved);
		});

		it('generates a fresh key value on each call', async () => {
			const saved = makeKey();
			repository.insertAndActivateDataEncryptionKey.mockResolvedValue(saved);
			cipher.encryptDEKWithInstanceKey.mockImplementation(
				(data: string | object) => `enc:${String(data)}`,
			);

			await Container.get(KeyManagerService).rotateKey();
			await Container.get(KeyManagerService).rotateKey();

			const [first] = cipher.encryptDEKWithInstanceKey.mock.calls[0];
			const [second] = cipher.encryptDEKWithInstanceKey.mock.calls[1];
			expect(first).not.toBe(second);
		});
	});

	describe('listKeys()', () => {
		it('forwards pagination and defaults to createdAt:desc when sortBy is not provided', async () => {
			const rows = [makeKey({ id: 'k1' }), makeKey({ id: 'k2' })];
			repository.findAndCountForList.mockResolvedValue({ items: rows, count: 2 });

			const result = await Container.get(KeyManagerService).listKeys({
				skip: 0,
				take: 10,
			} as never);

			expect(repository.findAndCountForList).toHaveBeenCalledWith({
				type: undefined,
				sortField: 'createdAt',
				sortDirection: 'DESC',
				skip: 0,
				take: 10,
				createdAtFrom: undefined,
				createdAtTo: undefined,
			});
			expect(result).toEqual({ items: rows, count: 2 });
		});

		it('parses sortBy into sortField and sortDirection', async () => {
			repository.findAndCountForList.mockResolvedValue({ items: [], count: 0 });

			await Container.get(KeyManagerService).listKeys({
				skip: 5,
				take: 25,
				sortBy: 'updatedAt:asc',
			} as never);

			expect(repository.findAndCountForList).toHaveBeenCalledWith(
				expect.objectContaining({
					sortField: 'updatedAt',
					sortDirection: 'ASC',
					skip: 5,
					take: 25,
				}),
			);
		});

		it('forwards type and date range parsed as Date instances', async () => {
			repository.findAndCountForList.mockResolvedValue({ items: [], count: 0 });

			await Container.get(KeyManagerService).listKeys({
				skip: 0,
				take: 10,
				type: 'data_encryption',
				sortBy: 'status:desc',
				activatedFrom: '2026-04-01T00:00:00.000Z',
				activatedTo: '2026-04-30T23:59:59.999Z',
			} as never);

			const call = repository.findAndCountForList.mock.calls[0][0];
			expect(call.type).toBe('data_encryption');
			expect(call.sortField).toBe('status');
			expect(call.sortDirection).toBe('DESC');
			expect(call.createdAtFrom).toBeInstanceOf(Date);
			expect(call.createdAtFrom?.toISOString()).toBe('2026-04-01T00:00:00.000Z');
			expect(call.createdAtTo).toBeInstanceOf(Date);
			expect(call.createdAtTo?.toISOString()).toBe('2026-04-30T23:59:59.999Z');
		});

		it('returns the repository result unchanged', async () => {
			const rows = [makeKey({ id: 'k1' })];
			repository.findAndCountForList.mockResolvedValue({ items: rows, count: 7 });

			const result = await Container.get(KeyManagerService).listKeys({
				skip: 0,
				take: 10,
			} as never);

			expect(result).toEqual({ items: rows, count: 7 });
		});
	});

	describe('setActiveKey()', () => {
		beforeEach(() => {
			process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION = 'true';
		});

		afterEach(() => {
			delete process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION;
		});

		it('activates the key and invalidates the memo', async () => {
			const { service, repo } = makeFreshService();
			repo.findActiveDataEncryptionKeys.mockResolvedValue([makeKey({ id: 'old-active' })]);
			await service.getActiveKey(); // primes the memo
			repo.activateDataEncryptionKey.mockResolvedValue(undefined);

			await service.setActiveKey('target');

			expect(repo.activateDataEncryptionKey).toHaveBeenCalledWith('target');
			// The memo was dropped: the next write re-reads the store.
			repo.findActiveDataEncryptionKeys.mockResolvedValue([makeKey({ id: 'target' })]);
			const active = await service.getActiveKey();
			expect(active.id).toBe('target');
			expect(repo.findActiveDataEncryptionKeys).toHaveBeenCalledTimes(2);
		});

		it('keeps the memo when the promotion fails', async () => {
			const { service, repo } = makeFreshService();
			repo.findActiveDataEncryptionKeys.mockResolvedValue([makeKey({ id: 'old-active' })]);
			await service.getActiveKey();
			repo.activateDataEncryptionKey.mockRejectedValue(new Error('not found'));

			await expect(service.setActiveKey('ghost')).rejects.toThrow('not found');

			const active = await service.getActiveKey();
			expect(active.id).toBe('old-active');
			expect(repo.findActiveDataEncryptionKeys).toHaveBeenCalledTimes(1);
		});
	});

	describe('markInactive()', () => {
		beforeEach(() => {
			process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION = 'true';
		});

		afterEach(() => {
			delete process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION;
		});

		it('sets status to inactive and invalidates the memo', async () => {
			const { service, repo } = makeFreshService();
			repo.findActiveDataEncryptionKeys.mockResolvedValue([makeKey({ id: 'old-active' })]);
			await service.getActiveKey(); // primes the memo

			await service.markInactive('old-active');

			expect(repo.deactivateDataEncryptionKey).toHaveBeenCalledWith('old-active');
			// The memo was dropped: the next write re-reads the store.
			repo.findActiveDataEncryptionKeys.mockResolvedValue([]);
			await expect(service.getActiveKey()).rejects.toThrow(NotFoundError);
		});

		it('keeps the memo when the status update fails', async () => {
			const { service, repo } = makeFreshService();
			repo.findActiveDataEncryptionKeys.mockResolvedValue([makeKey({ id: 'old-active' })]);
			await service.getActiveKey();
			repo.deactivateDataEncryptionKey.mockRejectedValue(new Error('db down'));

			await expect(service.markInactive('old-active')).rejects.toThrow('db down');

			const active = await service.getActiveKey();
			expect(active.id).toBe('old-active');
			expect(repo.findActiveDataEncryptionKeys).toHaveBeenCalledTimes(1);
		});

		it('never deletes the key row', async () => {
			const { service, repo } = makeFreshService();
			repo.findActiveDataEncryptionKeys.mockResolvedValue([makeKey({ id: 'old-active' })]);

			await service.markInactive('old-active');

			expect(repo.deactivateDataEncryptionKey).toHaveBeenCalledWith('old-active');
		});
	});

	describe('repairLegacyDataEncryptionKeys()', () => {
		// A real Cipher, so every legacy value is produced by real encryption and the
		// re-wrap round-trips for real. Only the repository is mocked.
		const realCipher = (encryptionKey: string) =>
			new Cipher(
				mock<InstanceSettings>({ encryptionKey }),
				new CipherAes256GCM(),
				new CipherAes256CBC(),
				mock<EncryptionKeyProxy>(),
			);

		const makeRepairService = (encryptionKey = randomBytes(24).toString('base64')) => {
			const repo = mock<DeploymentKeyRepository>();
			const cipher = realCipher(encryptionKey);
			const logger = mock<Logger>();
			const service = new KeyManagerService(
				repo,
				cipher,
				mock<InstanceSettings>({ encryptionKey }),
				logger,
			);
			return { service, repo, cipher, logger };
		};

		// A real, freshly generated DEK — never a hand-built constant.
		const rawKey = randomBytes(32).toString('hex');

		it.each<[string, (cipher: Cipher) => string]>([
			['raw 2.18.x', () => rawKey],
			['CBC 2.19.x', (cipher) => cipher.encryptWithInstanceKey(rawKey)],
		])('recovers a %s key and re-wraps it as GCM', async (_name, build) => {
			const { service, repo, cipher } = makeRepairService();
			repo.findDataEncryptionKeys.mockResolvedValue([makeKey({ id: 'k', value: build(cipher) })]);

			await service.repairLegacyDataEncryptionKeys();

			const [id, , wrapped] = repo.rewrapLegacyDataEncryptionValue.mock.calls[0];
			expect(id).toBe('k');
			// The re-wrapped value unwraps back to the exact same key: lossless.
			expect(cipher.decryptDEKWithInstanceKey(wrapped)).toBe(rawKey);
		});

		it('recovers a raw instance key stored verbatim and re-wraps it as GCM', async () => {
			const encryptionKey = randomBytes(24).toString('base64');
			const { service, repo, cipher } = makeRepairService(encryptionKey);
			repo.findDataEncryptionKeys.mockResolvedValue([makeKey({ id: 'k', value: encryptionKey })]);

			await service.repairLegacyDataEncryptionKeys();

			const [id, , wrapped] = repo.rewrapLegacyDataEncryptionValue.mock.calls[0];
			expect(id).toBe('k');
			expect(cipher.decryptDEKWithInstanceKey(wrapped)).toBe(encryptionKey);
		});

		it.each<[string, (cipher: Cipher, other: Cipher) => string]>([
			['already GCM-wrapped', (cipher) => cipher.encryptDEKWithInstanceKey(rawKey)],
			[
				'CBC under a different instance key',
				(_cipher, other) => other.encryptWithInstanceKey(rawKey),
			],
			['CBC that unwraps to a non-key', (cipher) => cipher.encryptWithInstanceKey('not-a-hex-key')],
		])('leaves a %s value untouched', async (_name, build) => {
			const { service, repo, cipher } = makeRepairService();
			const other = realCipher(randomBytes(24).toString('base64'));
			repo.findDataEncryptionKeys.mockResolvedValue([
				makeKey({ id: 'k', value: build(cipher, other) }),
			]);

			await service.repairLegacyDataEncryptionKeys();

			expect(repo.rewrapLegacyDataEncryptionValue).not.toHaveBeenCalled();
		});

		it('warns about an unrecognized value it cannot re-wrap', async () => {
			const { service, repo, logger } = makeRepairService();
			repo.findDataEncryptionKeys.mockResolvedValue([
				makeKey({ id: 'k', value: randomBytes(48).toString('base64') }),
			]);

			await service.repairLegacyDataEncryptionKeys();

			expect(repo.rewrapLegacyDataEncryptionValue).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('unrecognized format'), {
				error: expect.any(Error),
			});
		});

		it('does not warn about an already GCM-wrapped value', async () => {
			const { service, repo, cipher, logger } = makeRepairService();
			repo.findDataEncryptionKeys.mockResolvedValue([
				makeKey({ id: 'k', value: cipher.encryptDEKWithInstanceKey(rawKey) }),
			]);

			await service.repairLegacyDataEncryptionKeys();

			expect(repo.rewrapLegacyDataEncryptionValue).not.toHaveBeenCalled();
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('is a no-op when there are no data-encryption keys', async () => {
			const { service, repo } = makeRepairService();
			repo.findDataEncryptionKeys.mockResolvedValue([]);

			await service.repairLegacyDataEncryptionKeys();

			expect(repo.rewrapLegacyDataEncryptionValue).not.toHaveBeenCalled();
		});
	});
});
