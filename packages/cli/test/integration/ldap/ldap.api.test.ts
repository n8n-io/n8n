import express from 'express';

import config from '@/config';
import * as Db from '@/Db';
import type { Role } from '@db/entities/Role';
import {
	LdapSyncHistory as ADSync,
} from '@db/entities/LdapSyncHistory';
import { randomEmail, randomName, uniqueId } from './../shared/random';
import * as testDb from './../shared/testDb';
import type { AuthAgent } from '../shared/types';
import * as utils from '../shared/utils';

import {
	LDAP_DEFAULT_CONFIGURATION,
	RunningMode,
	SignInType,
} from '@/Ldap/constants';
import { LdapManager } from '@/Ldap/LdapManager.ee';
import { LdapConfig } from '@/Ldap/types';
import { LdapService } from '@/Ldap/LdapService.ee';

jest.mock('@/telemetry');
jest.mock('@/UserManagement/email/NodeMailer');

let app: express.Application;
let testDbName = '';
let globalMemberRole: Role;
let globalOwnerRole: Role;
let authAgent: AuthAgent;

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['auth', 'ldap'], applyAuth: true });
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	const [
		fetchedGlobalOwnerRole,
		fetchedGlobalMemberRole,
	] = await testDb.getAllRoles();

	globalOwnerRole = fetchedGlobalOwnerRole;
	globalMemberRole = fetchedGlobalMemberRole;

	authAgent = utils.createAuthAgent(app);

	utils.initConfigFile();
	utils.initTestLogger();
	utils.initLdapManager();
});

beforeEach(async () => {
	await testDb.truncate(
		[
			'User',
			'SharedCredentials',
			'SharedWorkflow',
			'Workflow',
			'Credentials',
			'FeatureConfig',
			'LdapSyncHistory',
		],
		testDbName,
	);

	jest.mock('@/telemetry');

	config.set('userManagement.disabled', false);
	config.set('userManagement.isInstanceOwnerSetUp', true);
	config.set('userManagement.emails.mode', '');
	config.set('enterprise.features.ldap', true);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('Member role should not be able to access ldap routes', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole });

	await testDb.createLdapDefaultConfig();

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

test('PUT /ldap/config route should validate payload', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	await testDb.createLdapDefaultConfig();

	const invalidValuePayload = {
		...LDAP_DEFAULT_CONFIGURATION,
		login: {
			enabled: '', // enabled property only allows boolean
			label: '',
		},
	};

	const invalidExtraPropertyPayload = {
		...LDAP_DEFAULT_CONFIGURATION,
		example: true, // property not defined in the validation schema
	};

	const missingPropertyPayload = {
		login: {
			enabled: true,
			label: '',
		},
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

test('PUT /ldap/config route should update model', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	await testDb.createLdapDefaultConfig();

	const validPayload = {
		...LDAP_DEFAULT_CONFIGURATION,
		login: {
			enabled: true,
			label: '',
		},
	};

	const response = await authAgent(owner).put('/ldap/config').send(validPayload);
	expect(response.statusCode).toBe(200);
	expect(Object.keys(response.body.data).length).toBe(6);
	expect(response.body.data.login).toMatchObject({ enabled: true, label: '' });
});

test('GET /ldap/config route should retrieve current configuration', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	await testDb.createLdapDefaultConfig();

	const validPayload = {
		...LDAP_DEFAULT_CONFIGURATION,
		login: {
			enabled: true,
			label: '',
		},
	};

	let response = await authAgent(owner).put('/ldap/config').send(validPayload);
	expect(response.statusCode).toBe(200);

	response = await authAgent(owner).get('/ldap/config');

	expect(response.body.data).toMatchObject(validPayload);
});

test('POST /ldap/test-connection route should success', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	jest.spyOn(LdapService.prototype, 'testConnection').mockImplementation(() => Promise.resolve());

	const response = await authAgent(owner).post('/ldap/test-connection');
	expect(response.statusCode).toBe(200);
});

test('POST /ldap/test-connection route should fail', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const errorMessage = 'Invalid connection';

	jest.spyOn(LdapService.prototype, 'testConnection').mockImplementation(() => {
		throw new Error(errorMessage);
	});

	const response = await authAgent(owner).post('/ldap/test-connection');
	expect(response.statusCode).toBe(400);
	expect(response.body).toHaveProperty('message');
	expect(response.body.message).toStrictEqual(errorMessage);
});

