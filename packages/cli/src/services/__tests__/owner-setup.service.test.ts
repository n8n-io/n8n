import { Logger } from '@n8n/backend-common';
import type { EventService, OwnershipService } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { GLOBAL_OWNER_ROLE, type SettingsRepository, User, UserRepository } from '@n8n/db';
import { BadRequestError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { OwnerSetupService } from '@/services/owner-setup.service';
import { PasswordUtility } from '@/services/password.utility';

describe('OwnerSetupService', () => {
	const ownershipService = mock<OwnershipService>();
	const eventService = mock<EventService>();
	const logger = mockInstance(Logger);
	const passwordUtility = mockInstance(PasswordUtility);
	const userRepository = mockInstance(UserRepository);
	const settingsRepository = mock<SettingsRepository>();

	const ownerSetupService = new OwnerSetupService(
		ownershipService,
		eventService,
		logger,
		passwordUtility,
		userRepository,
		settingsRepository,
	);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should throw a BadRequestError if the instance owner is already setup', async () => {
		ownershipService.hasInstanceOwner.mockResolvedValueOnce(true);

		const execution = ownerSetupService.setupOwner(mock());
		await expect(execution).rejects.toThrow(BadRequestError);
		await expect(execution).rejects.toThrow('Instance owner already setup');

		expect(userRepository.save).not.toHaveBeenCalled();
		expect(eventService.emit).not.toHaveBeenCalled();
		expect(logger.debug).toHaveBeenCalledWith(
			'Request to claim instance ownership failed because instance owner already exists',
		);
	});

	it('should throw a BadRequestError if the shell user is not found', async () => {
		ownershipService.hasInstanceOwner.mockResolvedValueOnce(false);
		userRepository.findOne.mockResolvedValueOnce(null);

		const execution = ownerSetupService.setupOwner(mock());
		await expect(execution).rejects.toThrow(BadRequestError);
		await expect(execution).rejects.toThrow('Instance owner shell user not found');

		expect(userRepository.save).not.toHaveBeenCalled();
	});

	it('should setup the instance owner successfully', async () => {
		const user = mock<User>({
			id: 'userId',
			role: GLOBAL_OWNER_ROLE,
			authIdentities: [],
		});
		const payload = {
			email: 'valid@email.com',
			password: 'NewPassword123',
			firstName: 'Jane',
			lastName: 'Doe',
		};
		const expected = { ...user, ...payload, id: 'newUserId' };

		ownershipService.hasInstanceOwner.mockResolvedValueOnce(false);
		userRepository.findOne.mockResolvedValueOnce(user);
		userRepository.save.mockResolvedValueOnce(expected);

		const actual = await ownerSetupService.setupOwner(payload);

		expect(userRepository.save).toHaveBeenCalledWith(user, { transaction: false });
		expect(eventService.emit).toHaveBeenCalledWith('instance-owner-setup', {
			userId: 'newUserId',
		});
		expect(settingsRepository.update).toHaveBeenCalledWith(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: JSON.stringify(true) },
		);
		expect(actual.id).toEqual('newUserId');
	});

	it('should normalize email to lowercase', async () => {
		const user = mock<User>({ id: 'userId', role: GLOBAL_OWNER_ROLE, authIdentities: [] });

		ownershipService.hasInstanceOwner.mockResolvedValueOnce(false);
		userRepository.findOne.mockResolvedValueOnce(user);
		userRepository.save.mockResolvedValueOnce(user);

		await ownerSetupService.setupOwner({
			email: 'Admin@Example.COM',
			password: 'NewPassword123',
			firstName: 'Jane',
			lastName: 'Doe',
		});

		expect(user.email).toBe('admin@example.com');
	});

	it('should skip the owner check when overwriteExisting is true', async () => {
		const user = mock<User>({ id: 'userId', role: GLOBAL_OWNER_ROLE, authIdentities: [] });
		userRepository.findOne.mockResolvedValueOnce(user);
		userRepository.save.mockResolvedValueOnce(user);

		await ownerSetupService.setupOwner(
			{ email: 'a@b.com', password: 'hash', firstName: 'A', lastName: 'B' },
			{ overwriteExisting: true },
		);

		expect(ownershipService.hasInstanceOwner).not.toHaveBeenCalled();
	});

	it('should use a pre-hashed password when passwordIsHashed is true', async () => {
		const user = mock<User>({ id: 'userId', role: GLOBAL_OWNER_ROLE, authIdentities: [] });
		const preHashedPassword = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';
		userRepository.findOne.mockResolvedValueOnce(user);
		userRepository.save.mockResolvedValueOnce(user);

		await ownerSetupService.setupOwner(
			{ email: 'a@b.com', password: preHashedPassword, firstName: 'A', lastName: 'B' },
			{ overwriteExisting: true, passwordIsHashed: true },
		);

		expect(user.password).toBe(preHashedPassword);
		expect(passwordUtility.hash).not.toHaveBeenCalled();
	});
});
