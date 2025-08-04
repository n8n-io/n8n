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
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const validator_1 = __importDefault(require('validator'));
const config_1 = __importDefault(require('@/config'));
const constants_1 = require('@/constants');
const mfa_service_1 = require('@/mfa/mfa.service');
const constants_2 = require('./shared/constants');
const users_1 = require('./shared/db/users');
const utils = __importStar(require('./shared/utils/'));
let owner;
let authOwnerAgent;
const ownerPassword = (0, backend_test_utils_1.randomValidPassword)();
const testServer = utils.setupTestServer({ endpointGroups: ['auth'] });
const license = testServer.license;
let mfaService;
beforeAll(async () => {
	mfaService = di_1.Container.get(mfa_service_1.MfaService);
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['User']);
	config_1.default.set('ldap.disabled', true);
	await utils.setInstanceOwnerSetUp(true);
});
describe('POST /login', () => {
	beforeEach(async () => {
		owner = await (0, users_1.createUser)({
			password: ownerPassword,
			role: 'global:owner',
		});
	});
	test('should log user in', async () => {
		const response = await testServer.authlessAgent.post('/login').send({
			emailOrLdapLoginId: owner.email,
			password: ownerPassword,
		});
		expect(response.statusCode).toBe(200);
		const {
			id,
			email,
			firstName,
			lastName,
			password,
			personalizationAnswers,
			role,
			apiKey,
			globalScopes,
			mfaSecret,
			mfaRecoveryCodes,
		} = response.body.data;
		expect(validator_1.default.isUUID(id)).toBe(true);
		expect(email).toBe(owner.email);
		expect(firstName).toBe(owner.firstName);
		expect(lastName).toBe(owner.lastName);
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(role).toBe('global:owner');
		expect(apiKey).toBeUndefined();
		expect(globalScopes).toBeDefined();
		expect(mfaRecoveryCodes).toBeUndefined();
		expect(mfaSecret).toBeUndefined();
		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeDefined();
	});
	test('should log user with MFA enabled', async () => {
		const secret = 'test';
		const recoveryCodes = ['1'];
		await mfaService.saveSecretAndRecoveryCodes(owner.id, secret, recoveryCodes);
		await mfaService.enableMfa(owner.id);
		const response = await testServer.authlessAgent.post('/login').send({
			emailOrLdapLoginId: owner.email,
			password: ownerPassword,
			mfaCode: mfaService.totp.generateTOTP(secret),
		});
		expect(response.statusCode).toBe(200);
		const {
			id,
			email,
			firstName,
			lastName,
			password,
			personalizationAnswers,
			role,
			apiKey,
			mfaRecoveryCodes,
			mfaSecret,
		} = response.body.data;
		expect(validator_1.default.isUUID(id)).toBe(true);
		expect(email).toBe(owner.email);
		expect(firstName).toBe(owner.firstName);
		expect(lastName).toBe(owner.lastName);
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(role).toBe('global:owner');
		expect(apiKey).toBeUndefined();
		expect(mfaRecoveryCodes).toBeUndefined();
		expect(mfaSecret).toBeUndefined();
		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeDefined();
	});
	test('should throw AuthError for non-owner if not within users limit quota', async () => {
		license.setQuota('quota:users', 0);
		const password = 'testpassword';
		const member = await (0, users_1.createUser)({
			password,
		});
		const response = await testServer.authlessAgent.post('/login').send({
			emailOrLdapLoginId: member.email,
			password,
		});
		expect(response.statusCode).toBe(403);
	});
	test('should not throw AuthError for owner if not within users limit quota', async () => {
		license.setQuota('quota:users', 0);
		const ownerUser = await (0, users_1.createUser)({
			password: (0, backend_test_utils_1.randomValidPassword)(),
			role: 'global:owner',
		});
		const response = await testServer.authAgentFor(ownerUser).get('/login');
		expect(response.statusCode).toBe(200);
	});
	test('should fail with invalid email in the payload is the current authentication method is "email"', async () => {
		config_1.default.set('userManagement.authenticationMethod', 'email');
		const response = await testServer.authlessAgent.post('/login').send({
			emailOrLdapLoginId: 'invalid-email',
			password: ownerPassword,
		});
		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe('Invalid email address');
	});
});
describe('GET /login', () => {
	test('should return 401 Unauthorized if no cookie', async () => {
		const response = await testServer.authlessAgent.get('/login');
		expect(response.statusCode).toBe(401);
		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});
	test('should return 401 Unauthorized if invalid cookie', async () => {
		testServer.authlessAgent.jar.setCookie(`${constants_1.AUTH_COOKIE_NAME}=invalid`);
		const response = await testServer.authlessAgent.get('/login');
		expect(response.statusCode).toBe(401);
		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});
	test('should return logged-in owner shell', async () => {
		const ownerShell = await (0, users_1.createUserShell)('global:owner');
		const response = await testServer.authAgentFor(ownerShell).get('/login');
		expect(response.statusCode).toBe(200);
		const {
			id,
			email,
			firstName,
			lastName,
			password,
			personalizationAnswers,
			role,
			apiKey,
			globalScopes,
		} = response.body.data;
		expect(validator_1.default.isUUID(id)).toBe(true);
		expect(email).toBeDefined();
		expect(firstName).toBeNull();
		expect(lastName).toBeNull();
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(role).toBe('global:owner');
		expect(apiKey).toBeUndefined();
		expect(globalScopes).toBeDefined();
		expect(globalScopes).toContain('workflow:read');
		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});
	test('should return logged-in member shell', async () => {
		const memberShell = await (0, users_1.createUserShell)('global:member');
		const response = await testServer.authAgentFor(memberShell).get('/login');
		expect(response.statusCode).toBe(200);
		const {
			id,
			email,
			firstName,
			lastName,
			password,
			personalizationAnswers,
			role,
			apiKey,
			globalScopes,
		} = response.body.data;
		expect(validator_1.default.isUUID(id)).toBe(true);
		expect(email).toBeDefined();
		expect(firstName).toBeNull();
		expect(lastName).toBeNull();
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(role).toBe('global:member');
		expect(apiKey).toBeUndefined();
		expect(globalScopes).toBeDefined();
		expect(globalScopes).not.toContain('workflow:read');
		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});
	test('should return logged-in owner', async () => {
		const owner = await (0, users_1.createUser)({ role: 'global:owner' });
		const response = await testServer.authAgentFor(owner).get('/login');
		expect(response.statusCode).toBe(200);
		const {
			id,
			email,
			firstName,
			lastName,
			password,
			personalizationAnswers,
			role,
			apiKey,
			globalScopes,
		} = response.body.data;
		expect(validator_1.default.isUUID(id)).toBe(true);
		expect(email).toBe(owner.email);
		expect(firstName).toBe(owner.firstName);
		expect(lastName).toBe(owner.lastName);
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(role).toBe('global:owner');
		expect(apiKey).toBeUndefined();
		expect(globalScopes).toBeDefined();
		expect(globalScopes).toContain('workflow:read');
		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});
	test('should return logged-in member', async () => {
		const member = await (0, users_1.createUser)({ role: 'global:member' });
		const response = await testServer.authAgentFor(member).get('/login');
		expect(response.statusCode).toBe(200);
		const {
			id,
			email,
			firstName,
			lastName,
			password,
			personalizationAnswers,
			role,
			apiKey,
			globalScopes,
		} = response.body.data;
		expect(validator_1.default.isUUID(id)).toBe(true);
		expect(email).toBe(member.email);
		expect(firstName).toBe(member.firstName);
		expect(lastName).toBe(member.lastName);
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(role).toBe('global:member');
		expect(apiKey).toBeUndefined();
		expect(globalScopes).toBeDefined();
		expect(globalScopes).not.toContain('workflow:read');
		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});
});
describe('GET /resolve-signup-token', () => {
	beforeEach(async () => {
		owner = await (0, users_1.createUser)({
			password: ownerPassword,
			role: 'global:owner',
		});
		authOwnerAgent = testServer.authAgentFor(owner);
	});
	test('should validate invite token', async () => {
		const memberShell = await (0, users_1.createUserShell)('global:member');
		const response = await authOwnerAgent
			.get('/resolve-signup-token')
			.query({ inviterId: owner.id })
			.query({ inviteeId: memberShell.id });
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			data: {
				inviter: {
					firstName: owner.firstName,
					lastName: owner.lastName,
				},
			},
		});
	});
	test('should return 403 if user quota reached', async () => {
		license.setQuota('quota:users', 0);
		const memberShell = await (0, users_1.createUserShell)('global:member');
		const response = await authOwnerAgent
			.get('/resolve-signup-token')
			.query({ inviterId: owner.id })
			.query({ inviteeId: memberShell.id });
		expect(response.statusCode).toBe(403);
	});
	test('should fail with invalid inputs', async () => {
		const { id: inviteeId } = await (0, users_1.createUser)({ role: 'global:member' });
		const first = await authOwnerAgent.get('/resolve-signup-token').query({ inviterId: owner.id });
		const second = await authOwnerAgent.get('/resolve-signup-token').query({ inviteeId });
		const third = await authOwnerAgent.get('/resolve-signup-token').query({
			inviterId: '5531199e-b7ae-425b-a326-a95ef8cca59d',
			inviteeId: 'cb133beb-7729-4c34-8cd1-a06be8834d9d',
		});
		const fourth = await authOwnerAgent
			.get('/resolve-signup-token')
			.query({ inviterId: owner.id })
			.query({ inviteeId });
		owner.email = '';
		await di_1.Container.get(db_1.UserRepository).save(owner);
		const fifth = await authOwnerAgent
			.get('/resolve-signup-token')
			.query({ inviterId: owner.id })
			.query({ inviteeId });
		for (const response of [first, second, third, fourth, fifth]) {
			expect(response.statusCode).toBe(400);
		}
	});
});
describe('POST /logout', () => {
	test('should log user out', async () => {
		const owner = await (0, users_1.createUser)({ role: 'global:owner' });
		const ownerAgent = testServer.authAgentFor(owner);
		const cookie = ownerAgent.jar.getCookie(constants_1.AUTH_COOKIE_NAME, { path: '/' });
		const response = await ownerAgent.post('/logout');
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(constants_2.LOGGED_OUT_RESPONSE_BODY);
		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
		ownerAgent.jar.setCookie(`${constants_1.AUTH_COOKIE_NAME}=${cookie.value}`);
		await ownerAgent.get('/login').expect(401);
	});
});
//# sourceMappingURL=auth.api.test.js.map
