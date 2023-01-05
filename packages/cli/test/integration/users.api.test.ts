import express from 'express';
import validator from 'validator';

import config from '@/config';
import * as Db from '@/Db';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { Role } from '@db/entities/Role';
import type { User } from '@db/entities/User';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { compareHash } from '@/UserManagement/UserManagementHelper';
import { SUCCESS_RESPONSE_BODY } from './shared/constants';
import {
	randomEmail,
	randomInvalidPassword,
	randomName,
	randomValidPassword,
} from './shared/random';
import * as testDb from './shared/testDb';
import type { AuthAgent } from './shared/types';
import * as utils from './shared/utils';

import * as UserManagementMailer from '@/UserManagement/email/UserManagementMailer';
import { NodeMailer } from '@/UserManagement/email/NodeMailer';

jest.mock('@/UserManagement/email/NodeMailer');

let app: express.Application;
let testDbName = '';
let globalMemberRole: Role;
let globalOwnerRole: Role;
let workflowOwnerRole: Role;
let credentialOwnerRole: Role;
let authAgent: AuthAgent;

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['users'], applyAuth: true });
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

	authAgent = utils.createAuthAgent(app);

	utils.initTestTelemetry();
	utils.initTestLogger();
});

beforeEach(async () => {
	await testDb.truncate(
		['User', 'SharedCredentials', 'SharedWorkflow', 'Workflow', 'Credentials'],
		testDbName,
	);

	jest.mock('@/config');

	config.set('userManagement.disabled', false);
	config.set('userManagement.isInstanceOwnerSetUp', true);
	config.set('userManagement.emails.mode', '');
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('GET /users should return all users', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	await testDb.createUser({ globalRole: globalMemberRole });

	const response = await authAgent(owner).get('/users');

	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(2);

	await Promise.all(
		response.body.data.map(async (user: User) => {
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
				apiKey,
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
			expect(apiKey).not.toBeDefined();
		}),
	);
});

test('DELETE /users/:id should delete the user', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const userToDelete = await testDb.createUser({ globalRole: globalMemberRole });

	const newWorkflow = new WorkflowEntity();

	Object.assign(newWorkflow, {
		name: randomName(),
		active: false,
		connections: {},
		nodes: [],
	});

	const savedWorkflow = await Db.collections.Workflow.save(newWorkflow);

	await Db.collections.SharedWorkflow.save({
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

	const savedCredential = await Db.collections.Credentials.save(newCredential);

	await Db.collections.SharedCredentials.save({
		role: credentialOwnerRole,
		user: userToDelete,
		credentials: savedCredential,
	});

	const response = await authAgent(owner).delete(`/users/${userToDelete.id}`);

	expect(response.statusCode).toBe(200);
	expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);

	const user = await Db.collections.User.findOne(userToDelete.id);
	expect(user).toBeUndefined(); // deleted

	const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
		relations: ['user'],
		where: { user: userToDelete, role: workflowOwnerRole },
	});
	expect(sharedWorkflow).toBeUndefined(); // deleted

	const sharedCredential = await Db.collections.SharedCredentials.findOne({
		relations: ['user'],
		where: { user: userToDelete, role: credentialOwnerRole },
	});
	expect(sharedCredential).toBeUndefined(); // deleted

	const workflow = await Db.collections.Workflow.findOne(savedWorkflow.id);
	expect(workflow).toBeUndefined(); // deleted

	// TODO: Include active workflow and check whether webhook has been removed

	const credential = await Db.collections.Credentials.findOne(savedCredential.id);
	expect(credential).toBeUndefined(); // deleted
});

test('DELETE /users/:id should fail to delete self', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const response = await authAgent(owner).delete(`/users/${owner.id}`);

	expect(response.statusCode).toBe(400);

	const user = await Db.collections.User.findOne(owner.id);
	expect(user).toBeDefined();
});

test('DELETE /users/:id should fail if user to delete is transferee', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const { id: idToDelete } = await testDb.createUser({ globalRole: globalMemberRole });

	const response = await authAgent(owner).delete(`/users/${idToDelete}`).query({
		transferId: idToDelete,
	});

	expect(response.statusCode).toBe(400);

	const user = await Db.collections.User.findOne(idToDelete);
	expect(user).toBeDefined();
});

