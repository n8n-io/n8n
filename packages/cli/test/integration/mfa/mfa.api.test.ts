import { randomValidPassword, uniqueId, testDb, mockInstance } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import { SettingsRepository, UserRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomString } from 'n8n-workflow';
import request from 'supertest';

import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { AUTH_COOKIE_NAME } from '@/constants';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ExternalHooks } from '@/external-hooks';
import { MFA_ENFORCE_SETTING } from '@/mfa/constants';
import { TOTPService } from '@/mfa/totp.service';

import { createOwner, createUser, createUserWithMfaEnabled } from '../shared/db/users';
import * as utils from '../shared/utils';
import { CacheService } from '@/services/cache/cache.service';
import { MFA_CACHE_KEY } from '@/mfa/mfa.service';

jest.mock('@/telemetry');

let owner: User;

const externalHooks = mockInstance(ExternalHooks);

const testServer = utils.setupTestServer({
	endpointGroups: ['mfa', 'auth', 'me', 'passwordReset'],
	enabledFeatures: [LICENSE_FEATURES.MFA_ENFORCEMENT],
});

beforeEach(async () => {
	await testDb.truncate(['User']);

	owner = await createOwner();

	owner = await Container.get(UserRepository).findOneOrFail({
		where: { id: owner.id },
		relations: ['role'],
	});

	externalHooks.run.mockReset();

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

			const mfaCode = new TOTPService().generateTOTP(firstCall.body.data.secret);
			await testServer.authAgentFor(owner).post('/mfa/disable').send({ mfaCode }).expect(200);

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

		test('POST /verify should fail due to invalid MFA code', async () => {
			await testServer.authAgentFor(owner).post('/mfa/verify').send({ mfaCode: '123' }).expect(400);
		});

		test('POST /verify should fail due to missing mfaCode parameter', async () => {
			await testServer.authAgentFor(owner).get('/mfa/qr').expect(200);
			await testServer.authAgentFor(owner).post('/mfa/verify').send({ mfaCode: '' }).expect(400);
		});

		test('POST /verify should validate MFA code', async () => {
			const response = await testServer.authAgentFor(owner).get('/mfa/qr').expect(200);

			const { secret } = response.body.data;
			const mfaCode = new TOTPService().generateTOTP(secret);

			await testServer.authAgentFor(owner).post('/mfa/verify').send({ mfaCode }).expect(200);
		});
	});

	describe('Step three', () => {
		test('POST /enable should fail due to unauthenticated user', async () => {
			await testServer.authlessAgent.post('/mfa/enable').expect(401);
		});

		test('POST /verify should fail due to missing mfaCode parameter', async () => {
			await testServer.authAgentFor(owner).post('/mfa/verify').send({ mfaCode: '' }).expect(400);
		});

		test('POST /enable should fail due to invalid MFA code', async () => {
			await testServer.authAgentFor(owner).get('/mfa/qr').expect(200);
			await testServer.authAgentFor(owner).post('/mfa/enable').send({ mfaCode: '123' }).expect(400);
		});

		test('POST /enable should fail due to empty secret and recovery codes', async () => {
			await testServer.authAgentFor(owner).post('/mfa/enable').expect(400);
		});

		test('POST /enable should enable MFA in account', async () => {
			const response = await testServer.authAgentFor(owner).get('/mfa/qr').expect(200);

			const { secret } = response.body.data;
			const mfaCode = new TOTPService().generateTOTP(secret);

			await testServer.authAgentFor(owner).post('/mfa/verify').send({ mfaCode }).expect(200);
			await testServer.authAgentFor(owner).post('/mfa/enable').send({ mfaCode }).expect(200);

			const user = await Container.get(UserRepository).findOneOrFail({
				where: {},
			});

			expect(user.mfaEnabled).toBe(true);
			expect(user.mfaRecoveryCodes).toBeDefined();
			expect(user.mfaSecret).toBeDefined();
		});

		test('POST /enable should invalidate sessions across browsers', async () => {
			const password = randomValidPassword();
			let user = await createUser({ password });
			const testBrowserId = 'test-browser-id';
			const authService = Container.get(AuthService);

			// Create a token BEFORE MFA is enabled (simulating Browser A)
			const preMfaToken = authService.issueJWT(user, false, testBrowserId);

			// Enable MFA using another session (Browser B)
			const qrResponse = await testServer.authAgentFor(user).get('/mfa/qr').expect(200);
			const { secret } = qrResponse.body.data;
			const mfaCode = new TOTPService().generateTOTP(secret);
			await testServer.authAgentFor(user).post('/mfa/enable').send({ mfaCode }).expect(200);

			// Verify MFA is enabled and tokensValidAfter is set
			user = await Container.get(UserRepository).findOneOrFail({
				where: { id: user.id },
				relations: ['role'],
			});
			expect(user.mfaEnabled).toBe(true);
			expect(user.tokensValidAfter).not.toBe(null);

			// Browser A's old token should now be rejected
			const response = await request(testServer.app)
				.patch('/rest/me/settings')
				.send({})
				.set('Cookie', `${AUTH_COOKIE_NAME}=${preMfaToken}`)
				.set('browser-id', testBrowserId);

			expect(response.status).toBe(401);
		});

		test('POST /enable should not enable MFA if pre check fails', async () => {
			// This test is to make sure owners verify their email before enabling MFA in cloud

			const response = await testServer.authAgentFor(owner).get('/mfa/qr').expect(200);

			const { secret } = response.body.data;
			const mfaCode = new TOTPService().generateTOTP(secret);

			await testServer.authAgentFor(owner).post('/mfa/verify').send({ mfaCode }).expect(200);

			externalHooks.run.mockRejectedValue(new BadRequestError('Error message'));

			await testServer.authAgentFor(owner).post('/mfa/enable').send({ mfaCode }).expect(400);

			const user = await Container.get(UserRepository).findOneOrFail({
				where: {},
			});

			expect(user.mfaEnabled).toBe(false);
		});
	});
});

