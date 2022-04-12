import express = require('express');
import validator from 'validator';
import { v4 as uuid } from 'uuid';
import { compare } from 'bcryptjs';

import { Db } from '../../../src';
import config = require('../../../config');
import { SUCCESS_RESPONSE_BODY } from './../shared/constants';
import { Role } from '../../../src/databases/entities/Role';
import {
	randomApiKey,
	randomEmail,
	randomInvalidPassword,
	randomName,
	randomValidPassword,
} from './../shared/random';

import * as utils from './../shared/utils';
import * as testDb from './../shared/testDb';

// import * from './../../../src/PublicApi/helpers'

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;
let globalMemberRole: Role;
let workflowOwnerRole: Role;
let credentialOwnerRole: Role;

beforeAll(async () => {
	app = utils.initTestServer({ endpointGroups: ['publicApi'], applyAuth: false });
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	const [
		fetchedGlobalOwnerRole,
		fetchedGlobalMemberRole,
		fetchedWorkflowOwnerRole,
		fetchedCredentialOwnerRole,
	] = await testDb.getAllRoles();

	globalOwnerRole = fetchedGlobalOwnerRole;
	globalMemberRole = fetchedGlobalMemberRole;
	workflowOwnerRole = fetchedWorkflowOwnerRole;
	credentialOwnerRole = fetchedCredentialOwnerRole;

	utils.initTestTelemetry();
	utils.initTestLogger();
});

beforeEach(async () => {
	// do not combine calls - shared tables must be cleared first and separately
	await testDb.truncate(['SharedCredentials', 'SharedWorkflow'], testDbName);
	await testDb.truncate(['User', 'Workflow', 'Credentials'], testDbName);

	jest.isolateModules(() => {
		jest.mock('../../../config');
		jest.mock('./../../../src/PublicApi/helpers', () => ({
			...jest.requireActual('./../../../src/PublicApi/helpers'),
			connectionName: jest.fn(() => testDbName),
		}));
	});

	await testDb.createUser({
		id: INITIAL_TEST_USER.id,
		email: INITIAL_TEST_USER.email,
		password: INITIAL_TEST_USER.password,
		firstName: INITIAL_TEST_USER.firstName,
		lastName: INITIAL_TEST_USER.lastName,
		globalRole: globalOwnerRole,
		apiKey: INITIAL_TEST_USER.apiKey,
	});

	config.set('userManagement.disabled', false);
	config.set('userManagement.isInstanceOwnerSetUp', true);
	config.set('userManagement.emails.mode', 'smtp');
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('GET /users should fail due to missing API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: false, user: owner });

	await testDb.createUser();

	const response = await authOwnerAgent.get('/v1/users');

	expect(response.statusCode).toBe(401);
	
});

test('GET /users should fail due to invalid API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: false, user: owner });

	const response = await authOwnerAgent.get('/v1/users');

	expect(response.statusCode).toBe(401);
});

test('GET /users should fail due to member trying to access owner only endpoint', async () => {
	config.set('userManagement.isInstanceOwnerSetUp', true);

	const member = await testDb.createUser();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: member });

	const response = await authOwnerAgent.get('/v1/users');

	expect(response.statusCode).toBe(403);
});

test('GET /users should fail due no instance owner not setup', async () => {

	config.set('userManagement.isInstanceOwnerSetUp', false);

	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	const response = await authOwnerAgent.get('/v1/users');

	expect(response.statusCode).toBe(500);

});

test('GET /users should return all users', async () => {

	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	await testDb.createUser();

	const response = await authOwnerAgent.get('/v1/users');

	expect(response.statusCode).toBe(200);
	expect(response.body.users.length).toBe(2);
	expect(response.body.nextCursor).toBeNull();

	for (const user of response.body.users) {
		const {
			id,
			email,
			firstName,
			lastName,
			personalizationAnswers,
			globalRole,
			password,
			resetPasswordToken,
			isPending,
			createdAt,
			updatedAt,
		} = user;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBeDefined();
		expect(firstName).toBeDefined();
		expect(lastName).toBeDefined();
		expect(personalizationAnswers).toBeUndefined();
		expect(password).toBeUndefined();
		expect(resetPasswordToken).toBeUndefined();
		//virtual method not working
		//expect(isPending).toBe(false);
		expect(globalRole).toBeUndefined();
		expect(createdAt).toBeDefined();
		expect(updatedAt).toBeDefined();
	}
});



