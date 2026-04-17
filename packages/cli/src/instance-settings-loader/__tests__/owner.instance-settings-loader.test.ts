import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';

import type { OwnershipService } from '@/services/ownership.service';

import { OwnerInstanceSettingsLoader } from '../loaders/owner.instance-settings-loader';

describe('OwnerInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const ownershipService = mock<OwnershipService>();

	const validBcryptHash = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';

	const createLoader = (configOverrides: Partial<InstanceSettingsLoaderConfig> = {}) => {
		const config = {
			ownerManagedByEnv: false,
			ownerEmail: '',
			ownerFirstName: '',
			ownerLastName: '',
			ownerPasswordHash: '',
			...configOverrides,
		} as InstanceSettingsLoaderConfig;

		return new OwnerInstanceSettingsLoader(config, ownershipService, logger);
	};

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnThis();
	});

	describe('when N8N_INSTANCE_OWNER_MANAGED_BY_ENV is false', () => {
		it('should skip when no env vars are set', async () => {
			const loader = createLoader();

			const result = await loader.run();

			expect(result).toBe('skipped');
			expect(ownershipService.setupOwner).not.toHaveBeenCalled();
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('should skip when ownerEmail is set', async () => {
			const loader = createLoader({ ownerEmail: 'admin@example.com' });

			const result = await loader.run();

			expect(result).toBe('skipped');
			expect(ownershipService.setupOwner).not.toHaveBeenCalled();
		});

		it('should skip when ownerPasswordHash is set', async () => {
			const loader = createLoader({ ownerPasswordHash: validBcryptHash });

			const result = await loader.run();

			expect(result).toBe('skipped');
			expect(ownershipService.setupOwner).not.toHaveBeenCalled();
		});

		it('should skip when both email and password are set', async () => {
			const loader = createLoader({
				ownerEmail: 'admin@example.com',
				ownerPasswordHash: validBcryptHash,
			});

			const result = await loader.run();

			expect(result).toBe('skipped');
			expect(ownershipService.setupOwner).not.toHaveBeenCalled();
		});
	});

	describe('when N8N_INSTANCE_OWNER_MANAGED_BY_ENV is true', () => {
		it('should throw when ownerEmail is empty', async () => {
			const loader = createLoader({
				ownerManagedByEnv: true,
				ownerPasswordHash: validBcryptHash,
			});

			await expect(loader.run()).rejects.toThrow('N8N_INSTANCE_OWNER_EMAIL is required');
		});

		it('should throw when ownerPasswordHash is empty', async () => {
			const loader = createLoader({
				ownerManagedByEnv: true,
				ownerEmail: 'admin@example.com',
			});

			await expect(loader.run()).rejects.toThrow('N8N_INSTANCE_OWNER_PASSWORD_HASH is required');
		});

		it('should throw when ownerPasswordHash is not a valid bcrypt hash', async () => {
			const loader = createLoader({
				ownerManagedByEnv: true,
				ownerEmail: 'admin@example.com',
				ownerPasswordHash: 'not-a-bcrypt-hash',
			});

			await expect(loader.run()).rejects.toThrow('not a valid bcrypt hash');
		});

		it('should setup owner with overwriteExisting: true', async () => {
			const loader = createLoader({
				ownerManagedByEnv: true,
				ownerEmail: 'admin@example.com',
				ownerFirstName: 'Jane',
				ownerLastName: 'Doe',
				ownerPasswordHash: validBcryptHash,
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(logger.info).toHaveBeenCalledWith(
				expect.stringContaining('N8N_INSTANCE_OWNER_MANAGED_BY_ENV is enabled'),
			);
			expect(ownershipService.setupOwner).toHaveBeenCalledWith(
				{
					email: 'admin@example.com',
					firstName: 'Jane',
					lastName: 'Doe',
					password: validBcryptHash,
				},
				{ overwriteExisting: true, passwordIsHashed: true },
			);
		});

		it('should overwrite existing owner', async () => {
			ownershipService.hasInstanceOwner.mockResolvedValue(true);

			const loader = createLoader({
				ownerManagedByEnv: true,
				ownerEmail: 'new@example.com',
				ownerFirstName: 'New',
				ownerLastName: 'Owner',
				ownerPasswordHash: validBcryptHash,
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(ownershipService.setupOwner).toHaveBeenCalledWith(
				{
					email: 'new@example.com',
					firstName: 'New',
					lastName: 'Owner',
					password: validBcryptHash,
				},
				{ overwriteExisting: true, passwordIsHashed: true },
			);
		});
	});
});