test('DELETE /users/:id with transferId should perform transfer', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const userToDelete = await testDb.createUser({ globalRole: globalMemberRole });

	const savedWorkflow = await testDb.createWorkflow(undefined, userToDelete);

	const savedCredential = await testDb.saveCredential(undefined, {
		user: userToDelete,
		role: credentialOwnerRole,
	});

	const response = await authAgent(owner).delete(`/users/${userToDelete.id}`).query({
		transferId: owner.id,
	});

	expect(response.statusCode).toBe(200);

	const sharedWorkflow = await Db.collections.SharedWorkflow.findOneOrFail({
		relations: ['workflow'],
		where: { user: owner },
	});

	expect(sharedWorkflow.workflow).toBeDefined();
	expect(sharedWorkflow.workflow.id).toBe(savedWorkflow.id);

	const sharedCredential = await Db.collections.SharedCredentials.findOneOrFail({
		relations: ['credentials'],
		where: { user: owner },
	});

	expect(sharedCredential.credentials).toBeDefined();
	expect(sharedCredential.credentials.id).toBe(savedCredential.id);

	const deletedUser = await Db.collections.User.findOne(userToDelete);

	expect(deletedUser).toBeUndefined();
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

test('POST /users/:id should fill out a user shell', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const memberShell = await testDb.createUserShell(globalMemberRole);

	const memberData = {
		inviterId: owner.id,
		firstName: randomName(),
		lastName: randomName(),
		password: randomValidPassword(),
	};

	const authlessAgent = utils.createAgent(app);

	const response = await authlessAgent.post(`/users/${memberShell.id}`).send(memberData);

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
		apiKey,
	} = response.body.data;

	expect(validator.isUUID(id)).toBe(true);
	expect(email).toBeDefined();
	expect(firstName).toBe(memberData.firstName);
	expect(lastName).toBe(memberData.lastName);
	expect(personalizationAnswers).toBeNull();
	expect(password).toBeUndefined();
	expect(resetPasswordToken).toBeUndefined();
	expect(isPending).toBe(false);
	expect(globalRole).toBeDefined();
	expect(apiKey).not.toBeDefined();

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeDefined();

	const member = await Db.collections.User.findOneOrFail(memberShell.id);
	expect(member.firstName).toBe(memberData.firstName);
	expect(member.lastName).toBe(memberData.lastName);
	expect(member.password).not.toBe(memberData.password);
});

test('POST /users/:id should fail with invalid inputs', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authlessAgent = utils.createAgent(app);

	const memberShellEmail = randomEmail();

	const memberShell = await Db.collections.User.save({
		email: memberShellEmail,
		globalRole: globalMemberRole,
	});

	const invalidPayloads = [
		{
			firstName: randomName(),
			lastName: randomName(),
			password: randomValidPassword(),
		},
		{
			inviterId: owner.id,
			firstName: randomName(),
			password: randomValidPassword(),
		},
		{
			inviterId: owner.id,
			firstName: randomName(),
			password: randomValidPassword(),
		},
		{
			inviterId: owner.id,
			firstName: randomName(),
			lastName: randomName(),
		},
		{
			inviterId: owner.id,
			firstName: randomName(),
			lastName: randomName(),
			password: randomInvalidPassword(),
		},
	];

	await Promise.all(
		invalidPayloads.map(async (invalidPayload) => {
			const response = await authlessAgent.post(`/users/${memberShell.id}`).send(invalidPayload);
			expect(response.statusCode).toBe(400);

			const storedUser = await Db.collections.User.findOneOrFail({
				where: { email: memberShellEmail },
			});

			expect(storedUser.firstName).toBeNull();
			expect(storedUser.lastName).toBeNull();
			expect(storedUser.password).toBeNull();
		}),
	);
});

test('POST /users/:id should fail with already accepted invite', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });

	const newMemberData = {
		inviterId: owner.id,
		firstName: randomName(),
		lastName: randomName(),
		password: randomValidPassword(),
	};

	const authlessAgent = utils.createAgent(app);

	const response = await authlessAgent.post(`/users/${member.id}`).send(newMemberData);

	expect(response.statusCode).toBe(400);

	const storedMember = await Db.collections.User.findOneOrFail({
		where: { email: member.email },
	});
	expect(storedMember.firstName).not.toBe(newMemberData.firstName);
	expect(storedMember.lastName).not.toBe(newMemberData.lastName);

	const comparisonResult = await compareHash(member.password, storedMember.password);
	expect(comparisonResult).toBe(false);
	expect(storedMember.password).not.toBe(newMemberData.password);
});

