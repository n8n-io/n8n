import express from 'express';
import validator from 'validator';
import config from '@/config';
import * as Db from '@/Db';
import { AUTH_COOKIE_NAME } from '@/constants';
import type { Role } from '@db/entities/Role';
import { LOGGED_OUT_RESPONSE_BODY } from './shared/constants';
import { randomValidPassword } from './shared/random';
import * as testDb from './shared/testDb';
import type { AuthAgent } from './shared/types';
import * as utils from './shared/utils';

let app: express.Application;
let globalOwnerRole: Role;
let globalMemberRole: Role;
let authAgent: AuthAgent;

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['auth'] });

	globalOwnerRole = await testDb.getGlobalOwnerRole();
	globalMemberRole = await testDb.getGlobalMemberRole();

	authAgent = utils.createAuthAgent(app);
});

beforeEach(async () => {
	await testDb.truncate(['User']);

	config.set('ldap.disabled', true);

	config.set('userManagement.isInstanceOwnerSetUp', true);

	await Db.collections.Settings.update(
		{ key: 'userManagement.isInstanceOwnerSetUp' },
		{ value: JSON.stringify(true) },
	);
});

afterAll(async () => {
	await testDb.terminate();
});

test('POST /login should log user in', async () => {
	const ownerPassword = randomValidPassword();
	const owner = await testDb.createUser({
		password: ownerPassword,
		globalRole: globalOwnerRole,
	});

	const authlessAgent = utils.createAgent(app);

	const response = await authlessAgent.post('/login').send({
		email: owner.email,
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
		globalRole,
		resetPasswordToken,
		apiKey,
	} = response.body.data;

	expect(validator.isUUID(id)).toBe(true);
	expect(email).toBe(owner.email);
	expect(firstName).toBe(owner.firstName);
	expect(lastName).toBe(owner.lastName);
	expect(password).toBeUndefined();
	expect(personalizationAnswers).toBeNull();
	expect(password).toBeUndefined();
	expect(resetPasswordToken).toBeUndefined();
	expect(globalRole).toBeDefined();
	expect(globalRole.name).toBe('owner');
	expect(globalRole.scope).toBe('global');
	expect(apiKey).toBeUndefined();

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeDefined();
});

test('GET /login should return 401 Unauthorized if no cookie', async () => {
	const authlessAgent = utils.createAgent(app);

	const response = await authlessAgent.get('/login');

	expect(response.statusCode).toBe(401);

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeUndefined();
});

test('GET /login should return cookie if UM is disabled and no cookie is already set', async () => {
	const authlessAgent = utils.createAgent(app);
	await testDb.createUserShell(globalOwnerRole);

	config.set('userManagement.isInstanceOwnerSetUp', false);

	await Db.collections.Settings.update(
		{ key: 'userManagement.isInstanceOwnerSetUp' },
		{ value: JSON.stringify(false) },
	);

	const response = await authlessAgent.get('/login');

	expect(response.statusCode).toBe(200);

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeDefined();
});

test('GET /login should return 401 Unauthorized if invalid cookie', async () => {
	const invalidAuthAgent = utils.createAgent(app);
	invalidAuthAgent.jar.setCookie(`${AUTH_COOKIE_NAME}=invalid`);

	const response = await invalidAuthAgent.get('/login');

	expect(response.statusCode).toBe(401);

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeUndefined();
});

test('GET /login should return logged-in owner shell', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	const response = await authAgent(ownerShell).get('/login');

	expect(response.statusCode).toBe(200);

	const {
		id,
		email,
		firstName,
		lastName,
		password,
		personalizationAnswers,
		globalRole,
		resetPasswordToken,
		apiKey,
	} = response.body.data;

	expect(validator.isUUID(id)).toBe(true);
	expect(email).toBeDefined();
	expect(firstName).toBeNull();
	expect(lastName).toBeNull();
	expect(password).toBeUndefined();
	expect(personalizationAnswers).toBeNull();
	expect(password).toBeUndefined();
	expect(resetPasswordToken).toBeUndefined();
	expect(globalRole).toBeDefined();
	expect(globalRole.name).toBe('owner');
	expect(globalRole.scope).toBe('global');
	expect(apiKey).toBeUndefined();

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeUndefined();
});

