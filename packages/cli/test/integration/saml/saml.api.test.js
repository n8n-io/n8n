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
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const saml_helpers_1 = require('@/sso.ee/saml/saml-helpers');
const sso_helpers_1 = require('@/sso.ee/sso-helpers');
const sample_metadata_1 = require('./sample-metadata');
const users_1 = require('../shared/db/users');
const utils = __importStar(require('../shared/utils/'));
let someUser;
let owner;
let authMemberAgent;
let authOwnerAgent;
async function enableSaml(enable) {
	await (0, saml_helpers_1.setSamlLoginEnabled)(enable);
}
const testServer = utils.setupTestServer({
	endpointGroups: ['me', 'saml'],
	enabledFeatures: ['feat:saml'],
});
const memberPassword = (0, backend_test_utils_1.randomValidPassword)();
beforeAll(async () => {
	owner = await (0, users_1.createOwner)();
	someUser = await (0, users_1.createUser)({ password: memberPassword });
	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(someUser);
	di_1.Container.get(config_1.GlobalConfig).sso.saml.loginEnabled = true;
});
beforeEach(async () => await enableSaml(false));
describe('Instance owner', () => {
	describe('PATCH /me', () => {
		test('should succeed with valid inputs', async () => {
			await enableSaml(false);
			await authOwnerAgent
				.patch('/me')
				.send({
					email: (0, backend_test_utils_1.randomEmail)(),
					firstName: (0, backend_test_utils_1.randomName)(),
					lastName: (0, backend_test_utils_1.randomName)(),
					password: (0, backend_test_utils_1.randomValidPassword)(),
				})
				.expect(200);
		});
		test('should throw BadRequestError if email is changed when SAML is enabled', async () => {
			await enableSaml(true);
			await authOwnerAgent
				.patch('/me')
				.send({
					email: (0, backend_test_utils_1.randomEmail)(),
					firstName: (0, backend_test_utils_1.randomName)(),
					lastName: (0, backend_test_utils_1.randomName)(),
				})
				.expect(400, { code: 400, message: 'SAML user may not change their email' });
		});
	});
	describe('PATCH /password', () => {
		test('should throw BadRequestError if password is changed when SAML is enabled', async () => {
			await enableSaml(true);
			await authMemberAgent
				.patch('/me/password')
				.send({
					currentPassword: memberPassword,
					newPassword: (0, backend_test_utils_1.randomValidPassword)(),
				})
				.expect(400, {
					code: 400,
					message: 'With SAML enabled, users need to use their SAML provider to change passwords',
				});
		});
	});
	describe('POST /sso/saml/config', () => {
		test('should post saml config', async () => {
			await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sample_metadata_1.sampleConfig,
					loginEnabled: true,
				})
				.expect(200);
			expect((0, sso_helpers_1.getCurrentAuthenticationMethod)()).toBe('saml');
		});
		test('should return 400 on invalid config', async () => {
			await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sample_metadata_1.sampleConfig,
					loginBinding: 'invalid',
				})
				.expect(400);
			expect((0, sso_helpers_1.getCurrentAuthenticationMethod)()).toBe('email');
		});
	});
	describe('POST /sso/saml/config/toggle', () => {
		test('should toggle saml as default authentication method', async () => {
			await enableSaml(true);
			expect((0, sso_helpers_1.getCurrentAuthenticationMethod)()).toBe('saml');
			await authOwnerAgent
				.post('/sso/saml/config/toggle')
				.send({
					loginEnabled: false,
				})
				.expect(200);
			expect((0, sso_helpers_1.getCurrentAuthenticationMethod)()).toBe('email');
			await authOwnerAgent
				.post('/sso/saml/config/toggle')
				.send({
					loginEnabled: true,
				})
				.expect(200);
			expect((0, sso_helpers_1.getCurrentAuthenticationMethod)()).toBe('saml');
		});
	});
	describe('POST /sso/saml/config/toggle', () => {
		test('should fail enable saml if default authentication is not email', async () => {
			await enableSaml(true);
			await authOwnerAgent
				.post('/sso/saml/config/toggle')
				.send({
					loginEnabled: false,
				})
				.expect(200);
			expect((0, sso_helpers_1.getCurrentAuthenticationMethod)()).toBe('email');
			await (0, sso_helpers_1.setCurrentAuthenticationMethod)('ldap');
			expect((0, sso_helpers_1.getCurrentAuthenticationMethod)()).toBe('ldap');
			await authOwnerAgent
				.post('/sso/saml/config/toggle')
				.send({
					loginEnabled: true,
				})
				.expect(500);
			expect((0, sso_helpers_1.getCurrentAuthenticationMethod)()).toBe('ldap');
			await (0, sso_helpers_1.setCurrentAuthenticationMethod)('saml');
		});
	});
});
describe('Check endpoint permissions', () => {
	beforeEach(async () => {
		await enableSaml(true);
	});
	describe('Owner', () => {
		test('should be able to access GET /sso/saml/metadata', async () => {
			await authOwnerAgent.get('/sso/saml/metadata').expect(200);
		});
		test('should be able to access GET /sso/saml/config', async () => {
			await authOwnerAgent.get('/sso/saml/config').expect(200);
		});
		test('should be able to access POST /sso/saml/config', async () => {
			await authOwnerAgent.post('/sso/saml/config').expect(200);
		});
		test('should be able to access POST /sso/saml/config/toggle', async () => {
			await authOwnerAgent.post('/sso/saml/config/toggle').expect(400);
		});
		test('should be able to access GET /sso/saml/acs', async () => {
			const response = await authOwnerAgent.get('/sso/saml/acs').expect(401);
			expect(response.text).toContain('SAML Authentication failed');
		});
		test('should be able to access POST /sso/saml/acs', async () => {
			const response = await authOwnerAgent.post('/sso/saml/acs').expect(401);
			expect(response.text).toContain('SAML Authentication failed');
		});
		test('should be able to access GET /sso/saml/initsso', async () => {
			await authOwnerAgent.get('/sso/saml/initsso').expect(200);
		});
		test('should be able to access GET /sso/saml/config/test', async () => {
			await authOwnerAgent.get('/sso/saml/config/test').expect(200);
		});
	});
	describe('Authenticated Member', () => {
		test('should be able to access GET /sso/saml/metadata', async () => {
			await authMemberAgent.get('/sso/saml/metadata').expect(200);
		});
		test('should be able to access GET /sso/saml/config', async () => {
			await authMemberAgent.get('/sso/saml/config').expect(200);
		});
		test('should NOT be able to access POST /sso/saml/config', async () => {
			await authMemberAgent.post('/sso/saml/config').expect(403);
		});
		test('should NOT be able to access POST /sso/saml/config/toggle', async () => {
			await authMemberAgent.post('/sso/saml/config/toggle').expect(403);
		});
		test('should be able to access GET /sso/saml/acs', async () => {
			const response = await authMemberAgent.get('/sso/saml/acs').expect(401);
			expect(response.text).toContain('SAML Authentication failed');
		});
		test('should be able to access POST /sso/saml/acs', async () => {
			const response = await authMemberAgent.post('/sso/saml/acs').expect(401);
			expect(response.text).toContain('SAML Authentication failed');
		});
		test('should be able to access GET /sso/saml/initsso', async () => {
			await authMemberAgent.get('/sso/saml/initsso').expect(200);
		});
		test('should NOT be able to access GET /sso/saml/config/test', async () => {
			await authMemberAgent.get('/sso/saml/config/test').expect(403);
		});
	});
	describe('Non-Authenticated User', () => {
		test('should be able to access /sso/saml/metadata', async () => {
			await testServer.authlessAgent.get('/sso/saml/metadata').expect(200);
		});
		test('should NOT be able to access GET /sso/saml/config', async () => {
			await testServer.authlessAgent.get('/sso/saml/config').expect(401);
		});
		test('should NOT be able to access POST /sso/saml/config', async () => {
			await testServer.authlessAgent.post('/sso/saml/config').expect(401);
		});
		test('should NOT be able to access POST /sso/saml/config/toggle', async () => {
			await testServer.authlessAgent.post('/sso/saml/config/toggle').expect(401);
		});
		test('should be able to access GET /sso/saml/acs', async () => {
			const response = await testServer.authlessAgent.get('/sso/saml/acs').expect(401);
			expect(response.text).toContain('SAML Authentication failed');
		});
		test('should be able to access POST /sso/saml/acs', async () => {
			const response = await testServer.authlessAgent.post('/sso/saml/acs').expect(401);
			expect(response.text).toContain('SAML Authentication failed');
		});
		test('should be able to access GET /sso/saml/initsso', async () => {
			await testServer.authlessAgent.get('/sso/saml/initsso').expect(200);
		});
		test('should NOT be able to access GET /sso/saml/config/test', async () => {
			await testServer.authlessAgent.get('/sso/saml/config/test').expect(401);
		});
	});
});
//# sourceMappingURL=saml.api.test.js.map
