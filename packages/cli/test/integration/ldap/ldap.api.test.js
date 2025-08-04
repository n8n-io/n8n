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
const typeorm_1 = require('@n8n/typeorm');
const n8n_core_1 = require('n8n-core');
const config_1 = __importDefault(require('@/config'));
const helpers_ee_1 = require('@/ldap.ee/helpers.ee');
const ldap_service_ee_1 = require('@/ldap.ee/ldap.service.ee');
const sso_helpers_1 = require('@/sso.ee/sso-helpers');
const users_1 = require('../shared/db/users');
const ldap_1 = require('../shared/ldap');
const utils = __importStar(require('../shared/utils/'));
jest.mock('@/telemetry');
let owner;
let authOwnerAgent;
const testServer = utils.setupTestServer({
	endpointGroups: ['auth', 'ldap'],
	enabledFeatures: ['feat:ldap'],
});
beforeAll(async () => {
	owner = await (0, users_1.createUser)({ role: 'global:owner' });
	authOwnerAgent = testServer.authAgentFor(owner);
	ldap_1.defaultLdapConfig.bindingAdminPassword = di_1.Container.get(n8n_core_1.Cipher).encrypt(
		ldap_1.defaultLdapConfig.bindingAdminPassword,
	);
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate([
		'AuthIdentity',
		'AuthProviderSyncHistory',
		'SharedCredentials',
		'CredentialsEntity',
		'SharedWorkflow',
		'WorkflowEntity',
	]);
	await di_1.Container.get(db_1.UserRepository).delete({ id: (0, typeorm_1.Not)(owner.id) });
	jest.mock('@/telemetry');
	config_1.default.set('userManagement.isInstanceOwnerSetUp', true);
	await (0, sso_helpers_1.setCurrentAuthenticationMethod)('email');
});
test('Member role should not be able to access ldap routes', async () => {
	const member = await (0, users_1.createUser)({ role: 'global:member' });
	const authAgent = testServer.authAgentFor(member);
	await authAgent.get('/ldap/config').expect(403);
	await authAgent.put('/ldap/config').expect(403);
	await authAgent.post('/ldap/test-connection').expect(403);
	await authAgent.post('/ldap/sync').expect(403);
	await authAgent.get('/ldap/sync').expect(403);
});
describe('PUT /ldap/config', () => {
	test('route should validate payload', async () => {
		const invalidValuePayload = {
			...constants_1.LDAP_DEFAULT_CONFIGURATION,
			loginEnabled: '',
			loginLabel: '',
		};
		const invalidExtraPropertyPayload = {
			...constants_1.LDAP_DEFAULT_CONFIGURATION,
			example: true,
		};
		const missingPropertyPayload = {
			loginEnabled: true,
			loginLabel: '',
		};
		const invalidPayloads = [
			invalidValuePayload,
			invalidExtraPropertyPayload,
			missingPropertyPayload,
		];
		for (const invalidPayload of invalidPayloads) {
			const response = await authOwnerAgent.put('/ldap/config').send(invalidPayload);
			expect(response.statusCode).toBe(400);
			expect(response.body).toHaveProperty('message');
		}
	});
	test('route should update model', async () => {
		const validPayload = {
			...constants_1.LDAP_DEFAULT_CONFIGURATION,
			loginEnabled: true,
			loginLabel: '',
		};
		const response = await authOwnerAgent.put('/ldap/config').send(validPayload);
		expect(response.statusCode).toBe(200);
		expect(response.body.data.loginEnabled).toBe(true);
		expect(response.body.data.loginLabel).toBe('');
	});
	test('route should fail due to trying to enable LDAP login with SSO as current authentication method', async () => {
		const validPayload = {
			...constants_1.LDAP_DEFAULT_CONFIGURATION,
			loginEnabled: true,
		};
		config_1.default.set('userManagement.authenticationMethod', 'saml');
		const response = await authOwnerAgent.put('/ldap/config').send(validPayload);
		expect(response.statusCode).toBe(400);
	});
	test('should apply "Convert all LDAP users to email users" strategy when LDAP login disabled', async () => {
		const ldapConfig = await (0, ldap_1.createLdapConfig)();
		di_1.Container.get(ldap_service_ee_1.LdapService).setConfig(ldapConfig);
		const member = await (0, users_1.createLdapUser)(
			{ role: 'global:member' },
			(0, backend_test_utils_1.uniqueId)(),
		);
		const configuration = ldapConfig;
		await authOwnerAgent.put('/ldap/config').send({ ...configuration, loginEnabled: false });
		const emailUser = await di_1.Container.get(db_1.UserRepository).findOneByOrFail({
			id: member.id,
		});
		const localLdapIdentities = await (0, users_1.getLdapIdentities)();
		expect((0, sso_helpers_1.getCurrentAuthenticationMethod)()).toBe('email');
		expect(emailUser.email).toBe(member.email);
		expect(emailUser.lastName).toBe(member.lastName);
		expect(emailUser.firstName).toBe(member.firstName);
		expect(localLdapIdentities.length).toEqual(0);
	});
});
test('GET /ldap/config route should retrieve current configuration', async () => {
	const validPayload = {
		...constants_1.LDAP_DEFAULT_CONFIGURATION,
		loginEnabled: true,
		loginLabel: '',
	};
	let response = await authOwnerAgent.put('/ldap/config').send(validPayload);
	expect(response.statusCode).toBe(200);
	expect((0, sso_helpers_1.getCurrentAuthenticationMethod)()).toBe('ldap');
	response = await authOwnerAgent.get('/ldap/config');
	expect(response.body.data).toMatchObject(validPayload);
});
describe('POST /ldap/test-connection', () => {
	test('route should success', async () => {
		jest.spyOn(ldap_service_ee_1.LdapService.prototype, 'testConnection').mockResolvedValue();
		await authOwnerAgent.post('/ldap/test-connection').expect(200);
	});
	test('route should fail', async () => {
		const errorMessage = 'Invalid connection';
		jest
			.spyOn(ldap_service_ee_1.LdapService.prototype, 'testConnection')
			.mockRejectedValue(new Error(errorMessage));
		const response = await authOwnerAgent.post('/ldap/test-connection');
		expect(response.statusCode).toBe(400);
		expect(response.body).toHaveProperty('message');
		expect(response.body.message).toStrictEqual(errorMessage);
	});
});
describe('POST /ldap/sync', () => {
	beforeEach(async () => {
		const ldapConfig = await (0, ldap_1.createLdapConfig)({
			ldapIdAttribute: 'uid',
			firstNameAttribute: 'givenName',
			lastNameAttribute: 'sn',
			emailAttribute: 'mail',
		});
		di_1.Container.get(ldap_service_ee_1.LdapService).setConfig(ldapConfig);
	});
	describe('dry mode', () => {
		const runTest = async (ldapUsers) => {
			jest
				.spyOn(ldap_service_ee_1.LdapService.prototype, 'searchWithAdminBinding')
				.mockResolvedValue(ldapUsers);
			await authOwnerAgent.post('/ldap/sync').send({ type: 'dry' }).expect(200);
			const synchronization = await di_1.Container.get(
				db_1.AuthProviderSyncHistoryRepository,
			).findOneByOrFail({});
			expect(synchronization.id).toBeDefined();
			expect(synchronization.startedAt).toBeDefined();
			expect(synchronization.endedAt).toBeDefined();
			expect(synchronization.created).toBeDefined();
			expect(synchronization.updated).toBeDefined();
			expect(synchronization.disabled).toBeDefined();
			expect(synchronization.status).toBeDefined();
			expect(synchronization.scanned).toBeDefined();
			expect(synchronization.error).toBeDefined();
			expect(synchronization.runMode).toBeDefined();
			expect(synchronization.runMode).toBe('dry');
			expect(synchronization.scanned).toBe(ldapUsers.length);
			return synchronization;
		};
		test('should detect new user but not persist change in model', async () => {
			const synchronization = await runTest([
				{
					dn: '',
					mail: (0, backend_test_utils_1.randomEmail)(),
					sn: (0, backend_test_utils_1.randomName)(),
					givenName: (0, backend_test_utils_1.randomName)(),
					uid: (0, backend_test_utils_1.uniqueId)(),
				},
			]);
			expect(synchronization.created).toBe(1);
			const localDbUsers = await di_1.Container.get(db_1.UserRepository).find();
			expect(localDbUsers.length).toBe(1);
			expect(localDbUsers[0].id).toBe(owner.id);
		});
		test('should detect updated user but not persist change in model', async () => {
			const ldapUserEmail = (0, backend_test_utils_1.randomEmail)();
			const ldapUserId = (0, backend_test_utils_1.uniqueId)();
			const member = await (0, users_1.createLdapUser)(
				{ role: 'global:member', email: ldapUserEmail },
				ldapUserId,
			);
			const synchronization = await runTest([
				{
					dn: '',
					mail: ldapUserEmail,
					sn: (0, backend_test_utils_1.randomName)(),
					givenName: 'updated',
					uid: ldapUserId,
				},
			]);
			expect(synchronization.updated).toBe(1);
			const localLdapIdentities = await (0, users_1.getLdapIdentities)();
			const localLdapUsers = localLdapIdentities.map(({ user }) => user);
			expect(localLdapUsers.length).toBe(1);
			expect(localLdapUsers[0].id).toBe(member.id);
			expect(localLdapUsers[0].lastName).toBe(member.lastName);
		});
		test('should detect disabled user but not persist change in model', async () => {
			const ldapUserEmail = (0, backend_test_utils_1.randomEmail)();
			const ldapUserId = (0, backend_test_utils_1.uniqueId)();
			const member = await (0, users_1.createLdapUser)(
				{ role: 'global:member', email: ldapUserEmail },
				ldapUserId,
			);
			const synchronization = await runTest([]);
			expect(synchronization.disabled).toBe(1);
			const localLdapIdentities = await (0, users_1.getLdapIdentities)();
			const localLdapUsers = localLdapIdentities.map(({ user }) => user);
			expect(localLdapUsers.length).toBe(1);
			expect(localLdapUsers[0].id).toBe(member.id);
			expect(localLdapUsers[0].disabled).toBe(false);
		});
	});
	describe('live mode', () => {
		const runTest = async (ldapUsers) => {
			jest
				.spyOn(ldap_service_ee_1.LdapService.prototype, 'searchWithAdminBinding')
				.mockResolvedValue(ldapUsers);
			await authOwnerAgent.post('/ldap/sync').send({ type: 'live' }).expect(200);
			const synchronization = await di_1.Container.get(
				db_1.AuthProviderSyncHistoryRepository,
			).findOneByOrFail({});
			expect(synchronization.id).toBeDefined();
			expect(synchronization.startedAt).toBeDefined();
			expect(synchronization.endedAt).toBeDefined();
			expect(synchronization.created).toBeDefined();
			expect(synchronization.updated).toBeDefined();
			expect(synchronization.disabled).toBeDefined();
			expect(synchronization.status).toBeDefined();
			expect(synchronization.scanned).toBeDefined();
			expect(synchronization.error).toBeDefined();
			expect(synchronization.runMode).toBeDefined();
			expect(synchronization.runMode).toBe('live');
			expect(synchronization.scanned).toBe(ldapUsers.length);
			return synchronization;
		};
		test('should detect new user and persist change in model', async () => {
			const ldapUser = {
				mail: (0, backend_test_utils_1.randomEmail)(),
				dn: '',
				sn: (0, backend_test_utils_1.randomName)(),
				givenName: (0, backend_test_utils_1.randomName)(),
				uid: (0, backend_test_utils_1.uniqueId)(),
			};
			const synchronization = await runTest([ldapUser]);
			expect(synchronization.created).toBe(1);
			const allUsers = await (0, users_1.getAllUsers)();
			expect(allUsers.length).toBe(2);
			const ownerUser = allUsers.find((u) => u.email === owner.email);
			expect(ownerUser.email).toBe(owner.email);
			const memberUser = allUsers.find((u) => u.email !== owner.email);
			expect(memberUser.email).toBe(ldapUser.mail);
			expect(memberUser.lastName).toBe(ldapUser.sn);
			expect(memberUser.firstName).toBe(ldapUser.givenName);
			const memberProject = (0, backend_test_utils_1.getPersonalProject)(memberUser);
			expect(memberProject).toBeDefined();
			const authIdentities = await (0, users_1.getLdapIdentities)();
			expect(authIdentities.length).toBe(1);
			expect(authIdentities[0].providerId).toBe(ldapUser.uid);
			expect(authIdentities[0].providerType).toBe('ldap');
		});
		test('should detect updated user and persist change in model', async () => {
			const ldapUser = {
				mail: (0, backend_test_utils_1.randomEmail)(),
				dn: '',
				sn: 'updated',
				givenName: (0, backend_test_utils_1.randomName)(),
				uid: (0, backend_test_utils_1.uniqueId)(),
			};
			await (0, users_1.createLdapUser)(
				{
					role: 'global:member',
					email: ldapUser.mail,
					firstName: ldapUser.givenName,
					lastName: (0, backend_test_utils_1.randomName)(),
				},
				ldapUser.uid,
			);
			const synchronization = await runTest([ldapUser]);
			expect(synchronization.updated).toBe(1);
			const localLdapIdentities = await (0, users_1.getLdapIdentities)();
			const localLdapUsers = localLdapIdentities.map(({ user }) => user);
			expect(localLdapUsers.length).toBe(1);
			expect(localLdapUsers[0].email).toBe(ldapUser.mail);
			expect(localLdapUsers[0].lastName).toBe(ldapUser.sn);
			expect(localLdapUsers[0].firstName).toBe(ldapUser.givenName);
			expect(localLdapIdentities[0].providerId).toBe(ldapUser.uid);
		});
		test('should detect disabled user and persist change in model', async () => {
			const ldapUser = {
				mail: (0, backend_test_utils_1.randomEmail)(),
				dn: '',
				sn: 'updated',
				givenName: (0, backend_test_utils_1.randomName)(),
				uid: (0, backend_test_utils_1.uniqueId)(),
			};
			await (0, users_1.createLdapUser)(
				{
					role: 'global:member',
					email: ldapUser.mail,
					firstName: ldapUser.givenName,
					lastName: ldapUser.sn,
				},
				ldapUser.uid,
			);
			const synchronization = await runTest([]);
			expect(synchronization.disabled).toBe(1);
			const allUsers = await (0, users_1.getAllUsers)();
			expect(allUsers.length).toBe(2);
			const ownerUser = allUsers.find((u) => u.email === owner.email);
			expect(ownerUser.email).toBe(owner.email);
			const memberUser = allUsers.find((u) => u.email !== owner.email);
			expect(memberUser.email).toBe(ldapUser.mail);
			expect(memberUser.lastName).toBe(ldapUser.sn);
			expect(memberUser.firstName).toBe(ldapUser.givenName);
			expect(memberUser.disabled).toBe(true);
			const authIdentities = await (0, users_1.getLdapIdentities)();
			expect(authIdentities.length).toBe(0);
		});
		test('should remove user instance access once the user is disabled during synchronization', async () => {
			const member = await (0, users_1.createLdapUser)(
				{ role: 'global:member' },
				(0, backend_test_utils_1.uniqueId)(),
			);
			jest
				.spyOn(ldap_service_ee_1.LdapService.prototype, 'searchWithAdminBinding')
				.mockResolvedValue([]);
			await authOwnerAgent.post('/ldap/sync').send({ type: 'live' });
			const response = await testServer.authAgentFor(member).get('/login');
			expect(response.status).toBe(401);
		});
	});
});
test('GET /ldap/sync should return paginated synchronizations', async () => {
	for (let i = 0; i < 2; i++) {
		await (0, helpers_ee_1.saveLdapSynchronization)({
			created: 0,
			scanned: 0,
			updated: 0,
			disabled: 0,
			startedAt: new Date(),
			endedAt: new Date(),
			status: 'success',
			error: '',
			runMode: 'dry',
		});
	}
	let response = await authOwnerAgent.get('/ldap/sync?perPage=1&page=0');
	expect(response.body.data.length).toBe(1);
	response = await authOwnerAgent.get('/ldap/sync?perPage=1&page=1');
	expect(response.body.data.length).toBe(1);
});
describe('POST /login', () => {
	const runTest = async (ldapUser) => {
		const ldapConfig = await (0, ldap_1.createLdapConfig)();
		di_1.Container.get(ldap_service_ee_1.LdapService).setConfig(ldapConfig);
		await (0, sso_helpers_1.setCurrentAuthenticationMethod)('ldap');
		jest
			.spyOn(ldap_service_ee_1.LdapService.prototype, 'searchWithAdminBinding')
			.mockResolvedValue([ldapUser]);
		jest.spyOn(ldap_service_ee_1.LdapService.prototype, 'validUser').mockResolvedValue();
		const response = await testServer.authlessAgent
			.post('/login')
			.send({ emailOrLdapLoginId: ldapUser.mail, password: 'password' });
		expect(response.statusCode).toBe(200);
		expect(response.headers['set-cookie']).toBeDefined();
		expect(response.headers['set-cookie'][0]).toContain('n8n-auth=');
		const localLdapIdentities = await (0, users_1.getLdapIdentities)();
		const localLdapUsers = localLdapIdentities.map(({ user }) => user);
		expect(localLdapUsers.length).toBe(1);
		expect(localLdapUsers[0].email).toBe(ldapUser.mail);
		expect(localLdapUsers[0].lastName).toBe(ldapUser.sn);
		expect(localLdapUsers[0].firstName).toBe(ldapUser.givenName);
		expect(localLdapIdentities[0].providerId).toBe(ldapUser.uid);
		expect(localLdapUsers[0].disabled).toBe(false);
		await expect(
			(0, backend_test_utils_1.getPersonalProject)(localLdapUsers[0]),
		).resolves.toBeDefined();
	};
	test('should allow new LDAP user to login and synchronize data', async () => {
		const ldapUser = {
			mail: (0, backend_test_utils_1.randomEmail)(),
			dn: '',
			sn: '',
			givenName: (0, backend_test_utils_1.randomName)(),
			uid: (0, backend_test_utils_1.uniqueId)(),
		};
		await runTest(ldapUser);
	});
	test('should allow existing LDAP user to login and synchronize data', async () => {
		const ldapUser = {
			mail: (0, backend_test_utils_1.randomEmail)(),
			dn: '',
			sn: 'updated',
			givenName: 'updated',
			uid: (0, backend_test_utils_1.uniqueId)(),
		};
		await (0, users_1.createLdapUser)(
			{
				role: 'global:member',
				email: ldapUser.mail,
				firstName: 'firstname',
				lastName: 'lastname',
			},
			ldapUser.uid,
		);
		await runTest(ldapUser);
	});
	test('should allow instance owner to sign in with email/password when LDAP is enabled', async () => {
		const ldapConfig = await (0, ldap_1.createLdapConfig)();
		di_1.Container.get(ldap_service_ee_1.LdapService).setConfig(ldapConfig);
		const response = await testServer.authlessAgent
			.post('/login')
			.send({ emailOrLdapLoginId: owner.email, password: 'password' });
		expect(response.status).toBe(200);
		expect(response.body.data?.signInType).toBeDefined();
		expect(response.body.data?.signInType).toBe('email');
	});
	test('should transform email user into LDAP user when match found', async () => {
		const ldapUser = {
			mail: (0, backend_test_utils_1.randomEmail)(),
			dn: '',
			sn: (0, backend_test_utils_1.randomName)(),
			givenName: (0, backend_test_utils_1.randomName)(),
			uid: (0, backend_test_utils_1.uniqueId)(),
		};
		await (0, users_1.createUser)({
			role: 'global:member',
			email: ldapUser.mail,
			firstName: ldapUser.givenName,
			lastName: 'lastname',
		});
		await runTest(ldapUser);
	});
});
describe('Instance owner should able to delete LDAP users', () => {
	test("don't transfer workflows", async () => {
		const ldapConfig = await (0, ldap_1.createLdapConfig)();
		di_1.Container.get(ldap_service_ee_1.LdapService).setConfig(ldapConfig);
		const member = await (0, users_1.createLdapUser)(
			{ role: 'global:member' },
			(0, backend_test_utils_1.uniqueId)(),
		);
		await authOwnerAgent.post(`/users/${member.id}`);
	});
	test('transfer workflows and credentials', async () => {
		const ldapConfig = await (0, ldap_1.createLdapConfig)();
		di_1.Container.get(ldap_service_ee_1.LdapService).setConfig(ldapConfig);
		const member = await (0, users_1.createLdapUser)(
			{ role: 'global:member' },
			(0, backend_test_utils_1.uniqueId)(),
		);
		await authOwnerAgent.post(`/users/${member.id}?transferId=${owner.id}`);
	});
});
//# sourceMappingURL=ldap.api.test.js.map
