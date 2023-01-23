import express from 'express';

import config from '@/config';
import * as Db from '@/Db';
import type { Role } from '@db/entities/Role';
import { LdapSyncHistory as ADSync } from '@db/entities/LdapSyncHistory';
import { randomEmail, randomName, uniqueId } from './../shared/random';
import * as testDb from './../shared/testDb';
import type { AuthAgent } from '../shared/types';
import * as utils from '../shared/utils';

import { LDAP_DEFAULT_CONFIGURATION, LDAP_ENABLED, RunningMode } from '@/Ldap/constants';
import { LdapManager } from '@/Ldap/LdapManager.ee';
import { LdapService } from '@/Ldap/LdapService.ee';

jest.mock('@/telemetry');
jest.mock('@/UserManagement/email/NodeMailer');

let app: express.Application;
let globalMemberRole: Role;
let globalOwnerRole: Role;
let authAgent: AuthAgent;

beforeAll(async () => {
	await testDb.init();
	app = await utils.initTestServer({ endpointGroups: ['auth', 'ldap'], applyAuth: true });

	const [fetchedGlobalOwnerRole, fetchedGlobalMemberRole] = await testDb.getAllRoles();

	globalOwnerRole = fetchedGlobalOwnerRole;
	globalMemberRole = fetchedGlobalMemberRole;

	authAgent = utils.createAuthAgent(app);

	config.set(LDAP_ENABLED, true);

	utils.initConfigFile();
	utils.initTestLogger();
	utils.initLdapManager();
	utils.initTestTelemetry();
});

beforeEach(async () => {
	await testDb.truncate([
		'User',
		'AuthIdentity',
		'SharedCredentials',
		'SharedWorkflow',
		'Workflow',
		'Credentials',
		'FeatureConfig',
		'LdapSyncHistory',
	]);

	jest.mock('@/telemetry');

	config.set('userManagement.disabled', false);
	config.set('userManagement.isInstanceOwnerSetUp', true);
	config.set('userManagement.emails.mode', '');
	config.set('enterprise.features.ldap', true);
});

afterAll(async () => {
	await testDb.terminate();
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

test('PUT /ldap/config route should update model', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	await testDb.createLdapDefaultConfig();

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

test('GET /ldap/config route should retrieve current configuration', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	await testDb.createLdapDefaultConfig();

	const validPayload = {
		...LDAP_DEFAULT_CONFIGURATION,
		loginEnabled: true,
		loginLabel: '',
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

	const synchronization = await Db.collections.LdapSyncHistory.findOneByOrFail({});

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
	expect(synchronization.runMode).toBe(RunningMode.DRY);
	expect(synchronization.scanned).toBe(1);
	expect(synchronization.created).toBe(1);

	// Make sure only the instance owner is on the DB

	const localDbUsers = await Db.collections.User.find();
	expect(localDbUsers.length).toBe(1);
	expect(localDbUsers[0].id).toBe(owner.id);
});

test('POST /ldap/sync?type=dry should detect updated user but not persist change in model', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({ ldapIdAttribute: 'uid' });

	LdapManager.updateConfig(ldapConfig);

	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const ldapUserEmail = randomEmail();

	const ldapUserId = uniqueId();

	const member = await testDb.createLdapUser(
		{
			globalRole: globalMemberRole,
			email: ldapUserEmail,
		},
		ldapUserId,
	);

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

	const synchronization = await Db.collections.LdapSyncHistory.findOneByOrFail({});

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
	expect(synchronization.runMode).toBe(RunningMode.DRY);
	expect(synchronization.scanned).toBe(1);
	expect(synchronization.updated).toBe(1);

	// Make sure the changes in the "LDAP server" were not persisted in the database
	const localLdapIdentities = await getLdapIdentities();
	const localLdapUsers = localLdapIdentities.map(({ user }) => user);
	expect(localLdapUsers.length).toBe(1);
	expect(localLdapUsers[0].id).toBe(member.id);
	expect(localLdapUsers[0].lastName).toBe(member.lastName);
});

test('POST /ldap/sync?type=dry should detect disabled user but not persist change in model', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({ ldapIdAttribute: 'uid' });

	LdapManager.updateConfig(ldapConfig);

	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const ldapUserEmail = randomEmail();

	const ldapUserId = uniqueId();

	const member = await testDb.createLdapUser(
		{
			globalRole: globalMemberRole,
			email: ldapUserEmail,
		},
		ldapUserId,
	);

	jest
		.spyOn(LdapService.prototype, 'searchWithAdminBinding')
		.mockImplementation(() => Promise.resolve([]));

	const response = await authAgent(owner).post('/ldap/sync').send({ type: RunningMode.DRY });

	expect(response.statusCode).toBe(200);

	const synchronization = await Db.collections.LdapSyncHistory.findOneByOrFail({});

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
	expect(synchronization.runMode).toBe(RunningMode.DRY);
	expect(synchronization.scanned).toBe(0);
	expect(synchronization.disabled).toBe(1);

	// Make sure the changes in the "LDAP server" were not persisted in the database
	const localLdapIdentities = await getLdapIdentities();
	const localLdapUsers = localLdapIdentities.map(({ user }) => user);
	expect(localLdapUsers.length).toBe(1);
	expect(localLdapUsers[0].id).toBe(member.id);
	expect(localLdapUsers[0].disabled).toBe(false);
});

test('POST /ldap/sync?type=live should detect new user and persist change in model', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({
		ldapIdAttribute: 'uid',
		firstNameAttribute: 'givenName',
		lastNameAttribute: 'sn',
		emailAttribute: 'mail',
	});

	LdapManager.updateConfig(ldapConfig);

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

	const synchronization = await Db.collections.LdapSyncHistory.findOneByOrFail({});

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
	expect(synchronization.runMode).toBe(RunningMode.LIVE);
	expect(synchronization.scanned).toBe(1);
	expect(synchronization.created).toBe(1);

	// Make sure the changes in the "LDAP server" were persisted in the database
	const allUsers = await getAllUsers();
	expect(allUsers.length).toBe(2);
	expect(allUsers[0].email).toBe(owner.email);
	expect(allUsers[1].email).toBe(ldapUser.mail);
	expect(allUsers[1].lastName).toBe(ldapUser.sn);
	expect(allUsers[1].firstName).toBe(ldapUser.givenName);

	const authIdentities = await getLdapIdentities();
	expect(authIdentities.length).toBe(1);
	expect(authIdentities[0].providerId).toBe(ldapUser.uid);
	expect(authIdentities[0].providerType).toBe('ldap');
});