test('GET /login should return logged-in member shell', async () => {
	const memberShell = await testDb.createUserShell(globalMemberRole);

	const response = await authAgent(memberShell).get('/login');

	expect(response.statusCode).toBe(200);

	const {
		id,
		email,
		firstName,
		lastName,
		password,
		personalizationAnswers,
		globalRole,
		resetPasswordToken,
		apiKey,
	} = response.body.data;

	expect(validator.isUUID(id)).toBe(true);
	expect(email).toBeDefined();
	expect(firstName).toBeNull();
	expect(lastName).toBeNull();
	expect(password).toBeUndefined();
	expect(personalizationAnswers).toBeNull();
	expect(password).toBeUndefined();
	expect(resetPasswordToken).toBeUndefined();
	expect(globalRole).toBeDefined();
	expect(globalRole.name).toBe('member');
	expect(globalRole.scope).toBe('global');
	expect(apiKey).toBeUndefined();

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeUndefined();
});

test('GET /login should return logged-in owner', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const response = await authAgent(owner).get('/login');

	expect(response.statusCode).toBe(200);

	const {
		id,
		email,
		firstName,
		lastName,
		password,
		personalizationAnswers,
		globalRole,
		resetPasswordToken,
		apiKey,
	} = response.body.data;

	expect(validator.isUUID(id)).toBe(true);
	expect(email).toBe(owner.email);
	expect(firstName).toBe(owner.firstName);
	expect(lastName).toBe(owner.lastName);
	expect(password).toBeUndefined();
	expect(personalizationAnswers).toBeNull();
	expect(password).toBeUndefined();
	expect(resetPasswordToken).toBeUndefined();
	expect(globalRole).toBeDefined();
	expect(globalRole.name).toBe('owner');
	expect(globalRole.scope).toBe('global');
	expect(apiKey).toBeUndefined();

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeUndefined();
});

test('GET /login should return logged-in member', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole });

	const response = await authAgent(member).get('/login');

	expect(response.statusCode).toBe(200);

	const {
		id,
		email,
		firstName,
		lastName,
		password,
		personalizationAnswers,
		globalRole,
		resetPasswordToken,
		apiKey,
	} = response.body.data;

	expect(validator.isUUID(id)).toBe(true);
	expect(email).toBe(member.email);
	expect(firstName).toBe(member.firstName);
	expect(lastName).toBe(member.lastName);
	expect(password).toBeUndefined();
	expect(personalizationAnswers).toBeNull();
	expect(password).toBeUndefined();
	expect(resetPasswordToken).toBeUndefined();
	expect(globalRole).toBeDefined();
	expect(globalRole.name).toBe('member');
	expect(globalRole.scope).toBe('global');
	expect(apiKey).toBeUndefined();

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeUndefined();
});

test('GET /resolve-signup-token should validate invite token', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const memberShell = await testDb.createUserShell(globalMemberRole);

	const response = await authAgent(owner)
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

test('GET /resolve-signup-token should fail with invalid inputs', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const authOwnerAgent = authAgent(owner);

	const { id: inviteeId } = await testDb.createUser({ globalRole: globalMemberRole });

	const first = await authOwnerAgent.get('/resolve-signup-token').query({ inviterId: owner.id });

	const second = await authOwnerAgent.get('/resolve-signup-token').query({ inviteeId });

	const third = await authOwnerAgent.get('/resolve-signup-token').query({
		inviterId: '5531199e-b7ae-425b-a326-a95ef8cca59d',
		inviteeId: 'cb133beb-7729-4c34-8cd1-a06be8834d9d',
	});

	// user is already set up, so call should error
	const fourth = await authOwnerAgent
		.get('/resolve-signup-token')
		.query({ inviterId: owner.id })
		.query({ inviteeId });

	// cause inconsistent DB state
	await Db.collections.User.update(owner.id, { email: '' });
	const fifth = await authOwnerAgent
		.get('/resolve-signup-token')
		.query({ inviterId: owner.id })
		.query({ inviteeId });

	for (const response of [first, second, third, fourth, fifth]) {
		expect(response.statusCode).toBe(400);
	}
});

test('POST /logout should log user out', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const response = await authAgent(owner).post('/logout');

	expect(response.statusCode).toBe(200);
	expect(response.body).toEqual(LOGGED_OUT_RESPONSE_BODY);

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeUndefined();
});
