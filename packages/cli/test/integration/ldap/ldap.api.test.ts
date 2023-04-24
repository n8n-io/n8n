import express from 'express';
import type { Entry as LdapUser } from 'ldapts';
import { Not } from 'typeorm';
import { Container } from 'typedi';
import { jsonParse } from 'n8n-workflow';
import config from '@/config';
import * as Db from '@/Db';
import type { Role } from '@db/entities/Role';
import type { User } from '@db/entities/User';
import { LDAP_DEFAULT_CONFIGURATION, LDAP_FEATURE_NAME } from '@/Ldap/constants';
import { LdapManager } from '@/Ldap/LdapManager.ee';
import { LdapService } from '@/Ldap/LdapService.ee';
import { encryptPassword, saveLdapSynchronization } from '@/Ldap/helpers';
import type { LdapConfig } from '@/Ldap/types';
import { sanitizeUser } from '@/UserManagement/UserManagementHelper';
import { getCurrentAuthenticationMethod, setCurrentAuthenticationMethod } from '@/sso/ssoHelpers';
import { License } from '@/License';
import { randomEmail, randomName, uniqueId } from './../shared/random';
import * as testDb from './../shared/testDb';
import type { AuthAgent } from '../shared/types';
import * as utils from '../shared/utils';

jest.mock('@/telemetry');
jest.mock('@/UserManagement/email/NodeMailer');

let app: express.Application;
let globalMemberRole: Role;
let owner: User;
let authAgent: AuthAgent;

const defaultLdapConfig = {
	...LDAP_DEFAULT_CONFIGURATION,
	loginEnabled: true,
	loginLabel: '',
	ldapIdAttribute: 'uid',
	firstNameAttribute: 'givenName',
	lastNameAttribute: 'sn',
	emailAttribute: 'mail',
	loginIdAttribute: 'mail',
	baseDn: 'baseDn',
	bindingAdminDn: 'adminDn',
	bindingAdminPassword: 'adminPassword',
};

beforeAll(async () => {
	Container.get(License).isLdapEnabled = () => true;
	app = await utils.initTestServer({ endpointGroups: ['auth', 'ldap'] });

	const [globalOwnerRole, fetchedGlobalMemberRole] = await testDb.getAllRoles();

	globalMemberRole = fetchedGlobalMemberRole;

	owner = await testDb.createUser({ globalRole: globalOwnerRole });

	authAgent = utils.createAuthAgent(app);

	defaultLdapConfig.bindingAdminPassword = await encryptPassword(
		defaultLdapConfig.bindingAdminPassword,
	);

	utils.initConfigFile();

	await setCurrentAuthenticationMethod('email');
});

beforeEach(async () => {
	await testDb.truncate([
		'AuthIdentity',
		'AuthProviderSyncHistory',
		'SharedCredentials',
		'Credentials',
		'SharedWorkflow',
		'Workflow',
	]);

	await Db.collections.User.delete({ id: Not(owner.id) });

	jest.mock('@/telemetry');

	config.set('userManagement.disabled', false);
	config.set('userManagement.isInstanceOwnerSetUp', true);
	config.set('userManagement.emails.mode', '');
});

afterAll(async () => {
	await testDb.terminate();
});

const createLdapConfig = async (attributes: Partial<LdapConfig> = {}): Promise<LdapConfig> => {
	const { value: ldapConfig } = await Db.collections.Settings.save({
		key: LDAP_FEATURE_NAME,
		value: JSON.stringify({
			...defaultLdapConfig,
			...attributes,
		}),
		loadOnStartup: true,
	});
	return jsonParse(ldapConfig);
};