test('POST /ldap/sync?type=dry should detect new user but not persist change in model', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	jest.spyOn(LdapService.prototype, 'searchWithAdminBinding').mockImplementation(() =>
		Promise.resolve([
			{
				dn: '',
				mail: randomEmail(),
				sn: randomName(),
				givenName: randomName(),
				uid: uniqueId(),
			},
		]),
	);

	const response = await authAgent(owner).post('/ldap/sync').send({ type: RunningMode.DRY });

	expect(response.statusCode).toBe(200);

	const syncronization = await Db.collections.LdapSyncHistory.findOneOrFail();

	expect(syncronization.id).toBeDefined();
	expect(syncronization.startedAt).toBeDefined();
	expect(syncronization.endedAt).toBeDefined();
	expect(syncronization.created).toBeDefined();
	expect(syncronization.updated).toBeDefined();
	expect(syncronization.disabled).toBeDefined();
	expect(syncronization.status).toBeDefined();
	expect(syncronization.scanned).toBeDefined();
	expect(syncronization.error).toBeDefined();
	expect(syncronization.runMode).toBeDefined();
	expect(syncronization.runMode).toBe(RunningMode.DRY);
	expect(syncronization.scanned).toBe(1);
	expect(syncronization.created).toBe(1);

	// Make sure only the instance owner is on the DB

	const localDbUsers = await Db.collections.User.find();
	expect(localDbUsers.length).toBe(1);
	expect(localDbUsers[0].id).toBe(owner.id);
});

test('POST /ldap/sync?type=dry should detect updated user but not persist change in model', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({ attributeMapping: { ldapId: 'uid' } });

	LdapManager.updateConfig(ldapConfig.data as LdapConfig);

	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const ldapUserEmail = randomEmail();

	const ldapUserId = uniqueId();

	const member = await testDb.createUser({
		globalRole: globalMemberRole,
		signInType: SignInType.LDAP,
		ldapId: ldapUserId,
		email: ldapUserEmail,
	});

	jest.spyOn(LdapService.prototype, 'searchWithAdminBinding').mockImplementation(() =>
		Promise.resolve([
			{
				dn: '',
				mail: ldapUserEmail,
				sn: randomName(),
				givenName: 'updated',
				uid: ldapUserId,
			},
		]),
	);

	const response = await authAgent(owner).post('/ldap/sync').send({ type: RunningMode.DRY });

	expect(response.statusCode).toBe(200);

	const syncronization = await Db.collections.LdapSyncHistory.findOneOrFail();

	expect(syncronization.id).toBeDefined();
	expect(syncronization.startedAt).toBeDefined();
	expect(syncronization.endedAt).toBeDefined();
	expect(syncronization.created).toBeDefined();
	expect(syncronization.updated).toBeDefined();
	expect(syncronization.disabled).toBeDefined();
	expect(syncronization.status).toBeDefined();
	expect(syncronization.scanned).toBeDefined();
	expect(syncronization.error).toBeDefined();
	expect(syncronization.runMode).toBeDefined();
	expect(syncronization.runMode).toBe(RunningMode.DRY);
	expect(syncronization.scanned).toBe(1);
	expect(syncronization.updated).toBe(1);

	// Make sure the changes in the "LDAP server" were not persisted in the database
	const localLdapUsers = await Db.collections.User.find({ signInType: SignInType.LDAP });
	expect(localLdapUsers.length).toBe(1);
	expect(localLdapUsers[0].id).toBe(member.id);
	expect(localLdapUsers[0].lastName).toBe(member.lastName);
});

