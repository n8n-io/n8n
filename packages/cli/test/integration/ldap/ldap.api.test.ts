import {
	randomEmail,
	randomName,
	uniqueId,
	getPersonalProject,
	testDb,
} from '@n8n/backend-test-utils';
import { LDAP_DEFAULT_CONFIGURATION } from '@n8n/constants';
import type { User } from '@n8n/db';
import { AuthProviderSyncHistoryRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Not } from '@n8n/typeorm';
import type { Entry as LdapUser } from 'ldapts';
import { Cipher } from 'n8n-core';

import config from '@/config';
import { saveLdapSynchronization } from '@/ldap.ee/helpers.ee';
import { LdapService } from '@/ldap.ee/ldap.service.ee';
import {
	getCurrentAuthenticationMethod,
	setCurrentAuthenticationMethod,
} from '@/sso.ee/sso-helpers';

import { createLdapUser, createUser, getAllUsers, getLdapIdentities } from '../shared/db/users';
import { createLdapConfig, defaultLdapConfig } from '../shared/ldap';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

jest.mock('@/telemetry');

let owner: User;
let authOwnerAgent: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['auth', 'ldap'],
	enabledFeatures: ['feat:ldap'],
});

beforeAll(async () => {
	owner = await createUser({ role: 'global:owner' });
	authOwnerAgent = testServer.authAgentFor(owner);

	defaultLdapConfig.bindingAdminPassword = Container.get(Cipher).encrypt(
		defaultLdapConfig.bindingAdminPassword,
	);
});

beforeEach(async () => {
	await testDb.truncate([
		'AuthIdentity',
		'AuthProviderSyncHistory',
		'SharedCredentials',
		'CredentialsEntity',
		'SharedWorkflow',
		'WorkflowEntity',
	]);

	await Container.get(UserRepository).delete({ id: Not(owner.id) });

	jest.mock('@/telemetry');

	config.set('userManagement.isInstanceOwnerSetUp', true);

	await setCurrentAuthenticationMethod('email');
});

test('Member role should not be able to access ldap routes', async () => {
	const member = await createUser({ role: 'global:member' });
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
			const response = await authOwnerAgent.put('/ldap/config').send(invalidPayload);
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

		const response = await authOwnerAgent.put('/ldap/config').send(validPayload);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.loginEnabled).toBe(true);
		expect(response.body.data.loginLabel).toBe('');
	});

	test('route should fail due to trying to enable LDAP login with SSO as current authentication method', async () => {
		const validPayload = {
			...LDAP_DEFAULT_CONFIGURATION,
			loginEnabled: true,
		};

		config.set('userManagement.authenticationMethod', 'saml');

		const response = await authOwnerAgent.put('/ldap/config').send(validPayload);

		expect(response.statusCode).toBe(400);
	});

	test('should apply "Convert all LDAP users to email users" strategy when LDAP login disabled', async () => {
		const ldapConfig = await createLdapConfig();
		Container.get(LdapService).setConfig(ldapConfig);

		const member = await createLdapUser({ role: 'global:member' }, uniqueId());

		const configuration = ldapConfig;

		// disable the login, so the strategy is applied
		await authOwnerAgent.put('/ldap/config').send({ ...configuration, loginEnabled: false });

		const emailUser = await Container.get(UserRepository).findOneByOrFail({ id: member.id });
		const localLdapIdentities = await getLdapIdentities();

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

	let response = await authOwnerAgent.put('/ldap/config').send(validPayload);
	expect(response.statusCode).toBe(200);
	expect(getCurrentAuthenticationMethod()).toBe('ldap');

	response = await authOwnerAgent.get('/ldap/config');

	expect(response.body.data).toMatchObject(validPayload);
});

