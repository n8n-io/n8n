import { mockInstance } from '@n8n/backend-test-utils';
import type { DeploymentKey } from '@n8n/db';
import { DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { KeyManagerService } from '@/modules/encryption-key-manager/key-manager.service';

const makeKey = (overrides: Partial<DeploymentKey> = {}): DeploymentKey =>
	({
		id: 'key-1',
		type: 'encryption',
		value: 'secret',
		algorithm: 'aes-256-gcm',
		status: 'active',
		deprecatedAt: null,
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

		it('throws NotFoundError when active key has null algorithm', async () => {
			repository.find.mockResolvedValue([makeKey({ algorithm: null })]);

			await expect(Container.get(KeyManagerService).getActiveKey()).rejects.toThrow(NotFoundError);
		});
	});

	describe('getKeyById()', () => {
		it('returns KeyInfo when key exists with algorithm', async () => {
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

		it('returns null when key has null algorithm', async () => {
			repository.findOne.mockResolvedValue(makeKey({ algorithm: null }));

			const result = await Container.get(KeyManagerService).getKeyById('key-1');

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
				where: { type: 'encryption', algorithm: 'aes-256-cbc' },
			});
		});

		it('throws NotFoundError when no CBC key exists', async () => {
			repository.findOne.mockResolvedValue(null);

			await expect(Container.get(KeyManagerService).getLegacyKey()).rejects.toThrow(NotFoundError);
		});
	});

	describe('addKey()', () => {
		it('inserts as inactive when setAsPrimary is not set', async () => {
			const saved = makeKey({ id: 'new-key', status: 'inactive' });
			repository.create.mockReturnValue(saved);
			repository.save.mockResolvedValue(saved);

			const result = await Container.get(KeyManagerService).addKey('secret', 'aes-256-gcm');

			expect(repository.findActiveByType).not.toHaveBeenCalled();
			expect(repository.create).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'inactive', type: 'encryption' }),
			);
			expect(result).toEqual({ id: 'new-key' });
		});

		it('inserts as active without demoting when setAsPrimary=true and no current active', async () => {
			repository.findActiveByType.mockResolvedValue(null);
			const saved = makeKey({ id: 'new-key', status: 'active' });
			repository.create.mockReturnValue(saved);
			repository.save.mockResolvedValue(saved);

			const result = await Container.get(KeyManagerService).addKey('secret', 'aes-256-gcm', true);

			expect(repository.update).not.toHaveBeenCalled();
			expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
			expect(result).toEqual({ id: 'new-key' });
		});

		it('demotes existing active key before inserting new active key', async () => {
			const existing = makeKey({ id: 'old-key' });
			repository.findActiveByType.mockResolvedValue(existing);
			const saved = makeKey({ id: 'new-key', status: 'active' });
			repository.create.mockReturnValue(saved);
			repository.save.mockResolvedValue(saved);

			await Container.get(KeyManagerService).addKey('new-secret', 'aes-256-gcm', true);

			expect(repository.update).toHaveBeenCalledWith(
				'old-key',
				expect.objectContaining({ status: 'deprecating', deprecatedAt: expect.any(Date) }),
			);
			expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
		});
	});

	describe('setPrimaryKey()', () => {
		it('demotes existing active key and promotes target', async () => {
			const current = makeKey({ id: 'current' });
			repository.findActiveByType.mockResolvedValue(current);

			await Container.get(KeyManagerService).setPrimaryKey('target');

			expect(repository.update).toHaveBeenCalledWith(
				'current',
				expect.objectContaining({ status: 'deprecating', deprecatedAt: expect.any(Date) }),
			);
			expect(repository.update).toHaveBeenCalledWith('target', { status: 'active' });
		});

		it('promotes target without demoting when no current active key', async () => {
			repository.findActiveByType.mockResolvedValue(null);

			await Container.get(KeyManagerService).setPrimaryKey('target');

			expect(repository.update).toHaveBeenCalledTimes(1);
			expect(repository.update).toHaveBeenCalledWith('target', { status: 'active' });
		});

		it('does not demote itself when target is already the active key', async () => {
			const current = makeKey({ id: 'target' });
			repository.findActiveByType.mockResolvedValue(current);

			await Container.get(KeyManagerService).setPrimaryKey('target');

			expect(repository.update).toHaveBeenCalledTimes(1);
			expect(repository.update).toHaveBeenCalledWith('target', { status: 'active' });
		});
	});

	describe('markDeprecating()', () => {
		it('sets status to deprecating and records deprecatedAt', async () => {
			await Container.get(KeyManagerService).markDeprecating('key-1');

			expect(repository.update).toHaveBeenCalledWith(
				'key-1',
				expect.objectContaining({ status: 'deprecating', deprecatedAt: expect.any(Date) }),
			);
		});
	});

	describe('markInactive()', () => {
		it('sets status to inactive', async () => {
			await Container.get(KeyManagerService).markInactive('key-1');

			expect(repository.update).toHaveBeenCalledWith('key-1', { status: 'inactive' });
		});
	});

	describe('removeKey()', () => {
		it('deletes the key row', async () => {
			await Container.get(KeyManagerService).removeKey('key-1');

			expect(repository.delete).toHaveBeenCalledWith('key-1');
		});
	});
});