test('POST /ldap/sync?type=dry should detect disabled user but not persist change in model', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({ attributeMapping: { ldapId: 'uid' } });

	LdapManager.updateConfig(ldapConfig.data as LdapConfig);

	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const ldapUserEmail = randomEmail();

	const ldapUserId = uniqueId();

	const member = await testDb.createUser({
		globalRole: globalMemberRole,
		signInType: SignInType.LDAP,
		ldapId: ldapUserId,
		email: ldapUserEmail,
	});

	jest
		.spyOn(LdapService.prototype, 'searchWithAdminBinding')
		.mockImplementation(() => Promise.resolve([]));

	const response = await authAgent(owner).post('/ldap/sync').send({ type: RunningMode.DRY });

	expect(response.statusCode).toBe(200);

	const syncronization = await Db.collections.LdapSyncHistory.findOneOrFail();

	expect(syncronization.id).toBeDefined();
	expect(syncronization.startedAt).toBeDefined();
	expect(syncronization.endedAt).toBeDefined();
	expect(syncronization.created).toBeDefined();
	expect(syncronization.updated).toBeDefined();
	expect(syncronization.disabled).toBeDefined();
	expect(syncronization.status).toBeDefined();
	expect(syncronization.scanned).toBeDefined();
	expect(syncronization.error).toBeDefined();
	expect(syncronization.runMode).toBeDefined();
	expect(syncronization.runMode).toBe(RunningMode.DRY);
	expect(syncronization.scanned).toBe(0);
	expect(syncronization.disabled).toBe(1);

	// Make sure the changes in the "LDAP server" were not persisted in the database
	const localLdapUsers = await Db.collections.User.find({ signInType: SignInType.LDAP });
	expect(localLdapUsers.length).toBe(1);
	expect(localLdapUsers[0].id).toBe(member.id);
	expect(localLdapUsers[0].disabled).toBe(false);
});

test('POST /ldap/sync?type=live should detect new user and persist change in model', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({
		attributeMapping: { ldapId: 'uid', firstName: 'givenName', lastName: 'sn', email: 'mail' },
	});

	LdapManager.updateConfig(ldapConfig.data as LdapConfig);

	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const ldapUser = {
		mail: randomEmail(),
		dn: '',
		sn: randomName(),
		givenName: randomName(),
		uid: uniqueId(),
	};

	jest
		.spyOn(LdapService.prototype, 'searchWithAdminBinding')
		.mockImplementation(() => Promise.resolve([ldapUser]));

	const response = await authAgent(owner).post('/ldap/sync').send({ type: RunningMode.LIVE });

	expect(response.statusCode).toBe(200);

	const syncronization = await Db.collections.LdapSyncHistory.findOneOrFail();

	expect(syncronization.id).toBeDefined();
	expect(syncronization.startedAt).toBeDefined();
	expect(syncronization.endedAt).toBeDefined();
	expect(syncronization.created).toBeDefined();
	expect(syncronization.updated).toBeDefined();
	expect(syncronization.disabled).toBeDefined();
	expect(syncronization.status).toBeDefined();
	expect(syncronization.scanned).toBeDefined();
	expect(syncronization.error).toBeDefined();
	expect(syncronization.runMode).toBeDefined();
	expect(syncronization.runMode).toBe(RunningMode.LIVE);
	expect(syncronization.scanned).toBe(1);
	expect(syncronization.created).toBe(1);

	// Make sure the changes in the "LDAP server" were persisted in the database
	const localLdapUsers = await Db.collections.User.find({ signInType: SignInType.LDAP });
	expect(localLdapUsers.length).toBe(1);
	expect(localLdapUsers[0].email).toBe(ldapUser.mail);
	expect(localLdapUsers[0].lastName).toBe(ldapUser.sn);
	expect(localLdapUsers[0].firstName).toBe(ldapUser.givenName);
	expect(localLdapUsers[0].ldapId).toBe(ldapUser.uid);
});

