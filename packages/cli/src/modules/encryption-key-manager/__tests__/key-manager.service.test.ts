import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { DeploymentKey } from '@n8n/db';
import { DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher, InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { KeyManagerService } from '@/modules/encryption-key-manager/key-manager.service';

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
			repo.find.mockResolvedValue([key]);

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
			repo.find.mockResolvedValue([]);

			await expect(service.getActiveKey()).rejects.toThrow(NotFoundError);
			// The absence is re-checked, not memoized.
			await expect(service.getActiveKey()).rejects.toThrow(NotFoundError);
			expect(repo.find).toHaveBeenCalledTimes(2);
		});

		it('throws when multiple active keys exist (invariant violation)', async () => {
			const { service, repo } = makeFreshService();
			repo.find.mockResolvedValue([makeKey({ id: 'key-1' }), makeKey({ id: 'key-2' })]);

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
			expect(repository.find).not.toHaveBeenCalled();
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
			repo.findOne.mockResolvedValue(key);

			const result = await service.getKeyById('key-1');

			expect(result).toEqual({
				id: key.id,
				value: key.value,
				algorithm: key.algorithm,
				format: 'prefixed',
			});
			expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'key-1' } });
		});

		it('returns null when key not found', async () => {
			const { service, repo } = makeFreshService();
			repo.findOne.mockResolvedValue(null);

			const result = await service.getKeyById('missing');

			expect(result).toBeNull();
		});

		it('serves repeated lookups from the LRU without another database read', async () => {
			const { service, repo } = makeFreshService();
			repo.findOne.mockResolvedValue(makeKey());

			const first = await service.getKeyById('key-1');
			const second = await service.getKeyById('key-1');

			expect(repo.findOne).toHaveBeenCalledTimes(1);
			expect(second).toBe(first);
		});

		it('does not cache misses, so an unknown id cannot evict real keys', async () => {
			const { service, repo } = makeFreshService();
			repo.findOne.mockResolvedValue(null);

			await service.getKeyById('missing');
			await service.getKeyById('missing');

			expect(repo.findOne).toHaveBeenCalledTimes(2);
		});

		it('caches exactly up to capacity without evicting', async () => {
			const { service, repo } = makeFreshService();
			repo.findOne.mockImplementation(async (opts) => {
				const where = (opts as { where: { id: string } }).where;
				return makeKey({ id: where.id });
			});

			// Fill the LRU to exactly its capacity of 10 — no eviction yet.
			for (let i = 0; i < 10; i++) {
				await service.getKeyById(`key-${i}`);
			}
			for (let i = 0; i < 10; i++) {
				await service.getKeyById(`key-${i}`);
			}
			expect(repo.findOne).toHaveBeenCalledTimes(10);
		});

		it('evicts the LEAST RECENTLY USED entry beyond capacity, not the oldest inserted', async () => {
			const { service, repo } = makeFreshService();
			repo.findOne.mockImplementation(async (opts) => {
				const where = (opts as { where: { id: string } }).where;
				return makeKey({ id: where.id });
			});

			for (let i = 0; i < 10; i++) {
				await service.getKeyById(`key-${i}`);
			}
			// Touch the oldest-inserted entry so key-1 becomes least recently used.
			await service.getKeyById('key-0');
			expect(repo.findOne).toHaveBeenCalledTimes(10);

			// The 11th distinct id evicts key-1 (LRU), not key-0 (refreshed).
			await service.getKeyById('key-10');
			expect(repo.findOne).toHaveBeenCalledTimes(11);

			await service.getKeyById('key-0');
			expect(repo.findOne).toHaveBeenCalledTimes(11);
			await service.getKeyById('key-1');
			expect(repo.findOne).toHaveBeenCalledTimes(12);
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
				repo.find.mockResolvedValue([makeKey()]);

				const first = await service.getActiveKey();
				const second = await service.getActiveKey();
				expect(second).toBe(first);
				expect(repo.find).toHaveBeenCalledTimes(1);

				// Past the memo TTL the database view is re-read — this is also the
				// propagation window for a rotation done on another instance.
				vi.advanceTimersByTime(6000);
				await service.getActiveKey();
				expect(repo.find).toHaveBeenCalledTimes(2);
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe('getLegacyKey()', () => {
		it('returns the stored KeyInfo for the aes-256-cbc key when the store serves it', async () => {
			const { service, repo, cipherMock } = makeFreshService();
			const key = makeKey({ algorithm: 'aes-256-cbc' });
			repo.findOne.mockResolvedValue(key);

			const result = await service.getLegacyKey();

			expect(result).toEqual({
				id: key.id,
				value: key.value,
				algorithm: 'aes-256-cbc',
				format: 'no-prefix',
			});
			expect(repo.findOne).toHaveBeenCalledWith({
				where: { type: 'data_encryption', algorithm: 'aes-256-cbc' },
			});
			expect(cipherMock.encryptDEKWithInstanceKey).not.toHaveBeenCalled();
		});

		it('memoizes the stored legacy key — the row is immutable once seeded', async () => {
			const { service, repo } = makeFreshService();
			repo.findOne.mockResolvedValue(makeKey({ algorithm: 'aes-256-cbc' }));

			const first = await service.getLegacyKey();
			const second = await service.getLegacyKey();

			expect(repo.findOne).toHaveBeenCalledTimes(1);
			expect(second).toBe(first);
		});

		it('falls back to the instance key when the legacy key is not seeded', async () => {
			const { service, repo, cipherMock } = makeFreshService();
			repo.findOne.mockResolvedValue(null);
			cipherMock.encryptDEKWithInstanceKey.mockReturnValue('wrapped-instance-key');

			const result = await service.getLegacyKey();

			expect(result.value).toBe('wrapped-instance-key');
			expect(result.algorithm).toBe('aes-256-cbc');
			expect(cipherMock.encryptDEKWithInstanceKey).toHaveBeenCalledWith('test_key');
		});

		it('falls back to the instance key when the store lookup fails', async () => {
			const { service, repo, cipherMock } = makeFreshService();
			repo.findOne.mockRejectedValue(new Error('connection refused'));
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
			repo.findOne.mockResolvedValue(null);
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
			repository.findOne.mockResolvedValue(
				makeKey({ algorithm: 'aes-256-cbc', status: 'inactive' }),
			);

			await Container.get(KeyManagerService).bootstrapLegacyCbcKey('instance-key');

			expect(repository.findOne).toHaveBeenCalledWith({
				where: { type: 'data_encryption', algorithm: 'aes-256-cbc' },
			});
			expect(repository.seedLegacyCbcKey).not.toHaveBeenCalled();
		});

		it('encrypts the instance key and seeds it when no CBC key exists', async () => {
			repository.findOne.mockResolvedValue(null);
			cipher.encryptDEKWithInstanceKey.mockReturnValue('encrypted-instance-key');

			await Container.get(KeyManagerService).bootstrapLegacyCbcKey('instance-key');

			expect(cipher.encryptDEKWithInstanceKey).toHaveBeenCalledWith('instance-key');
			// The repository seeds inside a DbLock critical section, which keeps
			// concurrent startups from creating duplicate rows.
			expect(repository.seedLegacyCbcKey).toHaveBeenCalledWith('encrypted-instance-key');
			expect(repository.save).not.toHaveBeenCalled();
		});
	});

	describe('bootstrapGcmKey()', () => {
		it('is a no-op when an active GCM key already exists', async () => {
			repository.findOne.mockResolvedValue(makeKey({ algorithm: 'aes-256-gcm', status: 'active' }));

			await Container.get(KeyManagerService).bootstrapGcmKey();

			expect(repository.findOne).toHaveBeenCalledWith({
				where: { type: 'data_encryption', algorithm: 'aes-256-gcm', status: 'active' },
			});
			expect(repository.insertAsActive).not.toHaveBeenCalled();
		});

		it('generates a 64-char hex key and inserts as active when no active GCM key exists', async () => {
			repository.findOne.mockResolvedValue(null);
			cipher.encryptDEKWithInstanceKey.mockReturnValue('encrypted-gcm-key');

			await Container.get(KeyManagerService).bootstrapGcmKey();

			expect(cipher.encryptDEKWithInstanceKey).toHaveBeenCalledTimes(1);
			const [rawKey] = cipher.encryptDEKWithInstanceKey.mock.calls[0];
			expect(typeof rawKey).toBe('string');
			expect(rawKey).toHaveLength(64);
			expect(repository.insertOrIgnore).toHaveBeenCalledWith({
				type: 'data_encryption',
				value: 'encrypted-gcm-key',
				algorithm: 'aes-256-gcm',
				status: 'active',
			});
		});
	});

	describe('addKey()', () => {
		it('encrypts the value and inserts as inactive when setAsActive is not set', async () => {
			const saved = makeKey({ id: 'new-key', status: 'inactive' });
			repository.create.mockReturnValue(saved);
			repository.save.mockResolvedValue(saved);
			cipher.encryptDEKWithInstanceKey.mockReturnValue('encrypted-base64');

			const result = await Container.get(KeyManagerService).addKey('secret', 'aes-256-gcm');

			expect(cipher.encryptDEKWithInstanceKey).toHaveBeenCalledWith('secret');
			expect(repository.insertAsActive).not.toHaveBeenCalled();
			expect(repository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'inactive',
					type: 'data_encryption',
					value: 'encrypted-base64',
				}),
			);
			expect(result).toBe(saved);
		});

		it('encrypts the value and delegates to insertAsActive when setAsActive=true', async () => {
			const saved = makeKey({ id: 'new-key', status: 'active' });
			repository.create.mockReturnValue(saved);
			repository.insertAsActive.mockResolvedValue(saved);
			cipher.encryptDEKWithInstanceKey.mockReturnValue('encrypted-base64');

			const result = await Container.get(KeyManagerService).addKey('secret', 'aes-256-gcm', true);

			expect(cipher.encryptDEKWithInstanceKey).toHaveBeenCalledWith('secret');
			expect(repository.save).not.toHaveBeenCalled();
			expect(repository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'data_encryption',
					value: 'encrypted-base64',
					algorithm: 'aes-256-gcm',
				}),
			);
			expect(repository.insertAsActive).toHaveBeenCalledWith(saved);
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
				repo.create.mockReturnValue(saved);
				repo.insertAsActive.mockResolvedValue(saved);
				cipherMock.encryptDEKWithInstanceKey.mockReturnValue('encrypted-base64');

				await service.addKey('secret', 'aes-256-gcm', true);
				const active = await service.getActiveKey();

				expect(active.id).toBe('new-key');
				// Served from the memo the commit refreshed — no database read.
				expect(repo.find).not.toHaveBeenCalled();
			});

			it('does not update the memo when the insert fails', async () => {
				const { service, repo, cipherMock } = makeFreshService();
				repo.create.mockReturnValue(makeKey({ id: 'new-key', status: 'active' }));
				repo.insertAsActive.mockRejectedValue(new Error('db down'));
				cipherMock.encryptDEKWithInstanceKey.mockReturnValue('encrypted-base64');

				await expect(service.addKey('secret', 'aes-256-gcm', true)).rejects.toThrow('db down');

				// The next write must re-read the store, not trust a failed rotation.
				repo.find.mockResolvedValue([makeKey({ id: 'still-active' })]);
				const active = await service.getActiveKey();
				expect(active.id).toBe('still-active');
			});

			it('does not touch the memo for an inactive key insert', async () => {
				const { service, repo, cipherMock } = makeFreshService();
				const saved = makeKey({ id: 'spare-key', status: 'inactive' });
				repo.create.mockReturnValue(saved);
				repo.save.mockResolvedValue(saved);
				cipherMock.encryptDEKWithInstanceKey.mockReturnValue('encrypted-base64');

				await service.addKey('secret', 'aes-256-gcm');

				repo.find.mockResolvedValue([makeKey({ id: 'the-active-one' })]);
				const active = await service.getActiveKey();
				expect(active.id).toBe('the-active-one');
			});
		});
	});

	describe('rotateKey()', () => {
		it('generates a 64-char hex key and inserts it as active with aes-256-gcm', async () => {
			const saved = makeKey({ id: 'rotated', status: 'active', algorithm: 'aes-256-gcm' });
			repository.create.mockReturnValue(saved);
			repository.insertAsActive.mockResolvedValue(saved);
			cipher.encryptDEKWithInstanceKey.mockReturnValue('encrypted-base64');

			const result = await Container.get(KeyManagerService).rotateKey();

			expect(cipher.encryptDEKWithInstanceKey).toHaveBeenCalledTimes(1);
			const [rawKey] = cipher.encryptDEKWithInstanceKey.mock.calls[0];
			expect(typeof rawKey).toBe('string');
			expect(rawKey.length).toBe(64);

			expect(repository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'data_encryption',
					value: 'encrypted-base64',
					algorithm: 'aes-256-gcm',
				}),
			);
			expect(repository.insertAsActive).toHaveBeenCalledWith(saved);
			expect(result).toBe(saved);
		});

		it('generates a fresh key value on each call', async () => {
			const saved = makeKey();
			repository.create.mockReturnValue(saved);
			repository.insertAsActive.mockResolvedValue(saved);
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

		it('delegates to promoteToActive and invalidates the memo', async () => {
			const { service, repo } = makeFreshService();
			repo.find.mockResolvedValue([makeKey({ id: 'old-active' })]);
			await service.getActiveKey(); // primes the memo
			repo.promoteToActive.mockResolvedValue(undefined);

			await service.setActiveKey('target');

			expect(repo.promoteToActive).toHaveBeenCalledWith('target', 'data_encryption');
			// The memo was dropped: the next write re-reads the store.
			repo.find.mockResolvedValue([makeKey({ id: 'target' })]);
			const active = await service.getActiveKey();
			expect(active.id).toBe('target');
			expect(repo.find).toHaveBeenCalledTimes(2);
		});

		it('keeps the memo when the promotion fails', async () => {
			const { service, repo } = makeFreshService();
			repo.find.mockResolvedValue([makeKey({ id: 'old-active' })]);
			await service.getActiveKey();
			repo.promoteToActive.mockRejectedValue(new Error('not found'));

			await expect(service.setActiveKey('ghost')).rejects.toThrow('not found');

			const active = await service.getActiveKey();
			expect(active.id).toBe('old-active');
			expect(repo.find).toHaveBeenCalledTimes(1);
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
			repo.find.mockResolvedValue([makeKey({ id: 'old-active' })]);
			await service.getActiveKey(); // primes the memo

			await service.markInactive('old-active');

			expect(repo.update).toHaveBeenCalledWith('old-active', { status: 'inactive' });
			// The memo was dropped: the next write re-reads the store.
			repo.find.mockResolvedValue([]);
			await expect(service.getActiveKey()).rejects.toThrow(NotFoundError);
		});

		it('keeps the memo when the status update fails', async () => {
			const { service, repo } = makeFreshService();
			repo.find.mockResolvedValue([makeKey({ id: 'old-active' })]);
			await service.getActiveKey();
			repo.update.mockRejectedValue(new Error('db down'));

			await expect(service.markInactive('old-active')).rejects.toThrow('db down');

			const active = await service.getActiveKey();
			expect(active.id).toBe('old-active');
			expect(repo.find).toHaveBeenCalledTimes(1);
		});
	});
});
