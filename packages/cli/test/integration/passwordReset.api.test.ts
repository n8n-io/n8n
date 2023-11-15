import { v4 as uuid } from 'uuid';
import { compare } from 'bcryptjs';
import { Container } from 'typedi';
import { mock } from 'jest-mock-extended';

import { License } from '@/License';
import config from '@/config';
import type { Role } from '@db/entities/Role';
import type { User } from '@db/entities/User';
import { setCurrentAuthenticationMethod } from '@/sso/ssoHelpers';
import { ExternalHooks } from '@/ExternalHooks';
import { JwtService } from '@/services/jwt.service';
import { UserService } from '@/services/user.service';
import { UserManagementMailer } from '@/UserManagement/email';
import { UserRepository } from '@db/repositories/user.repository';

import { mockInstance } from '../shared/mocking';
import { getAuthToken, setupTestServer } from './shared/utils/';
import {
	randomEmail,
	randomInvalidPassword,
	randomName,
	randomString,
	randomValidPassword,
} from './shared/random';
import * as testDb from './shared/testDb';
import { getGlobalMemberRole, getGlobalOwnerRole } from './shared/db/roles';
import { createUser } from './shared/db/users';

config.set('userManagement.jwtSecret', randomString(5, 10));

let globalOwnerRole: Role;
let globalMemberRole: Role;
let owner: User;
let member: User;

const externalHooks = mockInstance(ExternalHooks);
const mailer = mockInstance(UserManagementMailer, { isEmailSetUp: true });
const testServer = setupTestServer({ endpointGroups: ['passwordReset'] });
const jwtService = Container.get(JwtService);
let userService: UserService;

beforeAll(async () => {
	globalOwnerRole = await getGlobalOwnerRole();
	globalMemberRole = await getGlobalMemberRole();
});

beforeEach(async () => {
	await testDb.truncate(['User']);
	owner = await createUser({ globalRole: globalOwnerRole });
	member = await createUser({ globalRole: globalMemberRole });
	externalHooks.run.mockReset();
	jest.replaceProperty(mailer, 'isEmailSetUp', true);
	userService = Container.get(UserService);
});

describe('POST /forgot-password', () => {
	test('should send password reset email', async () => {
		const member = await createUser({
			email: 'test@test.com',
			globalRole: globalMemberRole,
		});

		await Promise.all(
			[{ email: owner.email }, { email: member.email.toUpperCase() }].map(async (payload) => {
				const response = await testServer.authlessAgent.post('/forgot-password').send(payload);

				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual({});
			}),
		);
	});

	test('should fail if emailing is not set up', async () => {
		jest.replaceProperty(mailer, 'isEmailSetUp', false);

		await testServer.authlessAgent
			.post('/forgot-password')
			.send({ email: owner.email })
			.expect(500);
	});

	test('should fail if SAML is authentication method', async () => {
		await setCurrentAuthenticationMethod('saml');
		const member = await createUser({
			email: 'test@test.com',
			globalRole: globalMemberRole,
		});

		await testServer.authlessAgent
			.post('/forgot-password')
			.send({ email: member.email })
			.expect(403);

		await setCurrentAuthenticationMethod('email');
	});

	test('should succeed if SAML is authentication method and requestor is owner', async () => {
		await setCurrentAuthenticationMethod('saml');

		const response = await testServer.authlessAgent
			.post('/forgot-password')
			.send({ email: owner.email });

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({});

		await setCurrentAuthenticationMethod('email');
	});

	test('should fail with invalid inputs', async () => {
		const invalidPayloads = [
			randomEmail(),
			[randomEmail()],
			{},
			[{ name: randomName() }],
			[{ email: randomName() }],
		];

		for (const invalidPayload of invalidPayloads) {
			const response = await testServer.authlessAgent.post('/forgot-password').send(invalidPayload);
			expect(response.statusCode).toBe(400);
		}
	});

	test('should fail if user is not found', async () => {
		const response = await testServer.authlessAgent
			.post('/forgot-password')
			.send({ email: randomEmail() });

		expect(response.statusCode).toBe(200); // expect 200 to remain vague
	});
});

