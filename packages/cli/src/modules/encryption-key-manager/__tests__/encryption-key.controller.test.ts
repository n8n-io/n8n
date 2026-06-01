import { mockInstance } from '@n8n/backend-test-utils';
import type { DeploymentKey } from '@n8n/db';
import { Container } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
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

const baseQuery = { skip: 0, take: 10 } as never;

describe('EncryptionKeyController', () => {
	const keyManagerService = mockInstance(KeyManagerService);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('GET /encryption/keys', () => {
		it('returns the { count, items } envelope built from the service result', async () => {
			keyManagerService.listKeys.mockResolvedValue({
				items: [
					makeKey({ id: 'k1', algorithm: 'aes-256-cbc', status: 'inactive' }),
					makeKey({ id: 'k2', algorithm: 'aes-256-gcm', status: 'active' }),
				],
				count: 2,
			});

			const result = await Container.get(EncryptionKeyController).list({}, {}, baseQuery);

			expect(keyManagerService.listKeys).toHaveBeenCalledWith(baseQuery);
			expect(result).toEqual({
				count: 2,
				items: [
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
				],
			});
		});

		it('forwards the full query (type, sortBy, dates, pagination) to the service', async () => {
			keyManagerService.listKeys.mockResolvedValue({ items: [makeKey({ id: 'k1' })], count: 1 });

			const query = {
				skip: 10,
				take: 25,
				type: 'data_encryption',
				sortBy: 'updatedAt:desc',
				activatedFrom: '2026-04-01T00:00:00.000Z',
				activatedTo: '2026-04-30T23:59:59.999Z',
			} as never;

			const result = await Container.get(EncryptionKeyController).list({}, {}, query);

			expect(keyManagerService.listKeys).toHaveBeenCalledWith(query);
			expect(result.count).toBe(1);
		});

		it('never includes the raw key value in the response', async () => {
			keyManagerService.listKeys.mockResolvedValue({
				items: [makeKey({ value: 'very-secret' })],
				count: 1,
			});

			const result = await Container.get(EncryptionKeyController).list({}, {}, baseQuery);

			expect(JSON.stringify(result)).not.toContain('very-secret');
			expect(result.items[0]).not.toHaveProperty('value');
		});

		it('returns an empty envelope when no keys exist', async () => {
			keyManagerService.listKeys.mockResolvedValue({ items: [], count: 0 });

			const result = await Container.get(EncryptionKeyController).list({}, {}, baseQuery);

			expect(result).toEqual({ count: 0, items: [] });
		});

		it('preserves service ordering and maps nullable algorithm', async () => {
			keyManagerService.listKeys.mockResolvedValue({
				items: [
					makeKey({ id: 'first', algorithm: null }),
					makeKey({ id: 'second', algorithm: 'aes-256-gcm' }),
				],
				count: 2,
			});

			const result = await Container.get(EncryptionKeyController).list({}, {}, baseQuery);

			expect(result.items.map((row) => row.id)).toEqual(['first', 'second']);
			expect(result.items[0].algorithm).toBeNull();
			expect(result.items[1].algorithm).toBe('aes-256-gcm');
		});

		it('throws BadRequestError when activatedFrom is after activatedTo', async () => {
			const query = {
				skip: 0,
				take: 10,
				activatedFrom: '2026-04-30T00:00:00.000Z',
				activatedTo: '2026-04-01T00:00:00.000Z',
			} as never;

			await expect(Container.get(EncryptionKeyController).list({}, {}, query)).rejects.toThrow(
				BadRequestError,
			);
			expect(keyManagerService.listKeys).not.toHaveBeenCalled();
		});

		it('accepts equal activatedFrom and activatedTo', async () => {
			keyManagerService.listKeys.mockResolvedValue({ items: [], count: 0 });

			const query = {
				skip: 0,
				take: 10,
				activatedFrom: '2026-04-15T00:00:00.000Z',
				activatedTo: '2026-04-15T00:00:00.000Z',
			} as never;

			const result = await Container.get(EncryptionKeyController).list({}, {}, query);

			expect(result).toEqual({ count: 0, items: [] });
			expect(keyManagerService.listKeys).toHaveBeenCalledWith(query);
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
