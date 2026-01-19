import {
	randomEmail,
	randomInvalidPassword,
	randomValidPassword,
	testDb,
	mockInstance,
	randomName,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { compare } from 'bcryptjs';
import { mock } from 'jest-mock-extended';
import { randomString } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { ExternalHooks } from '@/external-hooks';
import { License } from '@/license';
import { JwtService } from '@/services/jwt.service';
import { PasswordUtility } from '@/services/password.utility';
import { setCurrentAuthenticationMethod } from '@/sso.ee/sso-helpers';
import { UserManagementMailer } from '@/user-management/email';

import { createUser } from './shared/db/users';
import { getAuthToken, setupTestServer } from './shared/utils';

config.set('userManagement.jwtSecret', randomString(5, 10));

let owner: User;
let member: User;

const externalHooks = mockInstance(ExternalHooks);
const mailer = mockInstance(UserManagementMailer, { isEmailSetUp: true });
const testServer = setupTestServer({ endpointGroups: ['passwordReset'] });
const jwtService = Container.get(JwtService);
let authService: AuthService;

beforeEach(async () => {
	await testDb.truncate(['User']);
	owner = await createUser({ role: GLOBAL_OWNER_ROLE });
	member = await createUser({ role: GLOBAL_MEMBER_ROLE });
	externalHooks.run.mockReset();
	jest.replaceProperty(mailer, 'isEmailSetUp', true);
	authService = Container.get(AuthService);
});

describe('POST /forgot-password', () => {
	test('should send password reset email', async () => {
		const member = await createUser({
			email: 'test@test.com',
			role: { slug: 'global:member' },
		});

		await Promise.all(
			[{ email: owner.email }, { email: member.email.toUpperCase() }].map(async (payload) => {
				const response = await testServer.authlessAgent.post('/forgot-password').send(payload);

				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual({});
			}),
		);
	});

	test('should return 200 even if emailing is not set up (silent failure)', async () => {
		jest.replaceProperty(mailer, 'isEmailSetUp', false);

		// Returns 200 to prevent information leakage about email configuration
		await testServer.authlessAgent
			.post('/forgot-password')
			.send({ email: owner.email })
			.expect(200);
	});

	test('should return 200 for SAML users (silent failure)', async () => {
		await setCurrentAuthenticationMethod('saml');
		const member = await createUser({
			email: 'test@test.com',
			role: { slug: 'global:member' },
		});

		// Returns 200 to prevent user enumeration via authentication method detection
		await testServer.authlessAgent
			.post('/forgot-password')
			.send({ email: member.email })
			.expect(200);

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
		// Limited to 3 payloads to stay under rate limit (invalid payloads share IP bucket)
		const invalidPayloads = [
			randomEmail(), // string instead of object
			{}, // missing email field
			{ email: randomName() }, // invalid email format
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

	test('should rate limit by email after 3 requests', async () => {
		const email = randomEmail();

		// First 3 requests should succeed (rate limit is 3 per hour per email)
		for (let i = 0; i < 3; i++) {
			const response = await testServer.authlessAgent.post('/forgot-password').send({ email });
			expect(response.statusCode).toBe(200);
		}

		// 4th request should be rate limited
		const response = await testServer.authlessAgent.post('/forgot-password').send({ email });
		expect(response.statusCode).toBe(429);
		expect(response.body.message).toBe('Too many requests');
	});

	test('should have separate rate limit buckets per email', async () => {
		const email1 = randomEmail();
		const email2 = randomEmail();

		// Exhaust rate limit for email1
		for (let i = 0; i < 3; i++) {
			await testServer.authlessAgent.post('/forgot-password').send({ email: email1 });
		}

		// email2 should still work (different bucket)
		const response = await testServer.authlessAgent
			.post('/forgot-password')
			.send({ email: email2 });
		expect(response.statusCode).toBe(200);
	});

	test('should normalize email case for rate limiting', async () => {
		const baseEmail = randomEmail();
		const upperEmail = baseEmail.toUpperCase();

		// First 3 requests with different cases should count towards same bucket
		await testServer.authlessAgent.post('/forgot-password').send({ email: baseEmail });
		await testServer.authlessAgent.post('/forgot-password').send({ email: upperEmail });
		await testServer.authlessAgent
			.post('/forgot-password')
			.send({ email: baseEmail.toLowerCase() });

		// 4th request should be rate limited regardless of case
		const response = await testServer.authlessAgent
			.post('/forgot-password')
			.send({ email: upperEmail });
		expect(response.statusCode).toBe(429);
	});
});

describe('GET /resolve-password-token', () => {
	test('should succeed with valid inputs', async () => {
		const resetPasswordToken = authService.generatePasswordResetToken(owner);

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
		const resetPasswordToken = authService.generatePasswordResetToken(owner, '-1h');

		const response = await testServer.authlessAgent
			.get('/resolve-password-token')
			.query({ userId: owner.id, token: resetPasswordToken });

		expect(response.statusCode).toBe(404);
	});

	test('should fail after password has changed', async () => {
		const updatedUser = mock<User>({ ...owner, password: 'another-password' });
		const resetPasswordToken = authService.generatePasswordResetToken(updatedUser);

		const response = await testServer.authlessAgent
			.get('/resolve-password-token')
			.query({ userId: owner.id, token: resetPasswordToken });

		expect(response.statusCode).toBe(404);
	});
});

describe('POST /change-password', () => {
	const passwordToStore = randomValidPassword();

	test('should succeed with valid inputs', async () => {
		const resetPasswordToken = authService.generatePasswordResetToken(owner);
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

		const comparisonResult = await Container.get(PasswordUtility).compare(
			passwordToStore,
			storedPassword,
		);
		expect(comparisonResult).toBe(true);
		expect(storedPassword).not.toBe(passwordToStore);

		expect(externalHooks.run).toHaveBeenCalledWith('user.password.update', [
			owner.email,
			storedPassword,
		]);
	});

	test('should fail with invalid inputs', async () => {
		const resetPasswordToken = authService.generatePasswordResetToken(owner);

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
		const resetPasswordToken = authService.generatePasswordResetToken(owner, '-1h');

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

		const resetPasswordToken = authService.generatePasswordResetToken(owner);
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

		const comparisonResult = await compare(passwordToStore, storedPassword!);
		expect(comparisonResult).toBe(true);
		expect(storedPassword).not.toBe(passwordToStore);

		expect(externalHooks.run).toHaveBeenCalledWith('user.password.update', [
			owner.email,
			storedPassword,
		]);
	});

	test('member should not be able to reset its password when quota:users = 1', async () => {
		jest.spyOn(Container.get(License), 'getUsersLimit').mockReturnValueOnce(1);

		const resetPasswordToken = authService.generatePasswordResetToken(member);
		const response = await testServer.authlessAgent.post('/change-password').send({
			token: resetPasswordToken,
			userId: member.id,
			password: passwordToStore,
		});

		expect(response.statusCode).toBe(403);
	});
});
