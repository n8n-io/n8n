import { mockInstance } from '@n8n/backend-test-utils';
import type { DeploymentKey } from '@n8n/db';
import { Container } from '@n8n/di';

import { EncryptionKeyController } from '@/modules/encryption-key-manager/encryption-key.controller';
import { KeyManagerService } from '@/modules/encryption-key-manager/key-manager.service';

const makeKey = (overrides: Partial<DeploymentKey> = {}): DeploymentKey =>
	({
		id: 'key-1',
		type: 'data_encryption',
		value: 'secret-material',
		algorithm: 'aes-256-gcm',
		status: 'active',
		createdAt: new Date('2026-01-15T00:00:00.000Z'),
		updatedAt: new Date('2026-01-15T00:00:00.000Z'),
		...overrides,
	}) as DeploymentKey;

describe('EncryptionKeyController', () => {
	const keyManagerService = mockInstance(KeyManagerService);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('GET /encryption/keys', () => {
		it('returns all keys when no type filter is provided', async () => {
			keyManagerService.listKeys.mockResolvedValue([
				makeKey({ id: 'k1', algorithm: 'aes-256-cbc', status: 'inactive' }),
				makeKey({ id: 'k2', algorithm: 'aes-256-gcm', status: 'active' }),
			]);

			const result = await Container.get(EncryptionKeyController).list({}, {}, { type: undefined });

			expect(keyManagerService.listKeys).toHaveBeenCalledWith(undefined);
			expect(result).toEqual([
				{
					id: 'k1',
					type: 'data_encryption',
					algorithm: 'aes-256-cbc',
					status: 'inactive',
					createdAt: '2026-01-15T00:00:00.000Z',
					updatedAt: '2026-01-15T00:00:00.000Z',
				},
				{
					id: 'k2',
					type: 'data_encryption',
					algorithm: 'aes-256-gcm',
					status: 'active',
					createdAt: '2026-01-15T00:00:00.000Z',
					updatedAt: '2026-01-15T00:00:00.000Z',
				},
			]);
		});

		it('forwards the type filter to the service', async () => {
			keyManagerService.listKeys.mockResolvedValue([makeKey({ id: 'k1' })]);

			const result = await Container.get(EncryptionKeyController).list(
				{},
				{},
				{ type: 'data_encryption' },
			);

			expect(keyManagerService.listKeys).toHaveBeenCalledWith('data_encryption');
			expect(result).toHaveLength(1);
		});

		it('never includes the raw key value in the response', async () => {
			keyManagerService.listKeys.mockResolvedValue([makeKey({ value: 'very-secret' })]);

			const result = await Container.get(EncryptionKeyController).list({}, {}, { type: undefined });

			expect(JSON.stringify(result)).not.toContain('very-secret');
			expect(result[0]).not.toHaveProperty('value');
		});

		it('returns an empty array when no keys exist', async () => {
			keyManagerService.listKeys.mockResolvedValue([]);

			const result = await Container.get(EncryptionKeyController).list({}, {}, { type: undefined });

			expect(result).toEqual([]);
		});

		it('preserves service ordering and maps nullable algorithm', async () => {
			keyManagerService.listKeys.mockResolvedValue([
				makeKey({ id: 'first', algorithm: null }),
				makeKey({ id: 'second', algorithm: 'aes-256-gcm' }),
			]);

			const result = await Container.get(EncryptionKeyController).list({}, {}, { type: undefined });

			expect(result.map((row) => row.id)).toEqual(['first', 'second']);
			expect(result[0].algorithm).toBeNull();
			expect(result[1].algorithm).toBe('aes-256-gcm');
		});
	});

	describe('POST /encryption/keys', () => {
		it('rotates a new active key and returns the response DTO without value', async () => {
			const newRow = makeKey({ id: 'new-id', algorithm: 'aes-256-gcm', status: 'active' });
			keyManagerService.rotateKey.mockResolvedValue(newRow);

			const result = await Container.get(EncryptionKeyController).create(
				{},
				{},
				{ type: 'data_encryption' },
			);

			expect(keyManagerService.rotateKey).toHaveBeenCalledWith();
			expect(result).toEqual({
				id: 'new-id',
				type: 'data_encryption',
				algorithm: 'aes-256-gcm',
				status: 'active',
				createdAt: '2026-01-15T00:00:00.000Z',
				updatedAt: '2026-01-15T00:00:00.000Z',
			});
			expect(result).not.toHaveProperty('value');
		});
	});
});