describe('Disable MFA setup', () => {
	test('POST /disable should disable login with MFA', async () => {
		const { user, rawSecret } = await createUserWithMfaEnabled();
		const mfaCode = new TOTPService().generateTOTP(rawSecret);

		await testServer
			.authAgentFor(user)
			.post('/mfa/disable')
			.send({
				mfaCode,
			})
			.expect(200);

		const dbUser = await Container.get(UserRepository).findOneOrFail({
			where: { id: user.id },
		});

		expect(dbUser.mfaEnabled).toBe(false);
		expect(dbUser.mfaSecret).toBe(null);
		expect(dbUser.mfaRecoveryCodes.length).toBe(0);
	});

	test('POST /disable should fail if invalid MFA recovery code is given', async () => {
		const { user } = await createUserWithMfaEnabled();

		await testServer
			.authAgentFor(user)
			.post('/mfa/disable')
			.send({
				mfaRecoveryCode: 'invalid token',
			})
			.expect(403);
	});

	test('POST /disable should fail if invalid MFA code is given', async () => {
		const { user } = await createUserWithMfaEnabled();

		await testServer
			.authAgentFor(user)
			.post('/mfa/disable')
			.send({
				mfaCode: 'invalid token',
			})
			.expect(403);
	});

	test('POST /disable should fail if neither MFA code nor recovery code is sent', async () => {
		const { user } = await createUserWithMfaEnabled();

		await testServer.authAgentFor(user).post('/mfa/disable').send({ anotherParam: '' }).expect(400);
	});

	test('POST /disable should invalidate sessions across browsers', async () => {
		const { user, rawSecret } = await createUserWithMfaEnabled();

		// Use the same browserId as the test server to avoid browserId mismatch failures
		const testBrowserId = 'test-browser-id';

		// Simulate Browser A: Create a token while MFA is enabled
		// The token hash includes the MFA secret: hash(email:password:mfaSecret[0:3])
		const authService = Container.get(AuthService);
		const browserAToken = authService.issueJWT(user, true, testBrowserId);

		// Simulate Browser B: Disable MFA
		// This sets mfaEnabled=false and mfaSecret=null in the database
		const mfaCode = new TOTPService().generateTOTP(rawSecret);
		await testServer.authAgentFor(user).post('/mfa/disable').send({ mfaCode }).expect(200);

		// Verify MFA is disabled in database
		const dbUser = await Container.get(UserRepository).findOneOrFail({
			where: { id: user.id },
		});
		expect(dbUser.mfaEnabled).toBe(false);
		expect(dbUser.mfaSecret).toBe(null);

		// Simulate Browser A: Try to use the old token on an authenticated endpoint
		// The old token's hash was: hash(email:password:mfaSecret[0:3])
		// The new hash (with MFA disabled) is: hash(email:password)
		// These hashes don't match, so the token should be invalid
		const response = await request(testServer.app)
			.patch('/rest/me/settings')
			.send({})
			.set('Cookie', `${AUTH_COOKIE_NAME}=${browserAToken}`)
			.set('browser-id', testBrowserId);

		expect(response.status).toBe(401);
	});

	test('POST /disable should invalidate tokens issued before MFA was enabled', async () => {
		// Create a user without MFA
		const password = randomValidPassword();
		let user = await createUser({ password });
		const testBrowserId = 'test-browser-id';
		const authService = Container.get(AuthService);

		// Create a token BEFORE MFA is enabled
		// Token hash = hash(email:password)
		const preMfaToken = authService.issueJWT(user, false, testBrowserId);

		// Wait 1 second to ensure the token's iat is before tokensValidAfter
		await new Promise((resolve) => setTimeout(resolve, 1100));

		// Enable MFA for the user
		const qrResponse = await testServer.authAgentFor(user).get('/mfa/qr').expect(200);
		const { secret } = qrResponse.body.data;
		const mfaCode = new TOTPService().generateTOTP(secret);
		await testServer.authAgentFor(user).post('/mfa/enable').send({ mfaCode }).expect(200);

		// Refresh user object after MFA is enabled
		user = await Container.get(UserRepository).findOneOrFail({
			where: { id: user.id },
			relations: ['role'],
		});
		expect(user.mfaEnabled).toBe(true);
		expect(user.mfaSecret).not.toBe(null);

		// Now disable MFA using the updated user
		const newMfaCode = new TOTPService().generateTOTP(secret);
		await testServer
			.authAgentFor(user)
			.post('/mfa/disable')
			.send({ mfaCode: newMfaCode })
			.expect(200);

		// Verify MFA is disabled
		user = await Container.get(UserRepository).findOneOrFail({
			where: { id: user.id },
			relations: ['role'],
		});
		expect(user.mfaEnabled).toBe(false);
		expect(user.mfaSecret).toBe(null);

		// The pre-MFA token's hash was: hash(email:password)
		// After MFA is disabled, the new hash is also: hash(email:password)
		// The hashes would match, but tokensValidAfter is now set to the current time,
		// so all tokens issued before MFA was disabled are rejected
		const response = await request(testServer.app)
			.patch('/rest/me/settings')
			.send({})
			.set('Cookie', `${AUTH_COOKIE_NAME}=${preMfaToken}`)
			.set('browser-id', testBrowserId);

		// With tokensValidAfter, even pre-MFA tokens are now properly invalidated
		expect(response.status).toBe(401);
	});
});