test('POST /ldap/sync?type=live should detect updated user and persist change in model', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({
		ldapIdAttribute: 'uid',
		firstNameAttribute: 'givenName',
		lastNameAttribute: 'sn',
		emailAttribute: 'mail',
	});

	LdapManager.updateConfig(ldapConfig);

	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

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

	jest
		.spyOn(LdapService.prototype, 'searchWithAdminBinding')
		.mockImplementation(() => Promise.resolve([ldapUser]));

	const response = await authAgent(owner).post('/ldap/sync').send({ type: RunningMode.LIVE });

	expect(response.statusCode).toBe(200);

	const synchronization = await Db.collections.LdapSyncHistory.findOneByOrFail({});

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
	expect(synchronization.runMode).toBe(RunningMode.LIVE);
	expect(synchronization.scanned).toBe(1);
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

test('POST /ldap/sync?type=live should detect disabled user and persist change in model', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({
		ldapIdAttribute: 'uid',
		firstNameAttribute: 'givenName',
		lastNameAttribute: 'sn',
		emailAttribute: 'mail',
	});

	LdapManager.updateConfig(ldapConfig);

	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

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

	jest
		.spyOn(LdapService.prototype, 'searchWithAdminBinding')
		.mockImplementation(() => Promise.resolve([]));

	const response = await authAgent(owner).post('/ldap/sync').send({ type: RunningMode.LIVE });

	expect(response.statusCode).toBe(200);

	const synchronization = await Db.collections.LdapSyncHistory.findOneByOrFail({});

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
	expect(synchronization.runMode).toBe(RunningMode.LIVE);
	expect(synchronization.scanned).toBe(0);
	expect(synchronization.disabled).toBe(1);

	// Make sure the changes in the "LDAP server" were persisted in the database
	const allUsers = await getAllUsers();
	expect(allUsers.length).toBe(2);
	expect(allUsers[0].email).toBe(owner.email);
	expect(allUsers[1].email).toBe(ldapUser.mail);
	expect(allUsers[1].lastName).toBe(ldapUser.sn);
	expect(allUsers[1].firstName).toBe(ldapUser.givenName);
	expect(allUsers[1].disabled).toBe(true);

	const authIdentities = await getLdapIdentities();
	expect(authIdentities.length).toBe(0);
});

test('GET /ldap/sync should return paginated synchronizations', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const synchronizationData = {
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
		const synchronization = new ADSync();
		Object.assign(synchronization, synchronizationData);
		await Db.collections.LdapSyncHistory.save(synchronization);
	}

	let response = await authAgent(owner).get('/ldap/sync?perPage=1&page=0');
	expect(response.body.data.length).toBe(1);
	// expect(response.body.data[0].id).toBe(2);

	response = await authAgent(owner).get('/ldap/sync?perPage=1&page=1');
	expect(response.body.data.length).toBe(1);
	// expect(response.body.data[0].id).toBe(1);
});

test('POST /login should allow new LDAP user to login and synchronize data', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({
		loginEnabled: true,
		loginLabel: '',
		ldapIdAttribute: 'uid',
		firstNameAttribute: 'givenName',
		lastNameAttribute: 'sn',
		emailAttribute: 'mail',
		baseDn: 'baseDn',
		bindingAdminDn: 'adminDn',
		bindingAdminPassword: 'adminPassword',
	});
	LdapManager.updateConfig(ldapConfig);

	await testDb.createUser({ globalRole: globalOwnerRole });

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
	const localLdapIdentities = await getLdapIdentities();
	const localLdapUsers = localLdapIdentities.map(({ user }) => user);

	expect(localLdapUsers.length).toBe(1);
	expect(localLdapUsers[0].email).toBe(ldapUser.mail);
	expect(localLdapUsers[0].lastName).toBe(ldapUser.sn);
	expect(localLdapUsers[0].firstName).toBe(ldapUser.givenName);
	expect(localLdapIdentities[0].providerId).toBe(ldapUser.uid);
	expect(localLdapUsers[0].disabled).toBe(false);
});