test('POST /ldap/sync?type=live should detect updated user and persist change in model', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({
		attributeMapping: { ldapId: 'uid', firstName: 'givenName', lastName: 'sn', email: 'mail' },
	});

	LdapManager.updateConfig(ldapConfig.data as LdapConfig);

	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const ldapUser = {
		mail: randomEmail(),
		dn: '',
		sn: 'updated',
		givenName: randomName(),
		uid: uniqueId(),
	};

	const member = await testDb.createUser({
		globalRole: globalMemberRole,
		email: ldapUser.mail,
		firstName: ldapUser.givenName,
		lastName: randomName(),
		ldapId: ldapUser.uid,
		signInType: SignInType.LDAP,
	});

	jest
		.spyOn(LdapService.prototype, 'searchWithAdminBinding')
		.mockImplementation(() => Promise.resolve([ldapUser]));

	const response = await authAgent(owner).post('/ldap/sync').send({ type: RunningMode.LIVE });

	expect(response.statusCode).toBe(200);

	const syncronization = await Db.collections.LdapSyncHistory.findOneOrFail();

	expect(syncronization.id).toBeDefined();
	expect(syncronization.startedAt).toBeDefined();
	expect(syncronization.endedAt).toBeDefined();
	expect(syncronization.created).toBeDefined();
	expect(syncronization.updated).toBeDefined();
	expect(syncronization.disabled).toBeDefined();
	expect(syncronization.status).toBeDefined();
	expect(syncronization.scanned).toBeDefined();
	expect(syncronization.error).toBeDefined();
	expect(syncronization.runMode).toBeDefined();
	expect(syncronization.runMode).toBe(RunningMode.LIVE);
	expect(syncronization.scanned).toBe(1);
	expect(syncronization.updated).toBe(1);

	// Make sure the changes in the "LDAP server" were persisted in the database
	const localLdapUsers = await Db.collections.User.find({ signInType: SignInType.LDAP });

	expect(localLdapUsers.length).toBe(1);
	expect(localLdapUsers[0].email).toBe(ldapUser.mail);
	expect(localLdapUsers[0].lastName).toBe(ldapUser.sn);
	expect(localLdapUsers[0].firstName).toBe(ldapUser.givenName);
	expect(localLdapUsers[0].ldapId).toBe(ldapUser.uid);
});

test('POST /ldap/sync?type=live should detect disabled user and persist change in model', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({
		attributeMapping: { ldapId: 'uid', firstName: 'givenName', lastName: 'sn', email: 'mail' },
	});

	LdapManager.updateConfig(ldapConfig.data as LdapConfig);

	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const ldapUser = {
		mail: randomEmail(),
		dn: '',
		sn: 'updated',
		givenName: randomName(),
		uid: uniqueId(),
	};

	const member = await testDb.createUser({
		globalRole: globalMemberRole,
		email: ldapUser.mail,
		firstName: ldapUser.givenName,
		lastName: ldapUser.sn,
		ldapId: ldapUser.uid,
		signInType: SignInType.LDAP,
	});

	jest
		.spyOn(LdapService.prototype, 'searchWithAdminBinding')
		.mockImplementation(() => Promise.resolve([]));

	const response = await authAgent(owner).post('/ldap/sync').send({ type: RunningMode.LIVE });

	expect(response.statusCode).toBe(200);

	const syncronization = await Db.collections.LdapSyncHistory.findOneOrFail();

	expect(syncronization.id).toBeDefined();
	expect(syncronization.startedAt).toBeDefined();
	expect(syncronization.endedAt).toBeDefined();
	expect(syncronization.created).toBeDefined();
	expect(syncronization.updated).toBeDefined();
	expect(syncronization.disabled).toBeDefined();
	expect(syncronization.status).toBeDefined();
	expect(syncronization.scanned).toBeDefined();
	expect(syncronization.error).toBeDefined();
	expect(syncronization.runMode).toBeDefined();
	expect(syncronization.runMode).toBe(RunningMode.LIVE);
	expect(syncronization.scanned).toBe(0);
	expect(syncronization.disabled).toBe(1);

	// Make sure the changes in the "LDAP server" were persisted in the database
	const localLdapUsers = await Db.collections.User.find({ signInType: SignInType.LDAP });

	expect(localLdapUsers.length).toBe(1);
	expect(localLdapUsers[0].email).toBe(ldapUser.mail);
	expect(localLdapUsers[0].lastName).toBe(ldapUser.sn);
	expect(localLdapUsers[0].firstName).toBe(ldapUser.givenName);
	expect(localLdapUsers[0].ldapId).toBe(ldapUser.uid);
	expect(localLdapUsers[0].disabled).toBe(true);
});

test('GET /ldap/sync should return paginated syncronizations', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const syncronizationData = {
		created: 0,
		scanned: 0,
		updated: 0,
		disabled: 0,
		startedAt: new Date(),
		endedAt: new Date(),
		status: 'success',
		runMode: RunningMode.DRY,
	};

	for (const _ of Array(2).fill(2)) {
		const syncronization = new ADSync();
		Object.assign(syncronization, syncronizationData);
		await Db.collections.LdapSyncHistory.save(syncronization);
	}

	let response = await authAgent(owner).get('/ldap/sync?perPage=1&page=0');
	expect(response.body.data.length).toBe(1);
	// expect(response.body.data[0].id).toBe(2);

	response = await authAgent(owner).get('/ldap/sync?perPage=1&page=1');
	expect(response.body.data.length).toBe(1);
	// expect(response.body.data[0].id).toBe(1);
});