describe('Change password with MFA enabled', () => {
	test('POST /change-password should fail due to missing MFA code', async () => {
		await createUserWithMfaEnabled();

		const newPassword = randomValidPassword();
		const resetPasswordToken = uniqueId();

		await testServer.authlessAgent
			.post('/change-password')
			.send({ password: newPassword, token: resetPasswordToken })
			.expect(404);
	});

	test('POST /change-password should fail due to invalid MFA code', async () => {
		await createUserWithMfaEnabled();

		const newPassword = randomValidPassword();
		const resetPasswordToken = uniqueId();

		await testServer.authlessAgent
			.post('/change-password')
			.send({
				password: newPassword,
				token: resetPasswordToken,
				mfaCode: randomString(10),
			})
			.expect(404);
	});

	test('POST /change-password should update password', async () => {
		const { user, rawSecret } = await createUserWithMfaEnabled();

		const newPassword = randomValidPassword();

		config.set('userManagement.jwtSecret', randomString(5, 10));

		const resetPasswordToken = Container.get(AuthService).generatePasswordResetToken(user);

		const mfaCode = new TOTPService().generateTOTP(rawSecret);

		await testServer.authlessAgent
			.post('/change-password')
			.send({
				password: newPassword,
				token: resetPasswordToken,
				mfaCode,
			})
			.expect(200);

		const loginResponse = await testServer
			.authAgentFor(user)
			.post('/login')
			.send({
				emailOrLdapLoginId: user.email,
				password: newPassword,
				mfaCode: new TOTPService().generateTOTP(rawSecret),
			})
			.expect(200);

		expect(loginResponse.body).toHaveProperty('data');
	});
});

