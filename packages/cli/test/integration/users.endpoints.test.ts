import express = require('express');
import validator from 'validator';
import { v4 as uuid } from 'uuid';
import { compare } from 'bcryptjs';

import { Db } from '../../src';
import config = require('../../config');
import { SUCCESS_RESPONSE_BODY } from './shared/constants';
import { Role } from '../../src/databases/entities/Role';
import {
	randomEmail,
	randomValidPassword,
	randomName,
	randomInvalidPassword,
} from './shared/random';
import { CredentialsEntity } from '../../src/databases/entities/CredentialsEntity';
import { WorkflowEntity } from '../../src/databases/entities/WorkflowEntity';
import * as utils from './shared/utils';
import * as testDb from './shared/testDb';

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;
let globalMemberRole: Role;
let workflowOwnerRole: Role;
let credentialOwnerRole: Role;

beforeAll(async () => {
	app = utils.initTestServer({ endpointGroups: ['users'], applyAuth: true });
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
		jest.mock('../../config');
	});

	await testDb.createUser({
		id: INITIAL_TEST_USER.id,
		email: INITIAL_TEST_USER.email,
		password: INITIAL_TEST_USER.password,
		firstName: INITIAL_TEST_USER.firstName,
		lastName: INITIAL_TEST_USER.lastName,
		globalRole: globalOwnerRole,
	});

	config.set('userManagement.disabled', false);
	config.set('userManagement.isInstanceOwnerSetUp', true);
	config.set('userManagement.emails.mode', '');
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('GET /users should return all users', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	await testDb.createUser();

	const response = await authOwnerAgent.get('/users');

	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(2);

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
		} = user;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBeDefined();
		expect(firstName).toBeDefined();
		expect(lastName).toBeDefined();
		expect(personalizationAnswers).toBeUndefined();
		expect(password).toBeUndefined();
		expect(resetPasswordToken).toBeUndefined();
		expect(isPending).toBe(false);
		expect(globalRole).toBeDefined();
	}
});

test('DELETE /users/:id should delete the user', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	const userToDelete = await testDb.createUser();

	const newWorkflow = new WorkflowEntity();

	Object.assign(newWorkflow, {
		name: randomName(),
		active: false,
		connections: {},
		nodes: [],
	});

	const savedWorkflow = await Db.collections.Workflow!.save(newWorkflow);

	await Db.collections.SharedWorkflow!.save({
		role: workflowOwnerRole,
		user: userToDelete,
		workflow: savedWorkflow,
	});

	const newCredential = new CredentialsEntity();

	Object.assign(newCredential, {
		name: randomName(),
		data: '',
		type: '',
		nodesAccess: [],
	});

	const savedCredential = await Db.collections.Credentials!.save(newCredential);

	await Db.collections.SharedCredentials!.save({
		role: credentialOwnerRole,
		user: userToDelete,
		credentials: savedCredential,
	});

	const response = await authOwnerAgent.delete(`/users/${userToDelete.id}`);

	expect(response.statusCode).toBe(200);
	expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);

	const user = await Db.collections.User!.findOne(userToDelete.id);
	expect(user).toBeUndefined(); // deleted

	const sharedWorkflow = await Db.collections.SharedWorkflow!.findOne({
		relations: ['user'],
		where: { user: userToDelete },
	});
	expect(sharedWorkflow).toBeUndefined(); // deleted

	const sharedCredential = await Db.collections.SharedCredentials!.findOne({
		relations: ['user'],
		where: { user: userToDelete },
	});
	expect(sharedCredential).toBeUndefined(); // deleted

	const workflow = await Db.collections.Workflow!.findOne(savedWorkflow.id);
	expect(workflow).toBeUndefined(); // deleted

	// TODO: Include active workflow and check whether webhook has been removed

	const credential = await Db.collections.Credentials!.findOne(savedCredential.id);
	expect(credential).toBeUndefined(); // deleted
});

