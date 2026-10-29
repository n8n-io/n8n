import type {
	AuthenticatedRequest,
	SettingsRepository,
	User,
	CredentialsRepository,
	WorkflowRepository,
	Person,
	PersonRepository,
} from '@n8n/db';
import type { Repository } from '@n8n/typeorm';
import { IsNull, Not } from '@n8n/typeorm';
import RudderStack from '@rudderstack/rudder-sdk-node';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import type { Invitation } from '@/interfaces';
import { HooksService } from '@/services/hooks.service';
import type { UserService } from '@/services/user.service';

vi.mock('@rudderstack/rudder-sdk-node');

describe('HooksService', () => {
	const mockedUser = mock<User>();
	const userService = mock<UserService>();
	const authService = mock<AuthService>();
	const personRepository = mock<PersonRepository>();
	const personCollection = mock<Repository<Person>>();
	personRepository.forCloudHooks.mockReturnValue(personCollection);
	const settingsRepository = mock<SettingsRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const credentialsRepository = mock<CredentialsRepository>();

	const authMiddleware = vi.fn();

	authService.createAuthMiddleware.mockReturnValue(authMiddleware);

	const hooksService = new HooksService(
		userService,
		authService,
		personRepository,
		settingsRepository,
		workflowRepository,
		credentialsRepository,
	);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('hooksService.inviteUsers should call userService.inviteUsers', async () => {
		// ARRANGE
		const usersToInvite: Invitation[] = [{ email: 'test@n8n.io', role: 'global:member' }];

		// ACT
		await hooksService.inviteUsers(mockedUser, usersToInvite);

		// ASSERT
		expect(userService.inviteUsers).toHaveBeenCalledWith(mockedUser, usersToInvite);
	});

	it('hooksService.issueCookie should call authService.issueCookie', async () => {
		// ARRANGE
		const res = mock<Response>();
		mockedUser.mfaEnabled = false; // Mock mfaEnabled property

		// ACT
		hooksService.issueCookie(res, mockedUser);

		// ASSERT
		expect(authService.issueCookie).toHaveBeenCalledWith(res, mockedUser, false);
	});

	it('hooksService.findOneUser should search people only', async () => {
		// ARRANGE
		const filter = { where: { id: '1' } };

		// ACT
		await hooksService.findOneUser(filter);

		// ASSERT
		expect(personCollection.findOne).toHaveBeenCalledWith(filter);
	});

	it('hooksService.saveUser should save through the people collection', async () => {
		// ACT
		await hooksService.saveUser(mockedUser);

		// ASSERT

		expect(personCollection.save).toHaveBeenCalledWith(mockedUser);
	});

	it('hooksService.updateSettings should call settingRepository.update', async () => {
		// ARRANGE
		const filter = { key: 'test' };
		const set = { value: 'true' };

		// ACT
		await hooksService.updateSettings(filter, set);

		// ASSERT
		expect(settingsRepository.update).toHaveBeenCalledWith(filter, set);
	});

	it('hooksService.workflowsCount should call workflowRepository.count', async () => {
		// ARRANGE
		const filter = { where: { activeVersionId: Not(IsNull()) } };

		// ACT
		await hooksService.workflowsCount(filter);

		// ASSERT
		expect(workflowRepository.count).toHaveBeenCalledWith(filter);
	});

	it('hooksService.credentialsCount should call credentialRepository.count', async () => {
		// ARRANGE
		const filter = { where: {} };

		// ACT
		await hooksService.credentialsCount(filter);

		// ASSERT
		expect(credentialsRepository.count).toHaveBeenCalledWith(filter);
	});

	it('hooksService.settingsCount should call settingsRepository.count', async () => {
		// ARRANGE
		const filter = { where: { key: 'test' } };

		// ACT
		await hooksService.settingsCount(filter);

		// ASSERT
		expect(settingsRepository.count).toHaveBeenCalledWith(filter);
	});

	it('hooksService.authMiddleware should call authService.authMiddleware', async () => {
		// ARRANGE
		const res = mock<Response>();

		const req = mock<AuthenticatedRequest>();

		const next = vi.fn();

		// ACT
		await hooksService.authMiddleware(req, res, next);

		// ASSERT
		expect(authMiddleware).toHaveBeenCalledWith(req, res, next);
	});

	it('hooksService.dbCollections should return valid repositories', async () => {
		// ACT
		const collections = hooksService.dbCollections();

		// ASSERT
		expect(collections.User).toBe(personCollection);
		expect(collections).toHaveProperty('Settings');
		expect(collections).toHaveProperty('Credentials');
		expect(collections).toHaveProperty('Workflow');
	});

	it('hooksService.getRudderStackClient', async () => {
		// ACT
		const key = 'TEST';
		const opts = { dataPlaneUrl: 'test.com' };
		const client = hooksService.getRudderStackClient(key, opts);

		expect(client instanceof RudderStack).toBeTruthy();
		expect(RudderStack).toHaveBeenCalledWith(key, opts);
	});
});
