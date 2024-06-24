import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import type { AuthUser } from '@db/entities/AuthUser';
import type { CredentialsRepository } from '@db/repositories/credentials.repository';
import type { SettingsRepository } from '@db/repositories/settings.repository';
import type { UserRepository } from '@db/repositories/user.repository';
import type { WorkflowRepository } from '@db/repositories/workflow.repository';
import type { AuthService } from '@/auth/auth.service';
import type { UserService } from '@/services/user.service';
import { HooksService } from '@/services/hooks.service';
import type { Invitation } from '@/Interfaces';
import type { AuthenticatedRequest } from '@/requests';
import type { AuthUserRepository } from '@/databases/repositories/authUser.repository';
import RudderStack from '@rudderstack/rudder-sdk-node';

jest.mock('@rudderstack/rudder-sdk-node');

describe('HooksService', () => {
	const mockedUser = mock<AuthUser>();
	const userService = mock<UserService>();
	const authService = mock<AuthService>();
	const userRepository = mock<UserRepository>();
	const settingsRepository = mock<SettingsRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const credentialsRepository = mock<CredentialsRepository>();
	const authUserRepository = mock<AuthUserRepository>();
	const hooksService = new HooksService(
		userService,
		authService,
		userRepository,
		settingsRepository,
		workflowRepository,
		credentialsRepository,
		authUserRepository,
	);

	beforeEach(() => {
		jest.clearAllMocks();
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

		// ACT
		hooksService.issueCookie(res, mockedUser);

		// ASSERT
		expect(authService.issueCookie).toHaveBeenCalledWith(res, mockedUser);
	});

	it('hooksService.findOneUser should call authUserRepository.findOne', async () => {
		// ARRANGE
		const filter = { where: { id: '1' } };

		// ACT
		await hooksService.findOneUser(filter);

		// ASSERT
		expect(authUserRepository.findOne).toHaveBeenCalledWith(filter);
	});

	it('hooksService.saveUser should call userRepository.save', async () => {
		// ACT
		await hooksService.saveUser(mockedUser);

		// ASSERT

		expect(userRepository.save).toHaveBeenCalledWith(mockedUser);
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
		const filter = { where: { active: true } };

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

		const next = jest.fn();

		// ACT
		await hooksService.authMiddleware(req, res, next);

		// ASSERT
		expect(authService.authMiddleware).toHaveBeenCalledWith(req, res, next);
	});

	it('hooksService.dbCollections should return valid repositories', async () => {
		// ACT
		const collections = hooksService.dbCollections();

		// ASSERT
		expect(collections).toHaveProperty('User');
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