test('Member role should not be able to access ldap routes', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole });

	let response = await authAgent(member).get('/ldap/config');
	expect(response.statusCode).toBe(403);

	response = await authAgent(member).put('/ldap/config');
	expect(response.statusCode).toBe(403);

	response = await authAgent(member).post('/ldap/test-connection');
	expect(response.statusCode).toBe(403);

	response = await authAgent(member).post('/ldap/sync');
	expect(response.statusCode).toBe(403);

	response = await authAgent(member).get('/ldap/sync');
	expect(response.statusCode).toBe(403);
});

describe('PUT /ldap/config', () => {
	test('route should validate payload', async () => {
		const invalidValuePayload = {
			...LDAP_DEFAULT_CONFIGURATION,
			loginEnabled: '', // enabled property only allows boolean
			loginLabel: '',
		};

		const invalidExtraPropertyPayload = {
			...LDAP_DEFAULT_CONFIGURATION,
			example: true, // property not defined in the validation schema
		};

		const missingPropertyPayload = {
			loginEnabled: true,
			loginLabel: '',
			// missing all other properties defined in the schema
		};

		const invalidPayloads = [
			invalidValuePayload,
			invalidExtraPropertyPayload,
			missingPropertyPayload,
		];

		for (const invalidPayload of invalidPayloads) {
			const response = await authAgent(owner).put('/ldap/config').send(invalidPayload);
			expect(response.statusCode).toBe(400);
			expect(response.body).toHaveProperty('message');
		}
	});

	test('route should update model', async () => {
		const validPayload = {
			...LDAP_DEFAULT_CONFIGURATION,
			loginEnabled: true,
			loginLabel: '',
		};

		const response = await authAgent(owner).put('/ldap/config').send(validPayload);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.loginEnabled).toBe(true);
		expect(response.body.data.loginLabel).toBe('');
	});

	test('should apply "Convert all LDAP users to email users" strategy when LDAP login disabled', async () => {
		const ldapConfig = await createLdapConfig();
		LdapManager.updateConfig(ldapConfig);

		const member = await testDb.createLdapUser({ globalRole: globalMemberRole }, uniqueId());

		const configuration = ldapConfig;

		// disable the login, so the strategy is applied
		await authAgent(owner)
			.put('/ldap/config')
			.send({ ...configuration, loginEnabled: false });

		const emailUser = await Db.collections.User.findOneByOrFail({ id: member.id });
		const localLdapIdentities = await testDb.getLdapIdentities();

		expect(getCurrentAuthenticationMethod()).toBe('email');
		expect(emailUser.email).toBe(member.email);
		expect(emailUser.lastName).toBe(member.lastName);
		expect(emailUser.firstName).toBe(member.firstName);
		expect(localLdapIdentities.length).toEqual(0);
	});
});

test('GET /ldap/config route should retrieve current configuration', async () => {
	const validPayload = {
		...LDAP_DEFAULT_CONFIGURATION,
		loginEnabled: true,
		loginLabel: '',
	};

	let response = await authAgent(owner).put('/ldap/config').send(validPayload);
	expect(response.statusCode).toBe(200);
	expect(getCurrentAuthenticationMethod()).toBe('ldap');

	response = await authAgent(owner).get('/ldap/config');

	expect(response.body.data).toMatchObject(validPayload);
});

describe('POST /ldap/test-connection', () => {
	test('route should success', async () => {
		jest.spyOn(LdapService.prototype, 'testConnection').mockResolvedValue();

		const response = await authAgent(owner).post('/ldap/test-connection');
		expect(response.statusCode).toBe(200);
	});

	test('route should fail', async () => {
		const errorMessage = 'Invalid connection';

		jest.spyOn(LdapService.prototype, 'testConnection').mockRejectedValue(new Error(errorMessage));

		const response = await authAgent(owner).post('/ldap/test-connection');
		expect(response.statusCode).toBe(400);
		expect(response.body).toHaveProperty('message');
		expect(response.body.message).toStrictEqual(errorMessage);
	});
});