test('DELETE /users/:id should fail to delete self', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	const response = await authOwnerAgent.delete(`/users/${owner.id}`);

	expect(response.statusCode).toBe(400);

	const user = await Db.collections.User!.findOne(owner.id);
	expect(user).toBeDefined();
});

test('DELETE /users/:id should fail if user to delete is transferee', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	const { id: idToDelete } = await testDb.createUser();

	const response = await authOwnerAgent.delete(`/users/${idToDelete}`).query({
		transferId: idToDelete,
	});

	expect(response.statusCode).toBe(400);

	const user = await Db.collections.User!.findOne(idToDelete);
	expect(user).toBeDefined();
});

test('DELETE /users/:id with transferId should perform transfer', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	const userToDelete = await Db.collections.User!.save({
		id: uuid(),
		email: randomEmail(),
		password: randomValidPassword(),
		firstName: randomName(),
		lastName: randomName(),
		createdAt: new Date(),
		updatedAt: new Date(),
		globalRole: workflowOwnerRole,
	});

	const newWorkflow = new WorkflowEntity();

	Object.assign(newWorkflow, {
		name: randomName(),
		active: false,
		connections: {},
		nodes: [],
	});

	const savedWorkflow = await Db.collections.Workflow!.save(newWorkflow);

	await Db.collections.SharedWorkflow!.save({
		role: workflowOwnerRole,
		user: userToDelete,
		workflow: savedWorkflow,
	});

	const newCredential = new CredentialsEntity();

	Object.assign(newCredential, {
		name: randomName(),
		data: '',
		type: '',
		nodesAccess: [],
	});

	const savedCredential = await Db.collections.Credentials!.save(newCredential);

	await Db.collections.SharedCredentials!.save({
		role: credentialOwnerRole,
		user: userToDelete,
		credentials: savedCredential,
	});

	const response = await authOwnerAgent.delete(`/users/${userToDelete.id}`).query({
		transferId: owner.id,
	});

	expect(response.statusCode).toBe(200);

	const sharedWorkflow = await Db.collections.SharedWorkflow!.findOneOrFail({
		relations: ['user'],
		where: { user: owner },
	});

	const sharedCredential = await Db.collections.SharedCredentials!.findOneOrFail({
		relations: ['user'],
		where: { user: owner },
	});

	const deletedUser = await Db.collections.User!.findOne(userToDelete);

	expect(sharedWorkflow.user.id).toBe(owner.id);
	expect(sharedCredential.user.id).toBe(owner.id);
	expect(deletedUser).toBeUndefined();
});

test('GET /resolve-signup-token should validate invite token', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	const { id: inviteeId } = await testDb.createMemberShell();

	const response = await authOwnerAgent
		.get('/resolve-signup-token')
		.query({ inviterId: INITIAL_TEST_USER.id })
		.query({ inviteeId });

	expect(response.statusCode).toBe(200);
	expect(response.body).toEqual({
		data: {
			inviter: {
				firstName: INITIAL_TEST_USER.firstName,
				lastName: INITIAL_TEST_USER.lastName,
			},
		},
	});
});

test('GET /resolve-signup-token should fail with invalid inputs', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	const { id: inviteeId } = await testDb.createUser();

	const first = await authOwnerAgent
		.get('/resolve-signup-token')
		.query({ inviterId: INITIAL_TEST_USER.id });

	const second = await authOwnerAgent.get('/resolve-signup-token').query({ inviteeId });

	const third = await authOwnerAgent.get('/resolve-signup-token').query({
		inviterId: '5531199e-b7ae-425b-a326-a95ef8cca59d',
		inviteeId: 'cb133beb-7729-4c34-8cd1-a06be8834d9d',
	});

	// user is already set up, so call should error
	const fourth = await authOwnerAgent
		.get('/resolve-signup-token')
		.query({ inviterId: INITIAL_TEST_USER.id })
		.query({ inviteeId });

	// cause inconsistent DB state
	await Db.collections.User!.update(owner.id, { email: '' });
	const fifth = await authOwnerAgent
		.get('/resolve-signup-token')
		.query({ inviterId: INITIAL_TEST_USER.id })
		.query({ inviteeId });

	for (const response of [first, second, third, fourth, fifth]) {
		expect(response.statusCode).toBe(400);
	}
});

