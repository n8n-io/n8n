import { mockInstance } from '@n8n/backend-test-utils';
import type { DeploymentKey } from '@n8n/db';
import { DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';

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

	describe('addKey()', () => {
		it('inserts as inactive when setAsActive is not set', async () => {
			const saved = makeKey({ id: 'new-key', status: 'inactive' });
			repository.create.mockReturnValue(saved);
			repository.save.mockResolvedValue(saved);

			const result = await Container.get(KeyManagerService).addKey('secret', 'aes-256-gcm');

			expect(repository.insertAsActive).not.toHaveBeenCalled();
			expect(repository.create).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'inactive', type: 'data_encryption' }),
			);
			expect(result).toEqual({ id: 'new-key' });
		});

		it('delegates to insertAsActive when setAsActive=true', async () => {
			const saved = makeKey({ id: 'new-key', status: 'active' });
			repository.create.mockReturnValue(saved);
			repository.insertAsActive.mockResolvedValue(saved);

			const result = await Container.get(KeyManagerService).addKey('secret', 'aes-256-gcm', true);

			expect(repository.save).not.toHaveBeenCalled();
			expect(repository.insertAsActive).toHaveBeenCalledWith(saved);
			expect(result).toEqual({ id: 'new-key' });
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
