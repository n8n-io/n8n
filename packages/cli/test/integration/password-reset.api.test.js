'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const bcryptjs_1 = require('bcryptjs');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const uuid_1 = require('uuid');
const auth_service_1 = require('@/auth/auth.service');
const config_1 = __importDefault(require('@/config'));
const external_hooks_1 = require('@/external-hooks');
const license_1 = require('@/license');
const jwt_service_1 = require('@/services/jwt.service');
const password_utility_1 = require('@/services/password.utility');
const sso_helpers_1 = require('@/sso.ee/sso-helpers');
const email_1 = require('@/user-management/email');
const users_1 = require('./shared/db/users');
const utils_1 = require('./shared/utils');
config_1.default.set('userManagement.jwtSecret', (0, n8n_workflow_1.randomString)(5, 10));
let owner;
let member;
const externalHooks = (0, backend_test_utils_1.mockInstance)(external_hooks_1.ExternalHooks);
const mailer = (0, backend_test_utils_1.mockInstance)(email_1.UserManagementMailer, {
	isEmailSetUp: true,
});
const testServer = (0, utils_1.setupTestServer)({ endpointGroups: ['passwordReset'] });
const jwtService = di_1.Container.get(jwt_service_1.JwtService);
let authService;
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['User']);
	owner = await (0, users_1.createUser)({ role: 'global:owner' });
	member = await (0, users_1.createUser)({ role: 'global:member' });
	externalHooks.run.mockReset();
	jest.replaceProperty(mailer, 'isEmailSetUp', true);
	authService = di_1.Container.get(auth_service_1.AuthService);
});
describe('POST /forgot-password', () => {
	test('should send password reset email', async () => {
		const member = await (0, users_1.createUser)({
			email: 'test@test.com',
			role: 'global:member',
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
		await (0, sso_helpers_1.setCurrentAuthenticationMethod)('saml');
		const member = await (0, users_1.createUser)({
			email: 'test@test.com',
			role: 'global:member',
		});
		await testServer.authlessAgent
			.post('/forgot-password')
			.send({ email: member.email })
			.expect(403);
		await (0, sso_helpers_1.setCurrentAuthenticationMethod)('email');
	});
	test('should succeed if SAML is authentication method and requestor is owner', async () => {
		await (0, sso_helpers_1.setCurrentAuthenticationMethod)('saml');
		const response = await testServer.authlessAgent
			.post('/forgot-password')
			.send({ email: owner.email });
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({});
		await (0, sso_helpers_1.setCurrentAuthenticationMethod)('email');
	});
	test('should fail with invalid inputs', async () => {
		const invalidPayloads = [
			(0, backend_test_utils_1.randomEmail)(),
			[(0, backend_test_utils_1.randomEmail)()],
			{},
			[{ name: (0, backend_test_utils_1.randomName)() }],
			[{ email: (0, backend_test_utils_1.randomName)() }],
		];
		for (const invalidPayload of invalidPayloads) {
			const response = await testServer.authlessAgent.post('/forgot-password').send(invalidPayload);
			expect(response.statusCode).toBe(400);
		}
	});
	test('should fail if user is not found', async () => {
		const response = await testServer.authlessAgent
			.post('/forgot-password')
			.send({ email: (0, backend_test_utils_1.randomEmail)() });
		expect(response.statusCode).toBe(200);
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
			.query({ token: (0, uuid_1.v4)() })
			.expect(404);
		await testServer.authlessAgent
			.get('/resolve-password-token')
			.query({ userId: owner.id })
			.expect(400);
	});
	test('should fail if user is not found', async () => {
		const token = jwtService.sign({ sub: (0, uuid_1.v4)() });
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
		const updatedUser = (0, jest_mock_extended_1.mock)({ ...owner, password: 'another-password' });
		const resetPasswordToken = authService.generatePasswordResetToken(updatedUser);
		const response = await testServer.authlessAgent
			.get('/resolve-password-token')
			.query({ userId: owner.id, token: resetPasswordToken });
		expect(response.statusCode).toBe(404);
	});
});
describe('POST /change-password', () => {
	const passwordToStore = (0, backend_test_utils_1.randomValidPassword)();
	test('should succeed with valid inputs', async () => {
		const resetPasswordToken = authService.generatePasswordResetToken(owner);
		const response = await testServer.authlessAgent.post('/change-password').send({
			token: resetPasswordToken,
			userId: owner.id,
			password: passwordToStore,
		});
		expect(response.statusCode).toBe(200);
		const authToken = (0, utils_1.getAuthToken)(response);
		expect(authToken).toBeDefined();
		const { password: storedPassword } = await di_1.Container.get(
			db_1.UserRepository,
		).findOneByOrFail({
			id: owner.id,
		});
		const comparisonResult = await di_1.Container.get(password_utility_1.PasswordUtility).compare(
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
			{ token: (0, uuid_1.v4)() },
			{ id: owner.id },
			{ password: (0, backend_test_utils_1.randomValidPassword)() },
			{ token: (0, uuid_1.v4)(), id: owner.id },
			{ token: (0, uuid_1.v4)(), password: (0, backend_test_utils_1.randomValidPassword)() },
			{ id: owner.id, password: (0, backend_test_utils_1.randomValidPassword)() },
			{
				id: owner.id,
				password: (0, backend_test_utils_1.randomInvalidPassword)(),
				token: resetPasswordToken,
			},
			{
				id: owner.id,
				password: (0, backend_test_utils_1.randomValidPassword)(),
				token: (0, uuid_1.v4)(),
			},
		];
		for (const invalidPayload of invalidPayloads) {
			const response = await testServer.authlessAgent
				.post('/change-password')
				.query(invalidPayload);
			expect(response.statusCode).toBe(400);
			const { password: storedPassword } = await di_1.Container.get(
				db_1.UserRepository,
			).findOneByOrFail({
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
		jest.spyOn(di_1.Container.get(license_1.License), 'getUsersLimit').mockReturnValueOnce(1);
		const resetPasswordToken = authService.generatePasswordResetToken(owner);
		const response = await testServer.authlessAgent.post('/change-password').send({
			token: resetPasswordToken,
			userId: owner.id,
			password: passwordToStore,
		});
		expect(response.statusCode).toBe(200);
		const authToken = (0, utils_1.getAuthToken)(response);
		expect(authToken).toBeDefined();
		const { password: storedPassword } = await di_1.Container.get(
			db_1.UserRepository,
		).findOneByOrFail({
			id: owner.id,
		});
		const comparisonResult = await (0, bcryptjs_1.compare)(passwordToStore, storedPassword);
		expect(comparisonResult).toBe(true);
		expect(storedPassword).not.toBe(passwordToStore);
		expect(externalHooks.run).toHaveBeenCalledWith('user.password.update', [
			owner.email,
			storedPassword,
		]);
	});
	test('member should not be able to reset its password when quota:users = 1', async () => {
		jest.spyOn(di_1.Container.get(license_1.License), 'getUsersLimit').mockReturnValueOnce(1);
		const resetPasswordToken = authService.generatePasswordResetToken(member);
		const response = await testServer.authlessAgent.post('/change-password').send({
			token: resetPasswordToken,
			userId: member.id,
			password: passwordToStore,
		});
		expect(response.statusCode).toBe(403);
	});
});
//# sourceMappingURL=password-reset.api.test.js.map
