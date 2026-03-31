import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import { GLOBAL_OWNER_ROLE, type SettingsRepository, type UserRepository } from '@n8n/db';

import { OwnerInstanceSettingsLoader } from '../loaders/owner.instance-settings-loader';

describe('OwnerInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const settingsRepository = mock<SettingsRepository>();
	const userRepository = mock<UserRepository>();

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

		return new OwnerInstanceSettingsLoader(config, settingsRepository, userRepository, logger);
	};

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnThis();
	});

	it('should skip when ownerOverride is false', async () => {
		const loader = createLoader({ ownerOverride: false });

		const result = await loader.run();

		expect(result).toBe('skipped');
		expect(userRepository.findOneOrFail).not.toHaveBeenCalled();
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

	it('should update the instance owner when all values are provided', async () => {
		const shellUser = {
			id: 'user-id',
			email: null,
			firstName: null,
			lastName: null,
			password: null,
			lastActiveAt: null,
			role: GLOBAL_OWNER_ROLE,
		};

		userRepository.findOneOrFail.mockResolvedValue(shellUser as never);
		userRepository.save.mockResolvedValue(shellUser as never);

		const loader = createLoader({
			ownerOverride: true,
			ownerEmail: 'admin@example.com',
			ownerFirstName: 'Jane',
			ownerLastName: 'Doe',
			ownerPasswordHash: validBcryptHash,
		});

		const result = await loader.run();

		expect(result).toBe('created');
		expect(userRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				email: 'admin@example.com',
				firstName: 'Jane',
				lastName: 'Doe',
				password: validBcryptHash,
			}),
			{ transaction: false },
		);
		expect(settingsRepository.update).toHaveBeenCalledWith(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: JSON.stringify(true) },
		);
	});

	it('should update the owner on every startup when override is true', async () => {
		const existingOwner = {
			id: 'user-id',
			email: 'old@example.com',
			firstName: 'Old',
			lastName: 'Name',
			password: '$2b$10$previoushashvaluehere000000000000000000000000000000000',
			lastActiveAt: new Date('2024-01-01'),
			role: GLOBAL_OWNER_ROLE,
		};

		userRepository.findOneOrFail.mockResolvedValue(existingOwner as never);
		userRepository.save.mockResolvedValue(existingOwner as never);

		const loader = createLoader({
			ownerOverride: true,
			ownerEmail: 'new@example.com',
			ownerFirstName: 'New',
			ownerLastName: 'Owner',
			ownerPasswordHash: validBcryptHash,
		});

		const result = await loader.run();

		expect(result).toBe('created');
		expect(userRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				email: 'new@example.com',
				firstName: 'New',
				lastName: 'Owner',
				password: validBcryptHash,
			}),
			{ transaction: false },
		);
	});
});