test('POST /login should allow new LDAP user to login and syncronize data', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({
		login: { enabled: true, loginLabel: '' },
		attributeMapping: { ldapId: 'uid', firstName: 'givenName', lastName: 'sn', email: 'mail' },
		binding: { baseDn: 'baseDn', adminDn: 'adminDn', adminPassword: 'adminPassword' },
	});

	LdapManager.updateConfig(ldapConfig.data as LdapConfig);

	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authlessAgent = utils.createAgent(app);

	const ldapUser = {
		mail: randomEmail(),
		dn: '',
		sn: '',
		givenName: randomName(),
		uid: uniqueId(),
	};

	jest
		.spyOn(LdapService.prototype, 'searchWithAdminBinding')
		.mockImplementation(() => Promise.resolve([ldapUser]));

	jest.spyOn(LdapService.prototype, 'validUser').mockImplementation(() => Promise.resolve());

	const response = await authlessAgent
		.post('/login')
		.send({ email: ldapUser.mail, password: 'password' });

	expect(response.headers['set-cookie']).toBeDefined();
	expect(response.headers['set-cookie'][0] as string).toContain('n8n-auth=');

	expect(response.statusCode).toBe(200);

	// Make sure the changes in the "LDAP server" were persisted in the database
	const localLdapUsers = await Db.collections.User.find({ signInType: SignInType.LDAP });

	expect(localLdapUsers.length).toBe(1);
	expect(localLdapUsers[0].email).toBe(ldapUser.mail);
	expect(localLdapUsers[0].lastName).toBe(ldapUser.sn);
	expect(localLdapUsers[0].firstName).toBe(ldapUser.givenName);
	expect(localLdapUsers[0].ldapId).toBe(ldapUser.uid);
	expect(localLdapUsers[0].disabled).toBe(false);
});

test('POST /login should allow existing LDAP user to login and syncronize data', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({
		login: { enabled: true, loginLabel: '' },
		attributeMapping: { ldapId: 'uid', firstName: 'givenName', lastName: 'sn', email: 'mail' },
		binding: { baseDn: 'baseDn', adminDn: 'adminDn', adminPassword: 'adminPassword' },
	});

	LdapManager.updateConfig(ldapConfig.data as LdapConfig);

	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authlessAgent = utils.createAgent(app);

	const ldapUser = {
		mail: randomEmail(),
		dn: '',
		sn: 'updated',
		givenName: randomName(),
		uid: uniqueId(),
	};

	const member = await testDb.createUser({
		globalRole: globalMemberRole,
		email: ldapUser.mail,
		firstName: ldapUser.givenName,
		lastName: 'lastname',
		ldapId: ldapUser.uid,
		signInType: SignInType.LDAP,
	});

	jest
		.spyOn(LdapService.prototype, 'searchWithAdminBinding')
		.mockImplementation(() => Promise.resolve([ldapUser]));

	jest.spyOn(LdapService.prototype, 'validUser').mockImplementation(() => Promise.resolve());

	const response = await authlessAgent
		.post('/login')
		.send({ email: ldapUser.mail, password: 'password' });

	expect(response.headers['set-cookie']).toBeDefined();
	expect(response.headers['set-cookie'][0] as string).toContain('n8n-auth=');

	expect(response.statusCode).toBe(200);

	// Make sure the changes in the "LDAP server" were persisted in the database
	const localLdapUsers = await Db.collections.User.find({ signInType: SignInType.LDAP });

	expect(localLdapUsers.length).toBe(1);
	expect(localLdapUsers[0].email).toBe(ldapUser.mail);
	expect(localLdapUsers[0].lastName).toBe(ldapUser.sn);
	expect(localLdapUsers[0].firstName).toBe(ldapUser.givenName);
	expect(localLdapUsers[0].ldapId).toBe(ldapUser.uid);
	expect(localLdapUsers[0].disabled).toBe(false);
});