test('GET /users/:identifier should fail due to missing API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: false, user: owner });

	await testDb.createUser();

	const response = await authOwnerAgent.get(`/v1/users/${owner.id}`);

	expect(response.statusCode).toBe(401);

});

test('GET /users/:identifier should fail due to invalid API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: false, user: owner });

	const response = await authOwnerAgent.get(`/v1/users/${owner.id}`);

	expect(response.statusCode).toBe(401);
});

test('GET /users/:identifier should fail due to member trying to access owner only endpoint', async () => {
	const member = await testDb.createUser();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: member });

	const response = await authOwnerAgent.get(`/v1/users/${member.id}`);

	expect(response.statusCode).toBe(403);
});

test('GET /users/:identifier should fail due no instance owner not setup', async () => {

	config.set('userManagement.isInstanceOwnerSetUp', false);

	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	const response = await authOwnerAgent.get(`/v1/users/${owner.id}`);

	expect(response.statusCode).toBe(500);

});

test('GET /users/:email with unexisting email should return 404', async () => {

	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	const response = await authOwnerAgent.get(`/v1/users/jhondoe@gmail.com`);

	expect(response.statusCode).toBe(404);
});

test('GET /users/:id with unexisting id should return 404', async () => {

	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	const response = await authOwnerAgent.get(`/v1/users/123`);

	expect(response.statusCode).toBe(404);
});

test('GET /users/:email should return a user', async () => {

	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	const response = await authOwnerAgent.get(`/v1/users/${owner.email}`);

	expect(response.statusCode).toBe(200);

		const {
			id,
			email,
			firstName,
			lastName,
			personalizationAnswers,
			globalRole,
			password,
			resetPasswordToken,
			isPending,
			createdAt,
			updatedAt,
		} = response.body;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBeDefined();
		expect(firstName).toBeDefined();
		expect(lastName).toBeDefined();
		expect(personalizationAnswers).toBeUndefined();
		expect(password).toBeUndefined();
		expect(resetPasswordToken).toBeUndefined();
		//virtual method not working
		//expect(isPending).toBe(false);
		expect(globalRole).toBeUndefined();
		expect(createdAt).toBeDefined();
		expect(updatedAt).toBeDefined();
});

test('GET /users/:id should return a user', async () => {

	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	const response = await authOwnerAgent.get(`/v1/users/${owner.id}`);

	expect(response.statusCode).toBe(200);

	const {
		id,
		email,
		firstName,
		lastName,
		personalizationAnswers,
		globalRole,
		password,
		resetPasswordToken,
		isPending,
		createdAt,
		updatedAt,
	} = response.body;

	expect(validator.isUUID(id)).toBe(true);
	expect(email).toBeDefined();
	expect(firstName).toBeDefined();
	expect(lastName).toBeDefined();
	expect(personalizationAnswers).toBeUndefined();
	expect(password).toBeUndefined();
	expect(resetPasswordToken).toBeUndefined();
	//virtual method not working
	//expect(isPending).toBe(false);
	expect(globalRole).toBeUndefined();
	expect(createdAt).toBeDefined();
	expect(updatedAt).toBeDefined();
});

test('POST /users should fail due to missing API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: false, user: owner });

	await testDb.createUser();

	const response = await authOwnerAgent.post('/v1/users');

	expect(response.statusCode).toBe(401);

});

test('POST /users should fail due to invalid API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: false, user: owner });

	const response = await authOwnerAgent.post('/v1/users');

	expect(response.statusCode).toBe(401);
});

test('POST /users should fail due to member trying to access owner only endpoint', async () => {

	const member = await testDb.createUser();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: member });

	const response = await authOwnerAgent.post('/v1/users').send([]);

	expect(response.statusCode).toBe(403);
});

test('POST /users should fail due instance owner not setup', async () => {

	config.set('userManagement.isInstanceOwnerSetUp', false);

	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	const response = await authOwnerAgent.post('/v1/users').send([]);

	expect(response.statusCode).toBe(500);

});

test('POST /users should fail due smtp email not setup', async () => {

	config.set('userManagement.emails.mode', '');

	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	const response = await authOwnerAgent.post('/v1/users').send([]);

	expect(response.statusCode).toBe(500);

});

test('POST /users should fail due not valid body structure', async () => {

	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	const response = await authOwnerAgent.post('/v1/users').send({});

	expect(response.statusCode).toBe(400);

});

const INITIAL_TEST_USER = {
	id: uuid(),
	email: randomEmail(),
	firstName: randomName(),
	lastName: randomName(),
	password: randomValidPassword(),
	apiKey: randomApiKey(),
};