describe('MFA before enable checks', () => {
	test('POST /can-enable should throw error if mfa.beforeSetup returns error', async () => {
		externalHooks.run.mockRejectedValue(new BadRequestError('Error message'));

		await testServer.authAgentFor(owner).post('/mfa/can-enable').expect(400);

		expect(externalHooks.run).toHaveBeenCalledWith('mfa.beforeSetup', [
			expect.objectContaining(owner),
		]);
	});

	test('POST /can-enable should not throw error if mfa.beforeSetup does not exist', async () => {
		externalHooks.run.mockResolvedValue(undefined);

		await testServer.authAgentFor(owner).post('/mfa/can-enable').expect(200);

		expect(externalHooks.run).toHaveBeenCalledWith('mfa.beforeSetup', [
			expect.objectContaining(owner),
		]);
	});
});

describe('Login', () => {
	test('POST /login with email/password should succeed when mfa is disabled', async () => {
		const password = randomString(8);

		const user = await createUser({ password });

		await testServer.authlessAgent
			.post('/login')
			.send({ emailOrLdapLoginId: user.email, password })
			.expect(200);
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
			.send({ emailOrLdapLoginId: user.email, password: rawPassword })
			.expect(401);
	});

	describe('Login with MFA token', () => {
		test('POST /login should fail due to invalid MFA token', async () => {
			const { user, rawPassword } = await createUserWithMfaEnabled();

			await testServer.authlessAgent
				.post('/login')
				.send({ emailOrLdapLoginId: user.email, password: rawPassword, mfaCode: 'wrongvalue' })
				.expect(401);
		});

		test('POST /login should fail due two MFA step needed', async () => {
			const { user, rawPassword } = await createUserWithMfaEnabled();

			const response = await testServer.authlessAgent
				.post('/login')
				.send({ emailOrLdapLoginId: user.email, password: rawPassword })
				.expect(401);

			expect(response.body.code).toBe(998);
		});

		test('POST /login should succeed with MFA token', async () => {
			const { user, rawSecret, rawPassword } = await createUserWithMfaEnabled();

			const token = new TOTPService().generateTOTP(rawSecret);

			const response = await testServer.authlessAgent
				.post('/login')
				.send({ emailOrLdapLoginId: user.email, password: rawPassword, mfaCode: token })
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
				.send({
					emailOrLdapLoginId: user.email,
					password: rawPassword,
					mfaRecoveryCode: 'wrongvalue',
				})
				.expect(401);
		});

		test('POST /login should succeed with MFA recovery code', async () => {
			const { user, rawPassword, rawRecoveryCodes } = await createUserWithMfaEnabled();

			const response = await testServer.authlessAgent
				.post('/login')
				.send({
					emailOrLdapLoginId: user.email,
					password: rawPassword,
					mfaRecoveryCode: rawRecoveryCodes[0],
				})
				.expect(200);

			const data = response.body.data;
			expect(data.mfaEnabled).toBe(true);

			const dbUser = await Container.get(UserRepository).findOneOrFail({
				where: { id: user.id },
			});

			// Make sure the recovery code used was removed
			expect(dbUser.mfaRecoveryCodes.length).toBe(rawRecoveryCodes.length - 1);
			expect(dbUser.mfaRecoveryCodes.includes(rawRecoveryCodes[0])).toBe(false);
		});
	});
});