describe('GET /resolve-password-token', () => {
	test('should succeed with valid inputs', async () => {
		const resetPasswordToken = userService.generatePasswordResetToken(owner);

		const response = await testServer.authlessAgent
			.get('/resolve-password-token')
			.query({ userId: owner.id, token: resetPasswordToken });

		expect(response.statusCode).toBe(200);
	});

	test('should fail with invalid inputs', async () => {
		await testServer.authlessAgent
			.get('/resolve-password-token')
			.query({ token: uuid() })
			.expect(404);

		await testServer.authlessAgent
			.get('/resolve-password-token')
			.query({ userId: owner.id })
			.expect(400);
	});

	test('should fail if user is not found', async () => {
		const token = jwtService.sign({ sub: uuid() });

		const response = await testServer.authlessAgent
			.get('/resolve-password-token')
			.query({ userId: owner.id, token });

		expect(response.statusCode).toBe(404);
	});

	test('should fail if token is expired', async () => {
		const resetPasswordToken = userService.generatePasswordResetToken(owner, '-1h');

		const response = await testServer.authlessAgent
			.get('/resolve-password-token')
			.query({ userId: owner.id, token: resetPasswordToken });

		expect(response.statusCode).toBe(404);
	});

	test('should fail after password has changed', async () => {
		const updatedUser = mock<User>({ ...owner, password: 'another-password' });
		const resetPasswordToken = userService.generatePasswordResetToken(updatedUser);

		const response = await testServer.authlessAgent
			.get('/resolve-password-token')
			.query({ userId: owner.id, token: resetPasswordToken });

		expect(response.statusCode).toBe(404);
	});
});

describe('POST /change-password', () => {
	const passwordToStore = randomValidPassword();

	test('should succeed with valid inputs', async () => {
		const resetPasswordToken = userService.generatePasswordResetToken(owner);
		const response = await testServer.authlessAgent.post('/change-password').send({
			token: resetPasswordToken,
			userId: owner.id,
			password: passwordToStore,
		});

		expect(response.statusCode).toBe(200);

		const authToken = getAuthToken(response);
		expect(authToken).toBeDefined();

		const { password: storedPassword } = await Container.get(UserRepository).findOneByOrFail({
			id: owner.id,
		});

		const comparisonResult = await compare(passwordToStore, storedPassword);
		expect(comparisonResult).toBe(true);
		expect(storedPassword).not.toBe(passwordToStore);

		expect(externalHooks.run).toHaveBeenCalledWith('user.password.update', [
			owner.email,
			storedPassword,
		]);
	});

	test('should fail with invalid inputs', async () => {
		const resetPasswordToken = userService.generatePasswordResetToken(owner);

		const invalidPayloads = [
			{ token: uuid() },
			{ id: owner.id },
			{ password: randomValidPassword() },
			{ token: uuid(), id: owner.id },
			{ token: uuid(), password: randomValidPassword() },
			{ id: owner.id, password: randomValidPassword() },
			{
				id: owner.id,
				password: randomInvalidPassword(),
				token: resetPasswordToken,
			},
			{
				id: owner.id,
				password: randomValidPassword(),
				token: uuid(),
			},
		];

		for (const invalidPayload of invalidPayloads) {
			const response = await testServer.authlessAgent
				.post('/change-password')
				.query(invalidPayload);
			expect(response.statusCode).toBe(400);
			const { password: storedPassword } = await Container.get(UserRepository).findOneByOrFail({
				id: owner.id,
			});
			expect(owner.password).toBe(storedPassword);
		}
	});

	test('should fail when token has expired', async () => {
		const resetPasswordToken = userService.generatePasswordResetToken(owner, '-1h');

		const response = await testServer.authlessAgent.post('/change-password').send({
			token: resetPasswordToken,
			userId: owner.id,
			password: passwordToStore,
		});

		expect(response.statusCode).toBe(404);

		expect(externalHooks.run).not.toHaveBeenCalled();
	});

	test('owner should be able to reset its password when quota:users = 1', async () => {
		jest.spyOn(Container.get(License), 'getUsersLimit').mockReturnValueOnce(1);

		const resetPasswordToken = userService.generatePasswordResetToken(owner);
		const response = await testServer.authlessAgent.post('/change-password').send({
			token: resetPasswordToken,
			userId: owner.id,
			password: passwordToStore,
		});

		expect(response.statusCode).toBe(200);

		const authToken = getAuthToken(response);
		expect(authToken).toBeDefined();

		const { password: storedPassword } = await Container.get(UserRepository).findOneByOrFail({
			id: owner.id,
		});

		const comparisonResult = await compare(passwordToStore, storedPassword);
		expect(comparisonResult).toBe(true);
		expect(storedPassword).not.toBe(passwordToStore);

		expect(externalHooks.run).toHaveBeenCalledWith('user.password.update', [
			owner.email,
			storedPassword,
		]);
	});

	test('member should not be able to reset its password when quota:users = 1', async () => {
		jest.spyOn(Container.get(License), 'getUsersLimit').mockReturnValueOnce(1);

		const resetPasswordToken = userService.generatePasswordResetToken(member);
		const response = await testServer.authlessAgent.post('/change-password').send({
			token: resetPasswordToken,
			userId: member.id,
			password: passwordToStore,
		});

		expect(response.statusCode).toBe(403);
	});
});
