import express = require('express');
import validator from 'validator';
import { v4 as uuid } from 'uuid';
import { compare } from 'bcryptjs';

import { Db } from '../../../src';
import config = require('../../../config');
import { SUCCESS_RESPONSE_BODY } from '../shared/constants';
import { Role } from '../../../src/databases/entities/Role';
import { randomApiKey, randomEmail, randomName, randomValidPassword } from '../shared/random';

import * as utils from '../shared/utils';
import * as testDb from '../shared/testDb';
import { createUser } from '../shared/testDb';

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;
let globalMemberRole: Role;
let workflowOwnerRole: Role;
let credentialOwnerRole: Role;

jest.mock('../../../src/telemetry');

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['publicApi'], applyAuth: false });
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

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: false,
		user: owner,
	});

	await testDb.createUser();

	const response = await authOwnerAgent.get('/users');

	expect(response.statusCode).toBe(401);
});

test('GET /users should fail due to invalid API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: false,
		user: owner,
	});

	const response = await authOwnerAgent.get('/users');

	expect(response.statusCode).toBe(401);
});

test('GET /users should fail due to member trying to access owner only endpoint', async () => {
	const member = await testDb.createUser();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: member,
	});

	const response = await authOwnerAgent.get('/users');

	expect(response.statusCode).toBe(403);
});

test('GET /users should fail due to instance owner not setup', async () => {
	config.set('userManagement.isInstanceOwnerSetUp', false);

	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: owner,
	});

	const response = await authOwnerAgent.get('/users');

	expect(response.statusCode).toBe(500);
});

test('GET /users should fail due to UM disabled', async () => {
	config.set('userManagement.disabled', true);

	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: owner,
	});

	const response = await authOwnerAgent.get('/users');

	expect(response.statusCode).toBe(500);
});

test('GET /users should return all users', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: owner,
	});

	await testDb.createUser();

	const response = await authOwnerAgent.get('/users');

	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(2);
	expect(response.body.nextCursor).toBeNull();

	for (const user of response.body.data) {
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
		expect(isPending).toBe(false);
		expect(globalRole).toBeUndefined();
		expect(createdAt).toBeDefined();
		expect(updatedAt).toBeDefined();
	}
});

test('GET /users/:identifier should fail due to missing API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: false,
		user: owner,
	});

	await testDb.createUser();

	const response = await authOwnerAgent.get(`/users/${owner.id}`);

	expect(response.statusCode).toBe(401);
});

test('GET /users/:identifier should fail due to invalid API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: false,
		user: owner,
	});

	const response = await authOwnerAgent.get(`/users/${owner.id}`);

	expect(response.statusCode).toBe(401);
});

test('GET /users/:identifier should fail due to member trying to access owner only endpoint', async () => {
	const member = await testDb.createUser();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: member,
	});

	const response = await authOwnerAgent.get(`/users/${member.id}`);

	expect(response.statusCode).toBe(403);
});

test('GET /users/:identifier should fail due no instance owner not setup', async () => {
	config.set('userManagement.isInstanceOwnerSetUp', false);

	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: owner,
	});

	const response = await authOwnerAgent.get(`/users/${owner.id}`);

	expect(response.statusCode).toBe(500);
});

test('GET /users/:email with unexisting email should return 404', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: owner,
	});

	const response = await authOwnerAgent.get(`/users/jhondoe@gmail.com`);

	expect(response.statusCode).toBe(404);
});

test('GET /users/:id with unexisting id should return 404', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: owner,
	});

	const response = await authOwnerAgent.get(`/users/test@gmail.com`);

	expect(response.statusCode).toBe(404);
});

test('GET /users/:email should return a user', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: owner,
	});

	const response = await authOwnerAgent.get(`/users/${owner.email}`);

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
	expect(isPending).toBe(false);
	expect(globalRole).toBeUndefined();
	expect(createdAt).toBeDefined();
	expect(updatedAt).toBeDefined();
});

test('GET /users/:id should return a user', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: owner,
	});

	const response = await authOwnerAgent.get(`/users/${owner.id}`);

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
	expect(globalRole).toBeUndefined();
	expect(createdAt).toBeDefined();
	expect(updatedAt).toBeDefined();
});

test('POST /users should fail due to missing API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: false,
		user: owner,
	});

	await testDb.createUser();

	const response = await authOwnerAgent.post('/users');

	expect(response.statusCode).toBe(401);
});

test('POST /users should fail due to invalid API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: false,
		user: owner,
	});

	const response = await authOwnerAgent.post('/users');

	expect(response.statusCode).toBe(401);
});

test('POST /users should fail due to member trying to access owner only endpoint', async () => {
	const member = await testDb.createUser();

	await utils.configureSmtp();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: member,
	});

	const response = await authOwnerAgent.post('/users').send([]);

	expect(response.statusCode).toBe(403);
});

test('POST /users should fail due instance owner not setup', async () => {
	config.set('userManagement.isInstanceOwnerSetUp', false);

	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: owner,
	});

	const response = await authOwnerAgent.post('/users').send([]);

	expect(response.statusCode).toBe(500);
});

