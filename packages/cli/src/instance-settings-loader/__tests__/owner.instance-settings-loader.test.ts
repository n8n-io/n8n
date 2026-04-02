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
			ownerOverride: false,
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

	it('should skip when ownerOverride is false', async () => {
		const loader = createLoader({ ownerOverride: false });

		const result = await loader.run();

		expect(result).toBe('skipped');
		expect(ownershipService.setupOwner).not.toHaveBeenCalled();
	});

	it('should skip when ownerEmail is empty', async () => {
		const loader = createLoader({ ownerOverride: true, ownerEmail: '' });

		const result = await loader.run();

		expect(result).toBe('skipped');
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('INSTANCE_OWNER_EMAIL is required'),
		);
	});

	it('should skip when ownerPasswordHash is empty', async () => {
		const loader = createLoader({
			ownerOverride: true,
			ownerEmail: 'admin@example.com',
			ownerPasswordHash: '',
		});

		const result = await loader.run();

		expect(result).toBe('skipped');
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('INSTANCE_OWNER_PASSWORD_HASH is required'),
		);
	});

	it('should skip when ownerPasswordHash is not a valid bcrypt hash', async () => {
		const loader = createLoader({
			ownerOverride: true,
			ownerEmail: 'admin@example.com',
			ownerPasswordHash: 'not-a-bcrypt-hash',
		});

		const result = await loader.run();

		expect(result).toBe('skipped');
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not a valid bcrypt hash'));
	});

	it('should delegate to ownershipService.setupOwner with override and preHashed options', async () => {
		const loader = createLoader({
			ownerOverride: true,
			ownerEmail: 'admin@example.com',
			ownerFirstName: 'Jane',
			ownerLastName: 'Doe',
			ownerPasswordHash: validBcryptHash,
		});

		const result = await loader.run();

		expect(result).toBe('created');
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

	it('should delegate on every startup when override is true', async () => {
		const loader = createLoader({
			ownerOverride: true,
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