describe('POST /ldap/sync', () => {
	beforeEach(async () => {
		const ldapConfig = await createLdapConfig({
			ldapIdAttribute: 'uid',
			firstNameAttribute: 'givenName',
			lastNameAttribute: 'sn',
			emailAttribute: 'mail',
		});
		LdapManager.updateConfig(ldapConfig);
	});

	describe('dry mode', () => {
		const runTest = async (ldapUsers: LdapUser[]) => {
			jest.spyOn(LdapService.prototype, 'searchWithAdminBinding').mockResolvedValue(ldapUsers);

			const response = await authAgent(owner).post('/ldap/sync').send({ type: 'dry' });

			expect(response.statusCode).toBe(200);

			const synchronization = await Db.collections.AuthProviderSyncHistory.findOneByOrFail({});

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
					mail: randomEmail(),
					sn: randomName(),
					givenName: randomName(),
					uid: uniqueId(),
				},
			]);

			expect(synchronization.created).toBe(1);

			// Make sure only the instance owner is on the DB
			const localDbUsers = await Db.collections.User.find();
			expect(localDbUsers.length).toBe(1);
			expect(localDbUsers[0].id).toBe(owner.id);
		});

		test('should detect updated user but not persist change in model', async () => {
			const ldapUserEmail = randomEmail();
			const ldapUserId = uniqueId();

			const member = await testDb.createLdapUser(
				{ globalRole: globalMemberRole, email: ldapUserEmail },
				ldapUserId,
			);

			const synchronization = await runTest([
				{
					dn: '',
					mail: ldapUserEmail,
					sn: randomName(),
					givenName: 'updated',
					uid: ldapUserId,
				},
			]);

			expect(synchronization.updated).toBe(1);

			// Make sure the changes in the "LDAP server" were not persisted in the database
			const localLdapIdentities = await testDb.getLdapIdentities();
			const localLdapUsers = localLdapIdentities.map(({ user }) => user);
			expect(localLdapUsers.length).toBe(1);
			expect(localLdapUsers[0].id).toBe(member.id);
			expect(localLdapUsers[0].lastName).toBe(member.lastName);
		});

		test('should detect disabled user but not persist change in model', async () => {
			const ldapUserEmail = randomEmail();
			const ldapUserId = uniqueId();

			const member = await testDb.createLdapUser(
				{ globalRole: globalMemberRole, email: ldapUserEmail },
				ldapUserId,
			);

			const synchronization = await runTest([]);

			expect(synchronization.disabled).toBe(1);

			// Make sure the changes in the "LDAP server" were not persisted in the database
			const localLdapIdentities = await testDb.getLdapIdentities();
			const localLdapUsers = localLdapIdentities.map(({ user }) => user);
			expect(localLdapUsers.length).toBe(1);
			expect(localLdapUsers[0].id).toBe(member.id);
			expect(localLdapUsers[0].disabled).toBe(false);
		});
	});

	describe('live mode', () => {
		const runTest = async (ldapUsers: LdapUser[]) => {
			jest.spyOn(LdapService.prototype, 'searchWithAdminBinding').mockResolvedValue(ldapUsers);

			const response = await authAgent(owner).post('/ldap/sync').send({ type: 'live' });

			expect(response.statusCode).toBe(200);

			const synchronization = await Db.collections.AuthProviderSyncHistory.findOneByOrFail({});

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
				mail: randomEmail(),
				dn: '',
				sn: randomName(),
				givenName: randomName(),
				uid: uniqueId(),
			};

			const synchronization = await runTest([ldapUser]);
			expect(synchronization.created).toBe(1);

			// Make sure the changes in the "LDAP server" were persisted in the database
			const allUsers = await testDb.getAllUsers();
			expect(allUsers.length).toBe(2);

			const ownerUser = allUsers.find((u) => u.email === owner.email)!;
			expect(ownerUser.email).toBe(owner.email);

			const memberUser = allUsers.find((u) => u.email !== owner.email)!;
			expect(memberUser.email).toBe(ldapUser.mail);
			expect(memberUser.lastName).toBe(ldapUser.sn);
			expect(memberUser.firstName).toBe(ldapUser.givenName);

			const authIdentities = await testDb.getLdapIdentities();
			expect(authIdentities.length).toBe(1);
			expect(authIdentities[0].providerId).toBe(ldapUser.uid);
			expect(authIdentities[0].providerType).toBe('ldap');
		});

		test('should detect updated user and persist change in model', async () => {
			const ldapUser = {
				mail: randomEmail(),
				dn: '',
				sn: 'updated',
				givenName: randomName(),
				uid: uniqueId(),
			};

			await testDb.createLdapUser(
				{
					globalRole: globalMemberRole,
					email: ldapUser.mail,
					firstName: ldapUser.givenName,
					lastName: randomName(),
				},
				ldapUser.uid,
			);

			const synchronization = await runTest([ldapUser]);
			expect(synchronization.updated).toBe(1);

			// Make sure the changes in the "LDAP server" were persisted in the database
			const localLdapIdentities = await testDb.getLdapIdentities();
			const localLdapUsers = localLdapIdentities.map(({ user }) => user);

			expect(localLdapUsers.length).toBe(1);
			expect(localLdapUsers[0].email).toBe(ldapUser.mail);
			expect(localLdapUsers[0].lastName).toBe(ldapUser.sn);
			expect(localLdapUsers[0].firstName).toBe(ldapUser.givenName);
			expect(localLdapIdentities[0].providerId).toBe(ldapUser.uid);
		});

		test('should detect disabled user and persist change in model', async () => {
			const ldapUser = {
				mail: randomEmail(),
				dn: '',
				sn: 'updated',
				givenName: randomName(),
				uid: uniqueId(),
			};

			await testDb.createLdapUser(
				{
					globalRole: globalMemberRole,
					email: ldapUser.mail,
					firstName: ldapUser.givenName,
					lastName: ldapUser.sn,
				},
				ldapUser.uid,
			);

			const synchronization = await runTest([]);
			expect(synchronization.disabled).toBe(1);

			// Make sure the changes in the "LDAP server" were persisted in the database
			const allUsers = await testDb.getAllUsers();
			expect(allUsers.length).toBe(2);

			const ownerUser = allUsers.find((u) => u.email === owner.email)!;
			expect(ownerUser.email).toBe(owner.email);

			const memberUser = allUsers.find((u) => u.email !== owner.email)!;
			expect(memberUser.email).toBe(ldapUser.mail);
			expect(memberUser.lastName).toBe(ldapUser.sn);
			expect(memberUser.firstName).toBe(ldapUser.givenName);
			expect(memberUser.disabled).toBe(true);

			const authIdentities = await testDb.getLdapIdentities();
			expect(authIdentities.length).toBe(0);
		});

		test('should remove user instance access once the user is disabled during synchronization', async () => {
			const member = await testDb.createLdapUser({ globalRole: globalMemberRole }, uniqueId());

			jest.spyOn(LdapService.prototype, 'searchWithAdminBinding').mockResolvedValue([]);

			await authAgent(owner).post('/ldap/sync').send({ type: 'live' });

			const response = await authAgent(member).get('/login');
			expect(response.body.code).toBe(401);
		});
	});
});