describe('POST /ldap/test-connection', () => {
	test('route should success', async () => {
		jest.spyOn(LdapService.prototype, 'testConnection').mockResolvedValue();

		await authOwnerAgent.post('/ldap/test-connection').expect(200);
	});

	test('route should fail', async () => {
		const errorMessage = 'Invalid connection';

		jest.spyOn(LdapService.prototype, 'testConnection').mockRejectedValue(new Error(errorMessage));

		const response = await authOwnerAgent.post('/ldap/test-connection');
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
		Container.get(LdapService).setConfig(ldapConfig);
	});

	describe('dry mode', () => {
		const runTest = async (ldapUsers: LdapUser[]) => {
			jest.spyOn(LdapService.prototype, 'searchWithAdminBinding').mockResolvedValue(ldapUsers);

			await authOwnerAgent.post('/ldap/sync').send({ type: 'dry' }).expect(200);

			const synchronization = await Container.get(
				AuthProviderSyncHistoryRepository,
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
					mail: randomEmail(),
					sn: randomName(),
					givenName: randomName(),
					uid: uniqueId(),
				},
			]);

			expect(synchronization.created).toBe(1);

			// Make sure only the instance owner is on the DB
			const localDbUsers = await Container.get(UserRepository).find();
			expect(localDbUsers.length).toBe(1);
			expect(localDbUsers[0].id).toBe(owner.id);
		});

		test('should detect updated user but not persist change in model', async () => {
			const ldapUserEmail = randomEmail();
			const ldapUserId = uniqueId();

			const member = await createLdapUser(
				{ role: 'global:member', email: ldapUserEmail },
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
			const localLdapIdentities = await getLdapIdentities();
			const localLdapUsers = localLdapIdentities.map(({ user }) => user);
			expect(localLdapUsers.length).toBe(1);
			expect(localLdapUsers[0].id).toBe(member.id);
			expect(localLdapUsers[0].lastName).toBe(member.lastName);
		});

		test('should detect disabled user but not persist change in model', async () => {
			const ldapUserEmail = randomEmail();
			const ldapUserId = uniqueId();

			const member = await createLdapUser(
				{ role: 'global:member', email: ldapUserEmail },
				ldapUserId,
			);

			const synchronization = await runTest([]);

			expect(synchronization.disabled).toBe(1);

			// Make sure the changes in the "LDAP server" were not persisted in the database
			const localLdapIdentities = await getLdapIdentities();
			const localLdapUsers = localLdapIdentities.map(({ user }) => user);
			expect(localLdapUsers.length).toBe(1);
			expect(localLdapUsers[0].id).toBe(member.id);
			expect(localLdapUsers[0].disabled).toBe(false);
		});
	});

	describe('live mode', () => {
		const runTest = async (ldapUsers: LdapUser[]) => {
			jest.spyOn(LdapService.prototype, 'searchWithAdminBinding').mockResolvedValue(ldapUsers);

			await authOwnerAgent.post('/ldap/sync').send({ type: 'live' }).expect(200);

			const synchronization = await Container.get(
				AuthProviderSyncHistoryRepository,
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
				mail: randomEmail(),
				dn: '',
				sn: randomName(),
				givenName: randomName(),
				uid: uniqueId(),
			};

			const synchronization = await runTest([ldapUser]);
			expect(synchronization.created).toBe(1);

			// Make sure the changes in the "LDAP server" were persisted in the database
			const allUsers = await getAllUsers();
			expect(allUsers.length).toBe(2);

			const ownerUser = allUsers.find((u) => u.email === owner.email)!;
			expect(ownerUser.email).toBe(owner.email);

			const memberUser = allUsers.find((u) => u.email !== owner.email)!;
			expect(memberUser.email).toBe(ldapUser.mail);
			expect(memberUser.lastName).toBe(ldapUser.sn);
			expect(memberUser.firstName).toBe(ldapUser.givenName);
			const memberProject = getPersonalProject(memberUser);
			expect(memberProject).toBeDefined();

			const authIdentities = await getLdapIdentities();
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

			await createLdapUser(
				{
					role: 'global:member',
					email: ldapUser.mail,
					firstName: ldapUser.givenName,
					lastName: randomName(),
				},
				ldapUser.uid,
			);

			const synchronization = await runTest([ldapUser]);
			expect(synchronization.updated).toBe(1);

			// Make sure the changes in the "LDAP server" were persisted in the database
			const localLdapIdentities = await getLdapIdentities();
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

			await createLdapUser(
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

			// Make sure the changes in the "LDAP server" were persisted in the database
			const allUsers = await getAllUsers();
			expect(allUsers.length).toBe(2);

			const ownerUser = allUsers.find((u) => u.email === owner.email)!;
			expect(ownerUser.email).toBe(owner.email);

			const memberUser = allUsers.find((u) => u.email !== owner.email)!;
			expect(memberUser.email).toBe(ldapUser.mail);
			expect(memberUser.lastName).toBe(ldapUser.sn);
			expect(memberUser.firstName).toBe(ldapUser.givenName);
			expect(memberUser.disabled).toBe(true);

			const authIdentities = await getLdapIdentities();
			expect(authIdentities.length).toBe(0);
		});

		test('should remove user instance access once the user is disabled during synchronization', async () => {
			const member = await createLdapUser({ role: 'global:member' }, uniqueId());

			jest.spyOn(LdapService.prototype, 'searchWithAdminBinding').mockResolvedValue([]);

			await authOwnerAgent.post('/ldap/sync').send({ type: 'live' });

			const response = await testServer.authAgentFor(member).get('/login');
			expect(response.status).toBe(401);
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

	let response = await authOwnerAgent.get('/ldap/sync?perPage=1&page=0');
	expect(response.body.data.length).toBe(1);

	response = await authOwnerAgent.get('/ldap/sync?perPage=1&page=1');
	expect(response.body.data.length).toBe(1);
});

describe('POST /login', () => {
	const runTest = async (ldapUser: LdapUser) => {
		const ldapConfig = await createLdapConfig();
		Container.get(LdapService).setConfig(ldapConfig);

		await setCurrentAuthenticationMethod('ldap');

		jest.spyOn(LdapService.prototype, 'searchWithAdminBinding').mockResolvedValue([ldapUser]);

		jest.spyOn(LdapService.prototype, 'validUser').mockResolvedValue();

		const response = await testServer.authlessAgent
			.post('/login')
			.send({ emailOrLdapLoginId: ldapUser.mail, password: 'password' });

		expect(response.statusCode).toBe(200);
		expect(response.headers['set-cookie']).toBeDefined();
		expect(response.headers['set-cookie'][0]).toContain('n8n-auth=');

		// Make sure the changes in the "LDAP server" were persisted in the database
		const localLdapIdentities = await getLdapIdentities();
		const localLdapUsers = localLdapIdentities.map(({ user }) => user);

		expect(localLdapUsers.length).toBe(1);
		expect(localLdapUsers[0].email).toBe(ldapUser.mail);
		expect(localLdapUsers[0].lastName).toBe(ldapUser.sn);
		expect(localLdapUsers[0].firstName).toBe(ldapUser.givenName);
		expect(localLdapIdentities[0].providerId).toBe(ldapUser.uid);
		expect(localLdapUsers[0].disabled).toBe(false);

		await expect(getPersonalProject(localLdapUsers[0])).resolves.toBeDefined();
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

		await createLdapUser(
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
		const ldapConfig = await createLdapConfig();
		Container.get(LdapService).setConfig(ldapConfig);

		const response = await testServer.authlessAgent
			.post('/login')
			.send({ emailOrLdapLoginId: owner.email, password: 'password' });

		expect(response.status).toBe(200);
		expect(response.body.data?.signInType).toBeDefined();
		expect(response.body.data?.signInType).toBe('email');
	});

	test('should transform email user into LDAP user when match found', async () => {
		const ldapUser = {
			mail: randomEmail(),
			dn: '',
			sn: randomName(),
			givenName: randomName(),
			uid: uniqueId(),
		};

		await createUser({
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
		const ldapConfig = await createLdapConfig();
		Container.get(LdapService).setConfig(ldapConfig);

		const member = await createLdapUser({ role: 'global:member' }, uniqueId());

		await authOwnerAgent.post(`/users/${member.id}`);
	});

	test('transfer workflows and credentials', async () => {
		const ldapConfig = await createLdapConfig();
		Container.get(LdapService).setConfig(ldapConfig);

		const member = await createLdapUser({ role: 'global:member' }, uniqueId());

		// delete the LDAP member and transfer its workflows/credentials to instance owner
		await authOwnerAgent.post(`/users/${member.id}?transferId=${owner.id}`);
	});
});
