import { UserService } from '@/services/user.service';
import { HooksService } from '@/services/hooks.service';
import { User } from '@/databases/entities/User';
import { mockInstance } from '../../shared/mocking';
import { v4 as uuid } from 'uuid';
import { AuthService } from '@/auth/auth.service';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import type { Response } from 'express';

let hooksService: HooksService;

const mockedUser = Object.assign(new User(), {
	id: uuid(),
	password: 'passwordHash',
	mfaEnabled: false,
	mfaSecret: 'test',
	mfaRecoveryCodes: ['test'],
	updatedAt: new Date(),
});

describe('HooksService', () => {
	const userService = mockInstance(UserService);
	const authService = mockInstance(AuthService);
	const userRepository = mockInstance(UserRepository);
	const settingsRepository = mockInstance(SettingsRepository);
	const workflowRepository = mockInstance(WorkflowRepository);
	const credentialsRepository = mockInstance(CredentialsRepository);
	hooksService = new HooksService(
		userService,
		authService,
		userRepository,
		settingsRepository,
		workflowRepository,
		credentialsRepository,
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('hooksService.inviteUsers should call userService.inviteUsers', async () => {
		const usersToInvite: Parameters<typeof userService.inviteUsers>[1] = [
			{ email: 'test@n8n.io', role: 'global:member' },
		];

		await hooksService.inviteUsers(mockedUser, usersToInvite);
		expect(userService.inviteUsers).toHaveBeenCalledWith(mockedUser, usersToInvite);
	});

	it('hooksService.issueCookie should call authService.issueCookie', async () => {
		const res = {
			cookie: jest.fn(),
		} as unknown as Response;

		hooksService.issueCookie(res, mockedUser);
		expect(authService.issueCookie).toHaveBeenCalledWith(res, mockedUser);
	});

	it('hooksService.findOneUser should call userRepository.findOne', async () => {
		const filter = { where: { id: '1' } };
		await hooksService.findOneUser(filter);
		expect(userRepository.findOne).toHaveBeenCalledWith(filter);
	});

	it('hooksService.saveUser should call userRepository.save', async () => {
		await hooksService.saveUser(mockedUser);
		expect(userRepository.save).toHaveBeenCalledWith(mockedUser);
	});

	it('hooksService.updateSettings should call settingRepository.update', async () => {
		const filter = { key: 'test' };
		const set = { value: 'true' };
		await hooksService.updateSettings(filter, set);
		expect(settingsRepository.update).toHaveBeenCalledWith(filter, set);
	});

	it('hooksService.workflowsCount should call workflowRepository.count', async () => {
		const filter = { where: { active: true } };
		await hooksService.workflowsCount(filter);
		expect(workflowRepository.count).toHaveBeenCalledWith(filter);
	});

	it('hooksService.credentialsCount should call credentialRepository.count', async () => {
		const filter = { where: {} };
		await hooksService.credentialsCount(filter);
		expect(credentialsRepository.count).toHaveBeenCalledWith(filter);
	});

	it('hooksService.settingsCount should call settingsRepository.count', async () => {
		const filter = { where: { key: 'test' } };
		await hooksService.settingsCount(filter);
		expect(settingsRepository.count).toHaveBeenCalledWith(filter);
	});

	it('hooksService.authMiddleware should call authService.authMiddleware', async () => {
		const res = {
			cookie: jest.fn(),
		} as unknown as Response;

		const req = {
			cookie: jest.fn(),
		} as unknown as Response;

		const next = jest.fn();

		await hooksService.authMiddleware(req, res, next);
		expect(authService.authMiddleware).toHaveBeenCalledWith(req, res, next);
	});

	it('hooksService.dbCollections should return valid repositories', async () => {
		const collections = hooksService.dbCollections();
		expect(collections).toHaveProperty('User');
		expect(collections).toHaveProperty('Settings');
		expect(collections).toHaveProperty('Credentials');
		expect(collections).toHaveProperty('Workflow');
	});
});