test('POST /users/:id should fill out a user shell', async () => {
	const authlessAgent = utils.createAgent(app);

	const userToFillOut = await Db.collections.User!.save({
		email: randomEmail(),
		globalRole: globalMemberRole,
	});

	const newPassword = randomValidPassword();

	const response = await authlessAgent.post(`/users/${userToFillOut.id}`).send({
		inviterId: INITIAL_TEST_USER.id,
		firstName: INITIAL_TEST_USER.firstName,
		lastName: INITIAL_TEST_USER.lastName,
		password: newPassword,
	});

	const {
		id,
		email,
		firstName,
		lastName,
		personalizationAnswers,
		password,
		resetPasswordToken,
		globalRole,
		isPending,
	} = response.body.data;

	expect(validator.isUUID(id)).toBe(true);
	expect(email).toBeDefined();
	expect(firstName).toBe(INITIAL_TEST_USER.firstName);
	expect(lastName).toBe(INITIAL_TEST_USER.lastName);
	expect(personalizationAnswers).toBeNull();
	expect(password).toBeUndefined();
	expect(resetPasswordToken).toBeUndefined();
	expect(isPending).toBe(false);
	expect(globalRole).toBeDefined();

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeDefined();

	const filledOutUser = await Db.collections.User!.findOneOrFail(userToFillOut.id);
	expect(filledOutUser.firstName).toBe(INITIAL_TEST_USER.firstName);
	expect(filledOutUser.lastName).toBe(INITIAL_TEST_USER.lastName);
	expect(filledOutUser.password).not.toBe(newPassword);
});

test('POST /users/:id should fail with invalid inputs', async () => {
	const authlessAgent = utils.createAgent(app);

	const emailToStore = randomEmail();

	const userToFillOut = await Db.collections.User!.save({
		email: emailToStore,
		globalRole: globalMemberRole,
	});

	for (const invalidPayload of INVALID_FILL_OUT_USER_PAYLOADS) {
		const response = await authlessAgent.post(`/users/${userToFillOut.id}`).send(invalidPayload);
		expect(response.statusCode).toBe(400);

		const user = await Db.collections.User!.findOneOrFail({ where: { email: emailToStore } });
		expect(user.firstName).toBeNull();
		expect(user.lastName).toBeNull();
		expect(user.password).toBeNull();
	}
});

test.skip('POST /users/:id should fail with already accepted invite', async () => {
	const authlessAgent = utils.createAgent(app);

	const globalMemberRole = await Db.collections.Role!.findOneOrFail({
		name: 'member',
		scope: 'global',
	});

	const shell = await Db.collections.User!.save({
		email: randomEmail(),
		password: randomValidPassword(), // simulate accepted invite
		globalRole: globalMemberRole,
	});

	const newPassword = randomValidPassword();

	const response = await authlessAgent.post(`/users/${shell.id}`).send({
		inviterId: INITIAL_TEST_USER.id,
		firstName: randomName(),
		lastName: randomName(),
		password: newPassword,
	});

	expect(response.statusCode).toBe(400);

	const fetchedShell = await Db.collections.User!.findOneOrFail({ where: { email: shell.email } });
	expect(fetchedShell.firstName).toBeNull();
	expect(fetchedShell.lastName).toBeNull();

	const comparisonResult = await compare(shell.password, newPassword);
	expect(comparisonResult).toBe(false);
	expect(newPassword).not.toBe(fetchedShell.password);
});

test('POST /users should fail if emailing is not set up', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	const response = await authOwnerAgent.post('/users').send([{ email: randomEmail() }]);

	expect(response.statusCode).toBe(500);
});

test('POST /users should fail if user management is disabled', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	config.set('userManagement.disabled', true);

	const response = await authOwnerAgent.post('/users').send([{ email: randomEmail() }]);

	expect(response.statusCode).toBe(500);
});

