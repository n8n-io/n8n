'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const constants_1 = require('@n8n/constants');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const auth_service_1 = require('@/auth/auth.service');
const config_1 = __importDefault(require('@/config'));
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const external_hooks_1 = require('@/external-hooks');
const constants_2 = require('@/mfa/constants');
const totp_service_1 = require('@/mfa/totp.service');
const users_1 = require('../shared/db/users');
const utils = __importStar(require('../shared/utils'));
jest.mock('@/telemetry');
let owner;
const externalHooks = (0, backend_test_utils_1.mockInstance)(external_hooks_1.ExternalHooks);
const testServer = utils.setupTestServer({
	endpointGroups: ['mfa', 'auth', 'me', 'passwordReset'],
	enabledFeatures: [constants_1.LICENSE_FEATURES.MFA_ENFORCEMENT],
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['User']);
	owner = await (0, users_1.createOwner)();
	externalHooks.run.mockReset();
	config_1.default.set('userManagement.disabled', false);
});
afterAll(async () => {
	await backend_test_utils_1.testDb.terminate();
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
			const mfaCode = new totp_service_1.TOTPService().generateTOTP(firstCall.body.data.secret);
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
			const mfaCode = new totp_service_1.TOTPService().generateTOTP(secret);
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
			const mfaCode = new totp_service_1.TOTPService().generateTOTP(secret);
			await testServer.authAgentFor(owner).post('/mfa/verify').send({ mfaCode }).expect(200);
			await testServer.authAgentFor(owner).post('/mfa/enable').send({ mfaCode }).expect(200);
			const user = await di_1.Container.get(db_1.UserRepository).findOneOrFail({
				where: {},
			});
			expect(user.mfaEnabled).toBe(true);
			expect(user.mfaRecoveryCodes).toBeDefined();
			expect(user.mfaSecret).toBeDefined();
		});
		test('POST /enable should not enable MFA if pre check fails', async () => {
			const response = await testServer.authAgentFor(owner).get('/mfa/qr').expect(200);
			const { secret } = response.body.data;
			const mfaCode = new totp_service_1.TOTPService().generateTOTP(secret);
			await testServer.authAgentFor(owner).post('/mfa/verify').send({ mfaCode }).expect(200);
			externalHooks.run.mockRejectedValue(new bad_request_error_1.BadRequestError('Error message'));
			await testServer.authAgentFor(owner).post('/mfa/enable').send({ mfaCode }).expect(400);
			const user = await di_1.Container.get(db_1.UserRepository).findOneOrFail({
				where: {},
			});
			expect(user.mfaEnabled).toBe(false);
		});
	});
});
describe('Disable MFA setup', () => {
	test('POST /disable should disable login with MFA', async () => {
		const { user, rawSecret } = await (0, users_1.createUserWithMfaEnabled)();
		const mfaCode = new totp_service_1.TOTPService().generateTOTP(rawSecret);
		await testServer
			.authAgentFor(user)
			.post('/mfa/disable')
			.send({
				mfaCode,
			})
			.expect(200);
		const dbUser = await di_1.Container.get(db_1.UserRepository).findOneOrFail({
			where: { id: user.id },
		});
		expect(dbUser.mfaEnabled).toBe(false);
		expect(dbUser.mfaSecret).toBe(null);
		expect(dbUser.mfaRecoveryCodes.length).toBe(0);
	});
	test('POST /disable should fail if invalid MFA recovery code is given', async () => {
		const { user } = await (0, users_1.createUserWithMfaEnabled)();
		await testServer
			.authAgentFor(user)
			.post('/mfa/disable')
			.send({
				mfaRecoveryCode: 'invalid token',
			})
			.expect(403);
	});
	test('POST /disable should fail if invalid MFA code is given', async () => {
		const { user } = await (0, users_1.createUserWithMfaEnabled)();
		await testServer
			.authAgentFor(user)
			.post('/mfa/disable')
			.send({
				mfaCode: 'invalid token',
			})
			.expect(403);
	});
	test('POST /disable should fail if neither MFA code nor recovery code is sent', async () => {
		const { user } = await (0, users_1.createUserWithMfaEnabled)();
		await testServer.authAgentFor(user).post('/mfa/disable').send({ anotherParam: '' }).expect(400);
	});
});
describe('Change password with MFA enabled', () => {
	test('POST /change-password should fail due to missing MFA code', async () => {
		await (0, users_1.createUserWithMfaEnabled)();
		const newPassword = (0, backend_test_utils_1.randomValidPassword)();
		const resetPasswordToken = (0, backend_test_utils_1.uniqueId)();
		await testServer.authlessAgent
			.post('/change-password')
			.send({ password: newPassword, token: resetPasswordToken })
			.expect(404);
	});
	test('POST /change-password should fail due to invalid MFA code', async () => {
		await (0, users_1.createUserWithMfaEnabled)();
		const newPassword = (0, backend_test_utils_1.randomValidPassword)();
		const resetPasswordToken = (0, backend_test_utils_1.uniqueId)();
		await testServer.authlessAgent
			.post('/change-password')
			.send({
				password: newPassword,
				token: resetPasswordToken,
				mfaCode: (0, n8n_workflow_1.randomString)(10),
			})
			.expect(404);
	});
	test('POST /change-password should update password', async () => {
		const { user, rawSecret } = await (0, users_1.createUserWithMfaEnabled)();
		const newPassword = (0, backend_test_utils_1.randomValidPassword)();
		config_1.default.set('userManagement.jwtSecret', (0, n8n_workflow_1.randomString)(5, 10));
		const resetPasswordToken = di_1.Container.get(
			auth_service_1.AuthService,
		).generatePasswordResetToken(user);
		const mfaCode = new totp_service_1.TOTPService().generateTOTP(rawSecret);
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
				mfaCode: new totp_service_1.TOTPService().generateTOTP(rawSecret),
			})
			.expect(200);
		expect(loginResponse.body).toHaveProperty('data');
	});
});
describe('MFA before enable checks', () => {
	test('POST /can-enable should throw error if mfa.beforeSetup returns error', async () => {
		externalHooks.run.mockRejectedValue(new bad_request_error_1.BadRequestError('Error message'));
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
		const password = (0, n8n_workflow_1.randomString)(8);
		const user = await (0, users_1.createUser)({ password });
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
		const { user, rawPassword } = await (0, users_1.createUserWithMfaEnabled)();
		await testServer.authlessAgent
			.post('/login')
			.send({ emailOrLdapLoginId: user.email, password: rawPassword })
			.expect(401);
	});
	describe('Login with MFA token', () => {
		test('POST /login should fail due to invalid MFA token', async () => {
			const { user, rawPassword } = await (0, users_1.createUserWithMfaEnabled)();
			await testServer.authlessAgent
				.post('/login')
				.send({ emailOrLdapLoginId: user.email, password: rawPassword, mfaCode: 'wrongvalue' })
				.expect(401);
		});
		test('POST /login should fail due two MFA step needed', async () => {
			const { user, rawPassword } = await (0, users_1.createUserWithMfaEnabled)();
			const response = await testServer.authlessAgent
				.post('/login')
				.send({ emailOrLdapLoginId: user.email, password: rawPassword })
				.expect(401);
			expect(response.body.code).toBe(998);
		});
		test('POST /login should succeed with MFA token', async () => {
			const { user, rawSecret, rawPassword } = await (0, users_1.createUserWithMfaEnabled)();
			const token = new totp_service_1.TOTPService().generateTOTP(rawSecret);
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
			const { user, rawPassword } = await (0, users_1.createUserWithMfaEnabled)();
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
			const { user, rawPassword, rawRecoveryCodes } = await (0, users_1.createUserWithMfaEnabled)();
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
			const dbUser = await di_1.Container.get(db_1.UserRepository).findOneOrFail({
				where: { id: user.id },
			});
			expect(dbUser.mfaRecoveryCodes.length).toBe(rawRecoveryCodes.length - 1);
			expect(dbUser.mfaRecoveryCodes.includes(rawRecoveryCodes[0])).toBe(false);
		});
	});
});
describe('Enforce MFA', () => {
	test('Enforce MFA for the instance', async () => {
		const settingsRepository = di_1.Container.get(db_1.SettingsRepository);
		await settingsRepository.delete({
			key: constants_2.MFA_ENFORCE_SETTING,
		});
		let enforced = await settingsRepository.findByKey(constants_2.MFA_ENFORCE_SETTING);
		expect(enforced).toBe(null);
		owner.mfaEnabled = true;
		await testServer
			.authAgentFor(owner)
			.post('/mfa/enforce-mfa')
			.send({ enforce: true })
			.expect(200);
		owner.mfaEnabled = false;
		enforced = await settingsRepository.findByKey(constants_2.MFA_ENFORCE_SETTING);
		expect(enforced?.value).toBe('true');
		await settingsRepository.delete({
			key: constants_2.MFA_ENFORCE_SETTING,
		});
	});
	test('Disable MFA for the instance', async () => {
		const settingsRepository = di_1.Container.get(db_1.SettingsRepository);
		await settingsRepository.delete({
			key: constants_2.MFA_ENFORCE_SETTING,
		});
		let enforced = await settingsRepository.findByKey(constants_2.MFA_ENFORCE_SETTING);
		expect(enforced).toBe(null);
		owner.mfaEnabled = true;
		await testServer
			.authAgentFor(owner)
			.post('/mfa/enforce-mfa')
			.send({ enforce: false })
			.expect(200);
		owner.mfaEnabled = false;
		enforced = await settingsRepository.findByKey(constants_2.MFA_ENFORCE_SETTING);
		expect(enforced?.value).toBe('false');
		await settingsRepository.delete({
			key: constants_2.MFA_ENFORCE_SETTING,
		});
	});
});
//# sourceMappingURL=mfa.api.test.js.map