test('POST /users should fail if emailing is not set up', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const response = await authAgent(owner)
		.post('/users')
		.send([{ email: randomEmail() }]);

	expect(response.statusCode).toBe(500);
});

test('POST /users should fail if user management is disabled', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	config.set('userManagement.disabled', true);

	const response = await authAgent(owner)
		.post('/users')
		.send([{ email: randomEmail() }]);

	expect(response.statusCode).toBe(500);
});

test('POST /users should email invites and create user shells but ignore existing', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const memberShell = await testDb.createUserShell(globalMemberRole);

	config.set('userManagement.emails.mode', 'smtp');

	const testEmails = [randomEmail(), randomEmail().toUpperCase(), memberShell.email, member.email];

	const payload = testEmails.map((e) => ({ email: e }));

	const response = await authAgent(owner).post('/users').send(payload);

	expect(response.statusCode).toBe(200);

	for (const {
		user: { id, email: receivedEmail },
		error,
	} of response.body.data) {
		expect(validator.isUUID(id)).toBe(true);
		expect(id).not.toBe(member.id);

		const lowerCasedEmail = receivedEmail.toLowerCase();
		expect(receivedEmail).toBe(lowerCasedEmail);
		expect(payload.some(({ email }) => email.toLowerCase() === lowerCasedEmail)).toBe(true);

		if (error) {
			expect(error).toBe('Email could not be sent');
		}

		const storedUser = await Db.collections.User.findOneOrFail(id);
		const { firstName, lastName, personalizationAnswers, password, resetPasswordToken } =
			storedUser;

		expect(firstName).toBeNull();
		expect(lastName).toBeNull();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeNull();
		expect(resetPasswordToken).toBeNull();
	}
});

test('POST /users should fail with invalid inputs', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const authOwnerAgent = authAgent(owner);

	config.set('userManagement.emails.mode', 'smtp');

	const invalidPayloads = [
		randomEmail(),
		[randomEmail()],
		{},
		[{ name: randomName() }],
		[{ email: randomName() }],
	];

	await Promise.all(
		invalidPayloads.map(async (invalidPayload) => {
			const response = await authOwnerAgent.post('/users').send(invalidPayload);
			expect(response.statusCode).toBe(400);

			const users = await Db.collections.User.find();
			expect(users.length).toBe(1); // DB unaffected
		}),
	);
});

test('POST /users should ignore an empty payload', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	config.set('userManagement.emails.mode', 'smtp');

	const response = await authAgent(owner).post('/users').send([]);

	const { data } = response.body;

	expect(response.statusCode).toBe(200);
	expect(Array.isArray(data)).toBe(true);
	expect(data.length).toBe(0);

	const users = await Db.collections.User.find();
	expect(users.length).toBe(1);
});

test('POST /users/:id/reinvite should send reinvite, but fail if user already accepted invite', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	config.set('userManagement.emails.mode', 'smtp');

	// those configs are needed to make sure the reinvite email is sent,because of this check isEmailSetUp()
	config.set('userManagement.emails.smtp.host', 'host');
	config.set('userManagement.emails.smtp.auth.user', 'user');
	config.set('userManagement.emails.smtp.auth.pass', 'pass');

	const email = randomEmail();
	const payload = [{ email }];
	const response = await authOwnerAgent.post('/users').send(payload);

	expect(response.statusCode).toBe(200);

	const { data } = response.body;
	const invitedUserId = data[0].user.id;
	const reinviteResponse = await authOwnerAgent.post(`/users/${invitedUserId}/reinvite`);

	expect(reinviteResponse.statusCode).toBe(200);

	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const reinviteMemberResponse = await authOwnerAgent.post(`/users/${member.id}/reinvite`);

	expect(reinviteMemberResponse.statusCode).toBe(400);
});

test('UserManagementMailer expect NodeMailer.verifyConnection have been called', async () => {
	jest.spyOn(NodeMailer.prototype, 'verifyConnection').mockImplementation(async () => {});

	// NodeMailer.verifyConnection called 1 time
	const userManagementMailer = UserManagementMailer.getInstance();
	// NodeMailer.verifyConnection called 2 time
	(await userManagementMailer).verifyConnection();

	expect(NodeMailer.prototype.verifyConnection).toHaveBeenCalledTimes(2);

	// @ts-ignore
	NodeMailer.prototype.verifyConnection.mockRestore();
});