test.skip('POST /users should email invites and create user shells', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	const {
		user,
		pass,
		smtp: { host, port, secure },
	} = await utils.getSmtpTestAccount();

	config.set('userManagement.emails.mode', 'smtp');
	config.set('userManagement.emails.smtp.host', host);
	config.set('userManagement.emails.smtp.port', port);
	config.set('userManagement.emails.smtp.secure', secure);
	config.set('userManagement.emails.smtp.auth.user', user);
	config.set('userManagement.emails.smtp.auth.pass', pass);

	const payload = TEST_EMAILS_TO_CREATE_USER_SHELLS.map((e) => ({ email: e }));

	const response = await authOwnerAgent.post('/users').send(payload);

	expect(response.statusCode).toBe(200);

	for (const {
		user: { id, email: receivedEmail },
		error,
	} of response.body.data) {
		expect(validator.isUUID(id)).toBe(true);
		expect(TEST_EMAILS_TO_CREATE_USER_SHELLS.some((e) => e === receivedEmail)).toBe(true);
		if (error) {
			expect(error).toBe('Email could not be sent');
		}

		const user = await Db.collections.User!.findOneOrFail(id);
		const { firstName, lastName, personalizationAnswers, password, resetPasswordToken } = user;

		expect(firstName).toBeNull();
		expect(lastName).toBeNull();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeNull();
		expect(resetPasswordToken).toBeNull();
	}
});

test.skip('POST /users should fail with invalid inputs', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	config.set('userManagement.emails.mode', 'smtp');

	const invalidPayloads = [
		randomEmail(),
		[randomEmail()],
		{},
		[{ name: randomName() }],
		[{ email: randomName() }],
	];

	for (const invalidPayload of invalidPayloads) {
		const response = await authOwnerAgent.post('/users').send(invalidPayload);
		expect(response.statusCode).toBe(400);

		const users = await Db.collections.User!.find();
		expect(users.length).toBe(1); // DB unaffected
	}
});

test.skip('POST /users should ignore an empty payload', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	config.set('userManagement.emails.mode', 'smtp');

	const response = await authOwnerAgent.post('/users').send([]);

	const { data } = response.body;

	expect(response.statusCode).toBe(200);
	expect(Array.isArray(data)).toBe(true);
	expect(data.length).toBe(0);

	const users = await Db.collections.User!.find();
	expect(users.length).toBe(1);
});

// TODO: /users/:id/reinvite route tests missing

// TODO: UserManagementMailer is a singleton - cannot reinstantiate with wrong creds
// test('POST /users should error for wrong SMTP config', async () => {
// 	const owner = await Db.collections.User!.findOneOrFail();
// 	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

// 	config.set('userManagement.emails.mode', 'smtp');
// 	config.set('userManagement.emails.smtp.host', 'XYZ'); // break SMTP config

// 	const payload = TEST_EMAILS_TO_CREATE_USER_SHELLS.map((e) => ({ email: e }));

// 	const response = await authOwnerAgent.post('/users').send(payload);

// 	expect(response.statusCode).toBe(500);
// });

const INITIAL_TEST_USER = {
	id: uuid(),
	email: randomEmail(),
	firstName: randomName(),
	lastName: randomName(),
	password: randomValidPassword(),
};

const INVALID_FILL_OUT_USER_PAYLOADS = [
	{
		firstName: randomName(),
		lastName: randomName(),
		password: randomValidPassword(),
	},
	{
		inviterId: INITIAL_TEST_USER.id,
		firstName: randomName(),
		password: randomValidPassword(),
	},
	{
		inviterId: INITIAL_TEST_USER.id,
		firstName: randomName(),
		password: randomValidPassword(),
	},
	{
		inviterId: INITIAL_TEST_USER.id,
		firstName: randomName(),
		lastName: randomName(),
	},
	{
		inviterId: INITIAL_TEST_USER.id,
		firstName: randomName(),
		lastName: randomName(),
		password: randomInvalidPassword(),
	},
];

const TEST_EMAILS_TO_CREATE_USER_SHELLS = [randomEmail(), randomEmail(), randomEmail()];