describe('Enforce MFA', () => {
	test('Enforce MFA for the instance', async () => {
		const settingsRepository = Container.get(SettingsRepository);
		const cacheService = Container.get(CacheService);

		await settingsRepository.delete({
			key: MFA_ENFORCE_SETTING,
		});

		await cacheService.delete(MFA_CACHE_KEY);

		let enforced = await settingsRepository.findByKey(MFA_ENFORCE_SETTING);

		let enforcedCache = await cacheService.get(MFA_CACHE_KEY);

		expect(enforced).toBe(null);
		expect(enforcedCache).toBe(undefined);

		owner.mfaEnabled = true;
		await testServer
			.authAgentFor(owner)
			.post('/mfa/enforce-mfa')
			.send({ enforce: true })
			.expect(200);
		owner.mfaEnabled = false;

		enforced = await settingsRepository.findByKey(MFA_ENFORCE_SETTING);
		enforcedCache = await cacheService.get(MFA_CACHE_KEY);

		expect(enforced?.value).toBe('true');
		expect(enforcedCache).toBe('true');

		await settingsRepository.delete({
			key: MFA_ENFORCE_SETTING,
		});
		await cacheService.delete(MFA_CACHE_KEY);
	});

	test('Disable MFA for the instance', async () => {
		const settingsRepository = Container.get(SettingsRepository);
		const cacheService = Container.get(CacheService);

		await settingsRepository.save({
			key: MFA_ENFORCE_SETTING,
			value: 'true',
			loadOnStartup: true,
		});

		await cacheService.set(MFA_CACHE_KEY, 'true');

		let enforced = await settingsRepository.findByKey(MFA_ENFORCE_SETTING);
		let enforcedCache = await cacheService.get(MFA_CACHE_KEY);

		expect(enforced?.value).toBe('true');
		expect(enforcedCache).toBe('true');

		owner.mfaEnabled = true;
		await testServer
			.authAgentFor(owner)
			.post('/mfa/enforce-mfa')
			.send({ enforce: false })
			.expect(200);
		owner.mfaEnabled = false;

		enforced = await settingsRepository.findByKey(MFA_ENFORCE_SETTING);
		enforcedCache = await cacheService.get(MFA_CACHE_KEY);

		expect(enforced?.value).toBe('false');
		expect(enforcedCache).toBe('false');

		await settingsRepository.delete({
			key: MFA_ENFORCE_SETTING,
		});
		await cacheService.delete(MFA_CACHE_KEY);
	});

	test('User without MFA should be able to access MFA setup endpoints when enforcement is enabled', async () => {
		const settingsRepository = Container.get(SettingsRepository);

		// Enable MFA enforcement as owner with MFA
		owner.mfaEnabled = true;
		await testServer
			.authAgentFor(owner)
			.post('/mfa/enforce-mfa')
			.send({ enforce: true })
			.expect(200);
		owner.mfaEnabled = false;

		// Create a regular user without MFA
		const user = await createUser();

		// User should be able to access /mfa/qr to get QR code and secret
		const qrResponse = await testServer.authAgentFor(user).get('/mfa/qr').expect(200);

		const { secret } = qrResponse.body.data;
		expect(secret).toBeDefined();

		// User should be able to verify MFA code
		const mfaCode = new TOTPService().generateTOTP(secret);
		await testServer.authAgentFor(user).post('/mfa/verify').send({ mfaCode }).expect(200);

		// User should be able to enable MFA
		await testServer.authAgentFor(user).post('/mfa/enable').send({ mfaCode }).expect(200);

		// Verify MFA was enabled for the user
		const updatedUser = await Container.get(UserRepository).findOneOrFail({
			where: { id: user.id },
		});
		expect(updatedUser.mfaEnabled).toBe(true);

		// Clean up
		await settingsRepository.delete({
			key: MFA_ENFORCE_SETTING,
		});
	});

	test('User without MFA should be blocked from regular endpoints when enforcement is enabled', async () => {
		const settingsRepository = Container.get(SettingsRepository);

		// Enable MFA enforcement
		owner.mfaEnabled = true;
		await testServer
			.authAgentFor(owner)
			.post('/mfa/enforce-mfa')
			.send({ enforce: true })
			.expect(200);
		owner.mfaEnabled = false;

		// Create a regular user without MFA
		const user = await createUser();

		// User should be blocked from accessing change password endpoint
		const response = await testServer
			.authAgentFor(user)
			.patch('/me/password')
			.send({ currentPassword: 'password', newPassword: 'newPassword123!' })
			.expect(401);

		expect(response.body.message).toBe('Unauthorized');
		expect(response.body.mfaRequired).toBe(true);

		// Clean up
		await settingsRepository.delete({
			key: MFA_ENFORCE_SETTING,
		});
	});

	test('User with MFA enabled but not used should be blocked when enforcement is enabled', async () => {
		const settingsRepository = Container.get(SettingsRepository);

		// Enable MFA enforcement
		owner.mfaEnabled = true;
		await testServer
			.authAgentFor(owner)
			.post('/mfa/enforce-mfa')
			.send({ enforce: true })
			.expect(200);
		owner.mfaEnabled = false;

		// Create a user with MFA enabled
		const { user, rawPassword } = await createUserWithMfaEnabled();

		// Login without MFA code should fail with error code 998
		const loginResponse = await testServer.authlessAgent
			.post('/login')
			.send({ emailOrLdapLoginId: user.email, password: rawPassword })
			.expect(401);

		expect(loginResponse.body.code).toBe(998);

		// Clean up
		await settingsRepository.delete({
			key: MFA_ENFORCE_SETTING,
		});
	});
});
