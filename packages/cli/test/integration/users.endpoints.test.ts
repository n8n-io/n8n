import express = require('express');
import { getConnection } from 'typeorm';
import validator from 'validator';
import { v4 as uuid } from 'uuid';

import * as utils from './shared/utils';
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
import { createUser } from './shared/utils';
import { CredentialsEntity } from '../../src/databases/entities/CredentialsEntity';
import { WorkflowEntity } from '../../src/databases/entities/WorkflowEntity';
import { compare } from 'bcryptjs';

let app: express.Application;
let globalOwnerRole: Role;
let globalMemberRole: Role;
let workflowOwnerRole: Role;
let credentialOwnerRole: Role;

beforeAll(async () => {
	app = utils.initTestServer({ namespaces: ['users'], applyAuth: true });
	await utils.initTestDb();

	const [
		fetchedGlobalOwnerRole,
		fetchedGlobalMemberRole,
		fetchedWorkflowOwnerRole,
		fetchedCredentialOwnerRole,
	] = await utils.getAllRoles();

	globalOwnerRole = fetchedGlobalOwnerRole;
	globalMemberRole = fetchedGlobalMemberRole;
	workflowOwnerRole = fetchedWorkflowOwnerRole;
	credentialOwnerRole = fetchedCredentialOwnerRole;

	utils.initTestLogger();
});

beforeEach(async () => {
	await utils.truncate(['User']);

	jest.isolateModules(() => {
		jest.mock('../../config');
	});

	await createUser({
		id: INITIAL_TEST_USER.id,
		email: INITIAL_TEST_USER.email,
		password: INITIAL_TEST_USER.password,
		firstName: INITIAL_TEST_USER.firstName,
		lastName: INITIAL_TEST_USER.lastName,
		role: globalOwnerRole,
	});

	config.set('userManagement.hasOwner', true);
	config.set('userManagement.emails.mode', '');
});

afterEach(async () => {
	await utils.truncate(['User']);
});

afterAll(() => {
	return getConnection().close();
});

test('GET /users should return all users', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAgent(app, { auth: true, user: owner });

	await createUser();

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
		} = user;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBeDefined();
		expect(firstName).toBeDefined();
		expect(lastName).toBeDefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(resetPasswordToken).toBeUndefined();
		expect(globalRole).toBeDefined();
	}
});

test('DELETE /users/:id should delete the user', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAgent(app, { auth: true, user: owner });

	const userToDelete = await createUser();

	const newWorkflow = new WorkflowEntity();

	Object.assign(newWorkflow, {
		name: randomName(),
		active: false,
		connections: {},
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
	expect(user).toBeUndefined();

	const sharedWorkflow = await Db.collections.SharedWorkflow!.findOne({
		relations: ['user'],
		where: { user: userToDelete },
	});
	expect(sharedWorkflow).toBeUndefined();

	const sharedCredential = await Db.collections.SharedCredentials!.findOne({
		relations: ['user'],
		where: { user: userToDelete },
	});
	expect(sharedCredential).toBeUndefined();

	const workflow = await Db.collections.Workflow!.findOne(savedWorkflow.id);
	expect(workflow).toBeUndefined();

	const credential = await Db.collections.Credentials!.findOne(savedCredential.id);
	expect(credential).toBeUndefined();
});

test('DELETE /users/:id should fail to delete self', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAgent(app, { auth: true, user: owner });

	const response = await authOwnerAgent.delete(`/users/${owner.id}`);

	expect(response.statusCode).toBe(400);

	const user = await Db.collections.User!.findOne(owner.id);
	expect(user).toBeDefined();
});

test('DELETE /users/:id should fail if user to delete is transferee', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAgent(app, { auth: true, user: owner });

	const { id: idToDelete } = await createUser();

	const response = await authOwnerAgent.delete(`/users/${idToDelete}`).query({
		transferId: idToDelete,
	});

	expect(response.statusCode).toBe(400);

	const user = await Db.collections.User!.findOne(idToDelete);
	expect(user).toBeDefined();
});