test('POST /users should fail due smtp email not setup', async () => {
	config.set('userManagement.emails.mode', '');

	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: owner,
	});

	const response = await authOwnerAgent.post('/users').send([]);

	expect(response.statusCode).toBe(500);
});

test('POST /users should fail due not valid body structure', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: owner,
	});

	const response = await authOwnerAgent.post('/users').send({});

	expect(response.statusCode).toBe(400);
});

test('POST /users should fail due invalid email', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.post('/users').send([
		{
			email: '123',
		},
	]);

	expect(response.statusCode).toBe(400);
});

test('POST /users should invite member user', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	await utils.configureSmtp();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const memberEmail = randomEmail();

	const response = await authOwnerAgent.post('/users').send([
		{
			email: memberEmail,
		},
	]);

	const member = response.body[0];

	expect(response.statusCode).toBe(200);

	expect(validator.isUUID(member.id)).toBe(true);
	expect(member.email).toBe(memberEmail);
	expect(member.firstName).toBe(null);
	expect(member.firstName).toBe(null);
	expect(member.lastName).toBe(null);
	expect(member.isPending).toBe(true);
});

test('POST /users should fail due to missing API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: false,
		user: owner,
		version: 1,
	});

	await testDb.createUser();

	const response = await authOwnerAgent.post('/users');

	expect(response.statusCode).toBe(401);
});

test('DELETE /users/:identifier should fail due to invalid API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: false,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.delete('/users/testing@gmail.com');

	expect(response.statusCode).toBe(401);
});

test('DELETE /users/identifier should fail due to member trying to access owner only endpoint', async () => {
	const member = await testDb.createUser();

	const authMemberAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: member,
		version: 1,
	});

	const response = await authMemberAgent.delete('/users/testing@gmail.com');

	expect(response.statusCode).toBe(403);
});

test('DELETE /users/:identifier should fail due instance owner not setup', async () => {
	config.set('userManagement.isInstanceOwnerSetUp', false);

	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.delete('/users/testing@gmail.com').send([]);

	expect(response.statusCode).toBe(500);
});

test('DELETE /users/:identifier should fail due instance owner not setup', async () => {
	config.set('userManagement.isInstanceOwnerSetUp', false);

	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.delete('/users/testing@gmail.com').send([]);

	expect(response.statusCode).toBe(500);
});

test('DELETE /users/:identifier should fail due user triying to delete itself', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.delete(`/users/${owner.email}`).send([]);

	expect(response.statusCode).toBe(400);
});

test('DELETE /users/:email should delete user', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const member = await testDb.createUser();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.delete(`/users/${member.email}`).send([]);

	expect(response.statusCode).toBe(200);

	const savedMember = await Db.collections.User!.findOne({ email: member.email });

	expect(savedMember).toBe(undefined);
});

test('DELETE /users/:id should delete user', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const member = await testDb.createUser();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.delete(`/users/${member.id}`).send([]);

	expect(response.statusCode).toBe(200);

	const savedMember = await Db.collections.User!.findOne({ id: member.id });

	expect(savedMember).toBe(undefined);
});

test('DELETE /users/:id should delete user and transfer data to owner', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const member = await testDb.createUser();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	//Add test workflow to user
	const workflow = await testDb.createWorkflow({}, member);

	// delete user and transfer data to owner
	const response = await authOwnerAgent.delete(`/users/${member.id}`).query({
		transferId: owner.id,
	});

	expect(response.statusCode).toBe(200);

	// make sure the user is deleted
	const savedMember = await Db.collections.User!.findOne({ id: member.id });

	expect(savedMember).toBe(undefined);

	//check whether the workflow was transfered to the owner
	const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
		user: owner,
		workflow,
	});

	expect(sharedWorkflow).not.toBeUndefined();
});

test('DELETE /users/:email should delete user and transfer data to owner', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const member = await testDb.createUser();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	//Add test workflow to user
	const workflow = await testDb.createWorkflow({}, member);

	// delete user and transfer data to owner
	const response = await authOwnerAgent.delete(`/users/${member.email}`).query({
		transferId: owner.email,
	});

	expect(response.statusCode).toBe(200);

	// make sure the user is deleted
	const savedMember = await Db.collections.User!.findOne({ id: member.email });

	expect(savedMember).toBe(undefined);

	//check whether the workflow was transfered to the owner
	const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
		user: owner,
		workflow,
	});

	expect(sharedWorkflow).not.toBeUndefined();
});

test('DELETE /users/:email should fail due valid email not found in db', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.delete('/users/jhondoe@gmail.com').send([]);

	expect(response.statusCode).toBe(404);
});

test('DELETE /users/:id should fail due valid id not found in db', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent
		.delete('/users/a652e8de-cfdb-11ec-9d64-0242ac120002')
		.send([]);

	expect(response.statusCode).toBe(404);
});

const INITIAL_TEST_USER = {
	id: uuid(),
	email: randomEmail(),
	firstName: randomName(),
	lastName: randomName(),
	password: randomValidPassword(),
	apiKey: randomApiKey(),
};