test('POST /login should allow existing LDAP user to login and synchronize data', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({
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
	});

	LdapManager.updateConfig(ldapConfig);

	await testDb.createUser({ globalRole: globalOwnerRole });

	const authlessAgent = utils.createAgent(app);

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
	const localLdapIdentities = await getLdapIdentities();
	const localLdapUsers = localLdapIdentities.map(({ user }) => user);

	expect(localLdapUsers.length).toBe(1);
	expect(localLdapUsers[0].email).toBe(ldapUser.mail);
	expect(localLdapUsers[0].lastName).toBe(ldapUser.sn);
	expect(localLdapUsers[0].firstName).toBe(ldapUser.givenName);
	expect(localLdapIdentities[0].providerId).toBe(ldapUser.uid);
	expect(localLdapUsers[0].disabled).toBe(false);
});

test('POST /login should transform email user into LDAP user when match found', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({
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
	});

	LdapManager.updateConfig(ldapConfig);

	await testDb.createUser({ globalRole: globalOwnerRole });

	const authlessAgent = utils.createAgent(app);

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
	const localLdapIdentities = await getLdapIdentities();
	const localLdapUsers = localLdapIdentities.map(({ user }) => user);

	expect(localLdapUsers.length).toBe(1);
	expect(localLdapUsers[0].email).toBe(ldapUser.mail);
	expect(localLdapUsers[0].lastName).toBe(ldapUser.sn);
	expect(localLdapUsers[0].firstName).toBe(ldapUser.givenName);
	expect(localLdapIdentities[0].providerId).toBe(ldapUser.uid);
	expect(localLdapUsers[0].disabled).toBe(false);
});

test('PUT /ldap/config should apply "Convert all LDAP users to email users" strategy when LDAP login disabled', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({
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
	});

	LdapManager.updateConfig(ldapConfig);

	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const member = await testDb.createLdapUser(
		{
			globalRole: globalMemberRole,
		},
		uniqueId(),
	);

	const configuration = ldapConfig;

	// disable the login, so the strategy is applied
	await authAgent(owner)
		.put('/ldap/config')
		.send({ ...configuration, loginEnabled: false });

	const emailUser = await Db.collections.User.findOneByOrFail({ id: member.id });
	const localLdapIdentities = await getLdapIdentities();

	expect(emailUser.email).toBe(member.email);
	expect(emailUser.lastName).toBe(member.lastName);
	expect(emailUser.firstName).toBe(member.firstName);
	expect(localLdapIdentities.length).toEqual(0);
});

test('Instance owner should able to delete LDAP users', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({
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
	});

	LdapManager.updateConfig(ldapConfig);

	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const member = await testDb.createLdapUser(
		{
			globalRole: globalMemberRole,
		},
		uniqueId(),
	);

	// delete the remember
	await authAgent(owner).post(`/users/${member.id}`);
});

test('Instance owner should able to delete LDAP users and transfer workflows and credentials', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({
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
	});

	LdapManager.updateConfig(ldapConfig);

	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const member = await testDb.createLdapUser(
		{
			globalRole: globalMemberRole,
		},
		uniqueId(),
	);

	// delete the LDAP member and transfer its workflows/credentials to instance owner
	await authAgent(owner).post(`/users/${member.id}?transferId=${owner.id}`);
});

test('Sign-type should be returned when listing users', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({
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
	});

	LdapManager.updateConfig(ldapConfig);

	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	await testDb.createLdapUser(
		{
			globalRole: globalMemberRole,
		},
		uniqueId(),
	);

	const response = await authAgent(owner).get(`/users`);

	const { data } = response.body;

	expect(data[0].signInType).toStrictEqual('email');
	expect(data[1].signInType).toStrictEqual('ldap');
});

test('Once user disabled during synchronization it should lose access to the instance', async () => {
	const ldapConfig = await testDb.createLdapDefaultConfig({
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
	});

	LdapManager.updateConfig(ldapConfig);

	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const member = await testDb.createLdapUser(
		{
			globalRole: globalMemberRole,
		},
		uniqueId(),
	);

	jest
		.spyOn(LdapService.prototype, 'searchWithAdminBinding')
		.mockImplementation(() => Promise.resolve([]));

	await authAgent(owner).post('/ldap/sync').send({ type: RunningMode.LIVE });

	const response = await authAgent(member).get(`/login`);

	expect(response.body.code).toBe(401);
});

const getLdapIdentities = () =>
	Db.collections.AuthIdentity.find({
		where: { providerType: 'ldap' },
		relations: ['user'],
	});

const getAllUsers = () => Db.collections.User.find({ relations: ['globalRole'] });