test('DELETE /users/:id with transferId should perform transfer', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAgent(app, { auth: true, user: owner });

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

	await utils.truncate(['Credentials', 'Workflow']);
});

test('GET /resolve-signup-token should validate invite token', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAgent(app, { auth: true, user: owner });

	const { id: inviteeId } = await createUser();

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
	const authOwnerAgent = await utils.createAgent(app, { auth: true, user: owner });

	const { id: inviteeId } = await createUser();

	const first = await authOwnerAgent
		.get('/resolve-signup-token')
		.query({ inviterId: INITIAL_TEST_USER.id });

	const second = await authOwnerAgent.get('/resolve-signup-token').query({ inviteeId });

	const third = await authOwnerAgent
		.get('/resolve-signup-token')
		.query({ inviterId: '123', inviteeId: '456' });

	await Db.collections.User!.update(owner.id, { email: '' }); // cause inconsistent DB state

	const fourth = await authOwnerAgent
		.get('/resolve-signup-token')
		.query({ inviterId: INITIAL_TEST_USER.id })
		.query({ inviteeId });

	for (const response of [first, second, third, fourth]) {
		expect(response.statusCode).toBe(400);
	}
});

test('POST /users/:id should fill out a user shell', async () => {
	const authlessAgent = await utils.createAgent(app);

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
	} = response.body.data;

	expect(validator.isUUID(id)).toBe(true);
	expect(email).toBeDefined();
	expect(firstName).toBe(INITIAL_TEST_USER.firstName);
	expect(lastName).toBe(INITIAL_TEST_USER.lastName);
	expect(personalizationAnswers).toBeNull();
	expect(password).toBeUndefined();
	expect(resetPasswordToken).toBeUndefined();
	expect(globalRole).toBeUndefined();

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeDefined();

	const filledOutUser = await Db.collections.User!.findOneOrFail(userToFillOut.id);
	expect(filledOutUser.firstName).toBe(INITIAL_TEST_USER.firstName);
	expect(filledOutUser.lastName).toBe(INITIAL_TEST_USER.lastName);
	expect(filledOutUser.password).not.toBe(newPassword);
});

test('POST /users/:id should fail with invalid inputs', async () => {
	const authlessAgent = await utils.createAgent(app);

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

test('POST /users/:id should fail with already accepted invite', async () => {
	const authlessAgent = await utils.createAgent(app);

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
	const authOwnerAgent = await utils.createAgent(app, { auth: true, user: owner });

	const response = await authOwnerAgent.post('/users').send([{ email: randomEmail() }]);

	expect(response.statusCode).toBe(500);
});

test('POST /users should email invites and create user shells', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAgent(app, { auth: true, user: owner });

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
		user: { id, email: receivedEmail, error },
	} of response.body.data) {
		expect(validator.isUUID(id)).toBe(true);
		expect(TEST_EMAILS_TO_CREATE_USER_SHELLS.some((e) => e === receivedEmail)).toBe(true);
		expect(error).toBeUndefined();

		const user = await Db.collections.User!.findOneOrFail(id);
		const { firstName, lastName, personalizationAnswers, password, resetPasswordToken } = user;

		expect(firstName).toBeNull();
		expect(lastName).toBeNull();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeNull();
		expect(resetPasswordToken).toBeNull();
	}
});

test('POST /users should fail with invalid inputs', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAgent(app, { auth: true, user: owner });

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

test('POST /users should ignore an empty payload', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAgent(app, { auth: true, user: owner });

	config.set('userManagement.emails.mode', 'smtp');

	const response = await authOwnerAgent.post('/users').send([]);

	const { data } = response.body;

	expect(response.statusCode).toBe(200);
	expect(Array.isArray(data)).toBe(true);
	expect(data.length).toBe(0);

	const users = await Db.collections.User!.find();
	expect(users.length).toBe(1);
});

// TODO: UserManagementMailer is a singleton - cannot reinstantiate with wrong creds
// test('POST /users should error for wrong SMTP config', async () => {
// 	const owner = await Db.collections.User!.findOneOrFail();
// 	const authOwnerAgent = await utils.createAgent(app, { auth: true, user: owner });

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
