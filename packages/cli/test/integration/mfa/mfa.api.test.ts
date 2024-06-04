import Container from 'typedi';

import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import type { User } from '@db/entities/User';
import { AuthUserRepository } from '@db/repositories/authUser.repository';
import { randomPassword } from '@/Ldap/helpers';
import { TOTPService } from '@/Mfa/totp.service';

import * as testDb from '../shared/testDb';
import * as utils from '../shared/utils';
import { randomDigit, randomString, randomValidPassword, uniqueId } from '../shared/random';
import { createUser, createUserWithMfaEnabled } from '../shared/db/users';

jest.mock('@/telemetry');

let owner: User;

const testServer = utils.setupTestServer({
	endpointGroups: ['mfa', 'auth', 'me', 'passwordReset'],
});

beforeEach(async () => {
	await testDb.truncate(['User']);

	owner = await createUser({ role: 'global:owner' });

	config.set('userManagement.disabled', false);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('Enable MFA setup', () => {
	describe('Step one', () => {
		test('GET /qr should fail due to unauthenticated user', async () => {
			await testServer.authlessAgent.get('/mfa/qr').expect(401);
		});

		test('GET /qr should reuse secret and recovery codes until setup is complete', async () => {
			const firstCall = await testServer.authAgentFor(owner).get('/mfa/qr').expect(200);

			const secondCall = await testServer.authAgentFor(owner).get('/mfa/qr').expect(200);

			expect(firstCall.body.data.secret).toBe(secondCall.body.data.secret);
			expect(firstCall.body.data.recoveryCodes.join('')).toBe(
				secondCall.body.data.recoveryCodes.join(''),
			);

			await testServer.authAgentFor(owner).delete('/mfa/disable').expect(200);

			const thirdCall = await testServer.authAgentFor(owner).get('/mfa/qr').expect(200);

			expect(firstCall.body.data.secret).not.toBe(thirdCall.body.data.secret);
			expect(firstCall.body.data.recoveryCodes.join('')).not.toBe(
				thirdCall.body.data.recoveryCodes.join(''),
			);
		});

		test('GET /qr should return qr, secret and recovery codes', async () => {
			const response = await testServer.authAgentFor(owner).get('/mfa/qr').expect(200);

			const { data } = response.body;

			expect(data.secret).toBeDefined();
			expect(data.qrCode).toBeDefined();
			expect(data.recoveryCodes).toBeDefined();
			expect(data.recoveryCodes).not.toBeEmptyArray();
			expect(data.recoveryCodes.length).toBe(10);
		});
	});

	describe('Step two', () => {
		test('POST /verify should fail due to unauthenticated user', async () => {
			await testServer.authlessAgent.post('/mfa/verify').expect(401);
		});

		test('POST /verify should fail due to invalid MFA token', async () => {
			await testServer.authAgentFor(owner).post('/mfa/verify').send({ token: '123' }).expect(400);
		});

		test('POST /verify should fail due to missing token parameter', async () => {
			await testServer.authAgentFor(owner).get('/mfa/qr').expect(200);
			await testServer.authAgentFor(owner).post('/mfa/verify').send({ token: '' }).expect(400);
		});

		test('POST /verify should validate MFA token', async () => {
			const response = await testServer.authAgentFor(owner).get('/mfa/qr').expect(200);

			const { secret } = response.body.data;
			const token = new TOTPService().generateTOTP(secret);

			await testServer.authAgentFor(owner).post('/mfa/verify').send({ token }).expect(200);
		});
	});

	describe('Step three', () => {
		test('POST /enable should fail due to unauthenticated user', async () => {
			await testServer.authlessAgent.post('/mfa/enable').expect(401);
		});

		test('POST /verify should fail due to missing token parameter', async () => {
			await testServer.authAgentFor(owner).post('/mfa/verify').send({ token: '' }).expect(400);
		});

		test('POST /enable should fail due to invalid MFA token', async () => {
			await testServer.authAgentFor(owner).get('/mfa/qr').expect(200);
			await testServer.authAgentFor(owner).post('/mfa/enable').send({ token: '123' }).expect(400);
		});

		test('POST /enable should fail due to empty secret and recovery codes', async () => {
			await testServer.authAgentFor(owner).post('/mfa/enable').expect(400);
		});

		test('POST /enable should enable MFA in account', async () => {
			const response = await testServer.authAgentFor(owner).get('/mfa/qr').expect(200);

			const { secret } = response.body.data;
			const token = new TOTPService().generateTOTP(secret);

			await testServer.authAgentFor(owner).post('/mfa/verify').send({ token }).expect(200);
			await testServer.authAgentFor(owner).post('/mfa/enable').send({ token }).expect(200);

			const user = await Container.get(AuthUserRepository).findOneOrFail({
				where: {},
			});

			expect(user.mfaEnabled).toBe(true);
			expect(user.mfaRecoveryCodes).toBeDefined();
			expect(user.mfaSecret).toBeDefined();
		});
	});
});

describe('Disable MFA setup', () => {
	test('POST /disable should disable login with MFA', async () => {
		const { user } = await createUserWithMfaEnabled();

		await testServer.authAgentFor(user).delete('/mfa/disable').expect(200);

		const dbUser = await Container.get(AuthUserRepository).findOneOrFail({
			where: { id: user.id },
		});

		expect(dbUser.mfaEnabled).toBe(false);
		expect(dbUser.mfaSecret).toBe(null);
		expect(dbUser.mfaRecoveryCodes.length).toBe(0);
	});
});

describe('Change password with MFA enabled', () => {
	test('PATCH /me/password should fail due to missing MFA token', async () => {
		const { user, rawPassword } = await createUserWithMfaEnabled();

		const newPassword = randomPassword();

		await testServer
			.authAgentFor(user)
			.patch('/me/password')
			.send({ currentPassword: rawPassword, newPassword })
			.expect(400);
	});

	test('POST /change-password should fail due to missing MFA token', async () => {
		await createUserWithMfaEnabled();

		const newPassword = randomValidPassword();
		const resetPasswordToken = uniqueId();

		await testServer.authlessAgent
			.post('/change-password')
			.send({ password: newPassword, token: resetPasswordToken })
			.expect(404);
	});

	test('POST /change-password should fail due to invalid MFA token', async () => {
		await createUserWithMfaEnabled();

		const newPassword = randomValidPassword();
		const resetPasswordToken = uniqueId();

		await testServer.authlessAgent
			.post('/change-password')
			.send({
				password: newPassword,
				token: resetPasswordToken,
				mfaToken: randomDigit(),
			})
			.expect(404);
	});

	test('POST /change-password should update password', async () => {
		const { user, rawSecret } = await createUserWithMfaEnabled();

		const newPassword = randomValidPassword();

		config.set('userManagement.jwtSecret', randomString(5, 10));

		const resetPasswordToken = Container.get(AuthService).generatePasswordResetToken(user);

		const mfaToken = new TOTPService().generateTOTP(rawSecret);

		await testServer.authlessAgent
			.post('/change-password')
			.send({
				password: newPassword,
				token: resetPasswordToken,
				mfaToken,
			})
			.expect(200);

		const loginResponse = await testServer
			.authAgentFor(user)
			.post('/login')
			.send({
				email: user.email,
				password: newPassword,
				mfaToken: new TOTPService().generateTOTP(rawSecret),
			})
			.expect(200);

		expect(loginResponse.body).toHaveProperty('data');
	});
});

describe('Login', () => {
	test('POST /login with email/password should succeed when mfa is disabled', async () => {
		const password = randomPassword();

		const user = await createUser({ password });

		await testServer.authlessAgent.post('/login').send({ email: user.email, password }).expect(200);
	});

	test('GET /login should not include mfaSecret and mfaRecoveryCodes property in response', async () => {
		const response = await testServer.authAgentFor(owner).get('/login').expect(200);

		const { data } = response.body;

		expect(data.recoveryCodes).not.toBeDefined();
		expect(data.mfaSecret).not.toBeDefined();
	});

	test('POST /login with email/password should fail when mfa is enabled', async () => {
		const { user, rawPassword } = await createUserWithMfaEnabled();

		await testServer.authlessAgent
			.post('/login')
			.send({ email: user.email, password: rawPassword })
			.expect(401);
	});

	describe('Login with MFA token', () => {
		test('POST /login should fail due to invalid MFA token', async () => {
			const { user, rawPassword } = await createUserWithMfaEnabled();

			await testServer.authlessAgent
				.post('/login')
				.send({ email: user.email, password: rawPassword, mfaToken: 'wrongvalue' })
				.expect(401);
		});

		test('POST /login should fail due two MFA step needed', async () => {
			const { user, rawPassword } = await createUserWithMfaEnabled();

			const response = await testServer.authlessAgent
				.post('/login')
				.send({ email: user.email, password: rawPassword })
				.expect(401);

			expect(response.body.code).toBe(998);
		});

		test('POST /login should succeed with MFA token', async () => {
			const { user, rawSecret, rawPassword } = await createUserWithMfaEnabled();

			const token = new TOTPService().generateTOTP(rawSecret);

			const response = await testServer.authlessAgent
				.post('/login')
				.send({ email: user.email, password: rawPassword, mfaToken: token })
				.expect(200);

			const data = response.body.data;

			expect(data.mfaEnabled).toBe(true);
		});
	});

	describe('Login with recovery code', () => {
		test('POST /login should fail due to invalid MFA recovery code', async () => {
			const { user, rawPassword } = await createUserWithMfaEnabled();

			await testServer.authlessAgent
				.post('/login')
				.send({ email: user.email, password: rawPassword, mfaRecoveryCode: 'wrongvalue' })
				.expect(401);
		});

		test('POST /login should succeed with MFA recovery code', async () => {
			const { user, rawPassword, rawRecoveryCodes } = await createUserWithMfaEnabled();

			const response = await testServer.authlessAgent
				.post('/login')
				.send({ email: user.email, password: rawPassword, mfaRecoveryCode: rawRecoveryCodes[0] })
				.expect(200);

			const data = response.body.data;
			expect(data.mfaEnabled).toBe(true);

			const dbUser = await Container.get(AuthUserRepository).findOneOrFail({
				where: { id: user.id },
			});

			// Make sure the recovery code used was removed
			expect(dbUser.mfaRecoveryCodes.length).toBe(rawRecoveryCodes.length - 1);
			expect(dbUser.mfaRecoveryCodes.includes(rawRecoveryCodes[0])).toBe(false);
		});
	});
});