test('GET /ldap/sync should return paginated synchronizations', async () => {
	for (let i = 0; i < 2; i++) {
		await saveLdapSynchronization({
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

	let response = await authAgent(owner).get('/ldap/sync?perPage=1&page=0');
	expect(response.body.data.length).toBe(1);

	response = await authAgent(owner).get('/ldap/sync?perPage=1&page=1');
	expect(response.body.data.length).toBe(1);
});

describe('POST /login', () => {
	const runTest = async (ldapUser: LdapUser) => {
		const ldapConfig = await createLdapConfig();
		LdapManager.updateConfig(ldapConfig);

		const authlessAgent = utils.createAgent(app);

		jest.spyOn(LdapService.prototype, 'searchWithAdminBinding').mockResolvedValue([ldapUser]);

		jest.spyOn(LdapService.prototype, 'validUser').mockResolvedValue();

		const response = await authlessAgent
			.post('/login')
			.send({ email: ldapUser.mail, password: 'password' });

		expect(response.statusCode).toBe(200);
		expect(response.headers['set-cookie']).toBeDefined();
		expect(response.headers['set-cookie'][0] as string).toContain('n8n-auth=');

		// Make sure the changes in the "LDAP server" were persisted in the database
		const localLdapIdentities = await testDb.getLdapIdentities();
		const localLdapUsers = localLdapIdentities.map(({ user }) => user);

		expect(localLdapUsers.length).toBe(1);
		expect(localLdapUsers[0].email).toBe(ldapUser.mail);
		expect(localLdapUsers[0].lastName).toBe(ldapUser.sn);
		expect(localLdapUsers[0].firstName).toBe(ldapUser.givenName);
		expect(localLdapIdentities[0].providerId).toBe(ldapUser.uid);
		expect(localLdapUsers[0].disabled).toBe(false);
	};

	test('should allow new LDAP user to login and synchronize data', async () => {
		const ldapUser = {
			mail: randomEmail(),
			dn: '',
			sn: '',
			givenName: randomName(),
			uid: uniqueId(),
		};
		await runTest(ldapUser);
	});

	test('should allow existing LDAP user to login and synchronize data', async () => {
		const ldapUser = {
			mail: randomEmail(),
			dn: '',
			sn: 'updated',
			givenName: 'updated',
			uid: uniqueId(),
		};

		await testDb.createLdapUser(
			{
				globalRole: globalMemberRole,
				email: ldapUser.mail,
				firstName: 'firstname',
				lastName: 'lastname',
			},
			ldapUser.uid,
		);

		await runTest(ldapUser);
	});

	test('should transform email user into LDAP user when match found', async () => {
		const ldapUser = {
			mail: randomEmail(),
			dn: '',
			sn: randomName(),
			givenName: randomName(),
			uid: uniqueId(),
		};

		await testDb.createUser({
			globalRole: globalMemberRole,
			email: ldapUser.mail,
			firstName: ldapUser.givenName,
			lastName: 'lastname',
		});

		await runTest(ldapUser);
	});
});

describe('Instance owner should able to delete LDAP users', () => {
	test("don't transfer workflows", async () => {
		const ldapConfig = await createLdapConfig();
		LdapManager.updateConfig(ldapConfig);

		const member = await testDb.createLdapUser({ globalRole: globalMemberRole }, uniqueId());

		await authAgent(owner).post(`/users/${member.id}`);
	});

	test('transfer workflows and credentials', async () => {
		const ldapConfig = await createLdapConfig();
		LdapManager.updateConfig(ldapConfig);

		const member = await testDb.createLdapUser({ globalRole: globalMemberRole }, uniqueId());

		// delete the LDAP member and transfer its workflows/credentials to instance owner
		await authAgent(owner).post(`/users/${member.id}?transferId=${owner.id}`);
	});
});

test('Sign-type should be returned when listing users', async () => {
	const ldapConfig = await createLdapConfig();
	LdapManager.updateConfig(ldapConfig);

	await testDb.createLdapUser(
		{
			globalRole: globalMemberRole,
		},
		uniqueId(),
	);

	const allUsers = await testDb.getAllUsers();
	expect(allUsers.length).toBe(2);

	const ownerUser = allUsers.find((u) => u.email === owner.email)!;
	expect(sanitizeUser(ownerUser).signInType).toStrictEqual('email');

	const memberUser = allUsers.find((u) => u.email !== owner.email)!;
	expect(sanitizeUser(memberUser).signInType).toStrictEqual('ldap');
});
