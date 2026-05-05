import { mockInstance } from '@n8n/backend-test-utils';
import type { DeploymentKey } from '@n8n/db';
import { DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';

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

describe('KeyManagerService', () => {
	const repository = mockInstance(DeploymentKeyRepository);
	const cipher = mockInstance(Cipher);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getActiveKey()', () => {
		it('returns KeyInfo when one active key exists', async () => {
			const key = makeKey();
			repository.find.mockResolvedValue([key]);

			const result = await Container.get(KeyManagerService).getActiveKey();

			expect(result).toEqual({ id: key.id, value: key.value, algorithm: key.algorithm });
		});

		it('throws NotFoundError when no active key exists', async () => {
			repository.find.mockResolvedValue([]);

			await expect(Container.get(KeyManagerService).getActiveKey()).rejects.toThrow(NotFoundError);
		});

		it('throws when multiple active keys exist (invariant violation)', async () => {
			repository.find.mockResolvedValue([makeKey({ id: 'key-1' }), makeKey({ id: 'key-2' })]);

			await expect(Container.get(KeyManagerService).getActiveKey()).rejects.toThrow(
				'Encryption key invariant violated: multiple active keys found',
			);
		});
	});

	describe('getKeyById()', () => {
		it('returns KeyInfo when key exists', async () => {
			const key = makeKey();
			repository.findOne.mockResolvedValue(key);

			const result = await Container.get(KeyManagerService).getKeyById('key-1');

			expect(result).toEqual({ id: key.id, value: key.value, algorithm: key.algorithm });
			expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'key-1' } });
		});

		it('returns null when key not found', async () => {
			repository.findOne.mockResolvedValue(null);

			const result = await Container.get(KeyManagerService).getKeyById('missing');

			expect(result).toBeNull();
		});
	});

	describe('getLegacyKey()', () => {
		it('returns KeyInfo for the aes-256-cbc key', async () => {
			const key = makeKey({ algorithm: 'aes-256-cbc' });
			repository.findOne.mockResolvedValue(key);

			const result = await Container.get(KeyManagerService).getLegacyKey();

			expect(result).toEqual({ id: key.id, value: key.value, algorithm: 'aes-256-cbc' });
			expect(repository.findOne).toHaveBeenCalledWith({
				where: { type: 'data_encryption', algorithm: 'aes-256-cbc' },
			});
		});

		it('throws NotFoundError when no CBC key exists', async () => {
			repository.findOne.mockResolvedValue(null);

			await expect(Container.get(KeyManagerService).getLegacyKey()).rejects.toThrow(NotFoundError);
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
			expect(repository.save).not.toHaveBeenCalled();
		});

		it('encrypts the instance key and inserts as inactive when no CBC key exists', async () => {
			repository.findOne.mockResolvedValue(null);
			const entity = makeKey({ algorithm: 'aes-256-cbc', status: 'inactive' });
			repository.create.mockReturnValue(entity);
			repository.save.mockResolvedValue(entity);
			cipher.encryptDEKWithInstanceKey.mockReturnValue('encrypted-instance-key');

			await Container.get(KeyManagerService).bootstrapLegacyCbcKey('instance-key');

			expect(cipher.encryptDEKWithInstanceKey).toHaveBeenCalledWith('instance-key');
			expect(repository.create).toHaveBeenCalledWith({
				type: 'data_encryption',
				value: 'encrypted-instance-key',
				algorithm: 'aes-256-cbc',
				status: 'inactive',
			});
			expect(repository.save).toHaveBeenCalledWith(entity);
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
		it('returns all keys when no type filter is provided', async () => {
			const rows = [makeKey({ id: 'k1' }), makeKey({ id: 'k2' })];
			repository.find.mockResolvedValue(rows);

			const result = await Container.get(KeyManagerService).listKeys();

			expect(repository.find).toHaveBeenCalledWith();
			expect(repository.findAllByType).not.toHaveBeenCalled();
			expect(result).toBe(rows);
		});

		it('filters by type when provided', async () => {
			const rows = [makeKey({ id: 'k1' })];
			repository.findAllByType.mockResolvedValue(rows);

			const result = await Container.get(KeyManagerService).listKeys('data_encryption');

			expect(repository.findAllByType).toHaveBeenCalledWith('data_encryption');
			expect(repository.find).not.toHaveBeenCalled();
			expect(result).toBe(rows);
		});
	});

	describe('setActiveKey()', () => {
		it('delegates to promoteToActive', async () => {
			repository.promoteToActive.mockResolvedValue(undefined);

			await Container.get(KeyManagerService).setActiveKey('target');

			expect(repository.promoteToActive).toHaveBeenCalledWith('target', 'data_encryption');
		});
	});

	describe('markInactive()', () => {
		it('sets status to inactive', async () => {
			await Container.get(KeyManagerService).markInactive('key-1');

			expect(repository.update).toHaveBeenCalledWith('key-1', { status: 'inactive' });
		});
	});
});
