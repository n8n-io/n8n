import validator from 'validator';
import { Not } from 'typeorm';
import type { SuperAgentTest } from 'supertest';

import config from '@/config';
import * as Db from '@/Db';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { Role } from '@db/entities/Role';
import type { User } from '@db/entities/User';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { compareHash } from '@/UserManagement/UserManagementHelper';
import { UserManagementMailer } from '@/UserManagement/email/UserManagementMailer';
import { NodeMailer } from '@/UserManagement/email/NodeMailer';

import { SUCCESS_RESPONSE_BODY } from './shared/constants';
import {
	randomCredentialPayload,
	randomEmail,
	randomInvalidPassword,
	randomName,
	randomValidPassword,
} from './shared/random';
import * as testDb from './shared/testDb';
import * as utils from './shared/utils';

jest.mock('@/UserManagement/email/NodeMailer');

let globalMemberRole: Role;
let workflowOwnerRole: Role;
let credentialOwnerRole: Role;
let owner: User;
let authlessAgent: SuperAgentTest;
let authOwnerAgent: SuperAgentTest;
let authAgentFor: (user: User) => SuperAgentTest;

beforeAll(async () => {
	const app = await utils.initTestServer({ endpointGroups: ['users'] });

	const [
		globalOwnerRole,
		fetchedGlobalMemberRole,
		fetchedWorkflowOwnerRole,
		fetchedCredentialOwnerRole,
	] = await testDb.getAllRoles();

	globalMemberRole = fetchedGlobalMemberRole;
	workflowOwnerRole = fetchedWorkflowOwnerRole;
	credentialOwnerRole = fetchedCredentialOwnerRole;

	owner = await testDb.createUser({ globalRole: globalOwnerRole });

	authlessAgent = utils.createAgent(app);
	authAgentFor = utils.createAuthAgent(app);
	authOwnerAgent = authAgentFor(owner);
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'SharedWorkflow', 'Workflow', 'Credentials']);
	await Db.collections.User.delete({ id: Not(owner.id) });

	jest.mock('@/config');

	config.set('userManagement.disabled', false);
	config.set('userManagement.isInstanceOwnerSetUp', true);
	config.set('userManagement.emails.mode', 'smtp');
	config.set('userManagement.emails.smtp.host', '');
});

afterAll(async () => {
	await testDb.terminate();
});

describe('GET /users', () => {
	test('should return all users (for owner)', async () => {
		await testDb.createUser({ globalRole: globalMemberRole });

		const response = await authOwnerAgent.get('/users');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(2);

		response.body.data.map((user: User) => {
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
		});
	});

	test('should return all users (for member)', async () => {
		const member = await testDb.createUser({ globalRole: globalMemberRole });
		const response = await authAgentFor(member).get('/users');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(2);
	});
});

describe('DELETE /users/:id', () => {
	test('should delete the user', async () => {
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

		const response = await authOwnerAgent.delete(`/users/${userToDelete.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);

		const user = await Db.collections.User.findOneBy({ id: userToDelete.id });
		expect(user).toBeNull(); // deleted

		const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
			relations: ['user'],
			where: { userId: userToDelete.id, roleId: workflowOwnerRole.id },
		});
		expect(sharedWorkflow).toBeNull(); // deleted

		const sharedCredential = await Db.collections.SharedCredentials.findOne({
			relations: ['user'],
			where: { userId: userToDelete.id, roleId: credentialOwnerRole.id },
		});
		expect(sharedCredential).toBeNull(); // deleted

		const workflow = await Db.collections.Workflow.findOneBy({ id: savedWorkflow.id });
		expect(workflow).toBeNull(); // deleted

		// TODO: Include active workflow and check whether webhook has been removed

		const credential = await Db.collections.Credentials.findOneBy({ id: savedCredential.id });
		expect(credential).toBeNull(); // deleted
	});

	test('should fail to delete self', async () => {
		const response = await authOwnerAgent.delete(`/users/${owner.id}`);

		expect(response.statusCode).toBe(400);

		const user = await Db.collections.User.findOneBy({ id: owner.id });
		expect(user).toBeDefined();
	});

	test('should fail if user to delete is transferee', async () => {
		const { id: idToDelete } = await testDb.createUser({ globalRole: globalMemberRole });

		const response = await authOwnerAgent.delete(`/users/${idToDelete}`).query({
			transferId: idToDelete,
		});

		expect(response.statusCode).toBe(400);

		const user = await Db.collections.User.findOneBy({ id: idToDelete });
		expect(user).toBeDefined();
	});

	test('with transferId should perform transfer', async () => {
		const userToDelete = await testDb.createUser({ globalRole: globalMemberRole });

		const savedWorkflow = await testDb.createWorkflow(undefined, userToDelete);

		const savedCredential = await testDb.saveCredential(randomCredentialPayload(), {
			user: userToDelete,
			role: credentialOwnerRole,
		});

		const response = await authOwnerAgent.delete(`/users/${userToDelete.id}`).query({
			transferId: owner.id,
		});

		expect(response.statusCode).toBe(200);

		const sharedWorkflow = await Db.collections.SharedWorkflow.findOneOrFail({
			relations: ['workflow'],
			where: { userId: owner.id },
		});

		expect(sharedWorkflow.workflow).toBeDefined();
		expect(sharedWorkflow.workflow.id).toBe(savedWorkflow.id);

		const sharedCredential = await Db.collections.SharedCredentials.findOneOrFail({
			relations: ['credentials'],
			where: { userId: owner.id },
		});

		expect(sharedCredential.credentials).toBeDefined();
		expect(sharedCredential.credentials.id).toBe(savedCredential.id);

		const deletedUser = await Db.collections.User.findOneBy({ id: userToDelete.id });

		expect(deletedUser).toBeNull();
	});
});

describe('POST /users/:id', () => {
	test('should fill out a user shell', async () => {
		const memberShell = await testDb.createUserShell(globalMemberRole);

		const memberData = {
			inviterId: owner.id,
			firstName: randomName(),
			lastName: randomName(),
			password: randomValidPassword(),
		};

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

		const member = await Db.collections.User.findOneByOrFail({ id: memberShell.id });
		expect(member.firstName).toBe(memberData.firstName);
		expect(member.lastName).toBe(memberData.lastName);
		expect(member.password).not.toBe(memberData.password);
	});

	test('should fail with invalid inputs', async () => {
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

	test('should fail with already accepted invite', async () => {
		const member = await testDb.createUser({ globalRole: globalMemberRole });

		const newMemberData = {
			inviterId: owner.id,
			firstName: randomName(),
			lastName: randomName(),
			password: randomValidPassword(),
		};

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
});

describe('POST /users', () => {
	beforeEach(() => {
		config.set('userManagement.emails.mode', 'smtp');
	});

	test('should succeed if emailing is not set up', async () => {
		const response = await authOwnerAgent.post('/users').send([{ email: randomEmail() }]);

		expect(response.statusCode).toBe(200);
		expect(response.body.data[0].user.inviteAcceptUrl).toBeDefined();
	});

	test('should fail if user management is disabled', async () => {
		config.set('userManagement.disabled', true);
		config.set('userManagement.isInstanceOwnerSetUp', false);

		const response = await authOwnerAgent.post('/users').send([{ email: randomEmail() }]);

		expect(response.statusCode).toBe(400);
	});

	test('should email invites and create user shells but ignore existing', async () => {
		const member = await testDb.createUser({ globalRole: globalMemberRole });
		const memberShell = await testDb.createUserShell(globalMemberRole);

		const testEmails = [
			randomEmail(),
			randomEmail().toUpperCase(),
			memberShell.email,
			member.email,
		];

		const payload = testEmails.map((e) => ({ email: e }));

		const response = await authOwnerAgent.post('/users').send(payload);

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

			const storedUser = await Db.collections.User.findOneByOrFail({ id });
			const { firstName, lastName, personalizationAnswers, password, resetPasswordToken } =
				storedUser;

			expect(firstName).toBeNull();
			expect(lastName).toBeNull();
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeNull();
			expect(resetPasswordToken).toBeNull();
		}
	});

	test('should fail with invalid inputs', async () => {
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

	test('should ignore an empty payload', async () => {
		const response = await authOwnerAgent.post('/users').send([]);

		const { data } = response.body;

		expect(response.statusCode).toBe(200);
		expect(Array.isArray(data)).toBe(true);
		expect(data.length).toBe(0);

		const users = await Db.collections.User.find();
		expect(users.length).toBe(1);
	});
});

describe('POST /users/:id/reinvite', () => {
	beforeEach(() => {
		config.set('userManagement.emails.mode', 'smtp');
		// those configs are needed to make sure the reinvite email is sent,because of this check isEmailSetUp()
		config.set('userManagement.emails.smtp.host', 'host');
		config.set('userManagement.emails.smtp.auth.user', 'user');
		config.set('userManagement.emails.smtp.auth.pass', 'pass');
	});

	test('should send reinvite, but fail if user already accepted invite', async () => {
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
});

describe('UserManagementMailer expect NodeMailer.verifyConnection', () => {
	let mockInit: jest.SpyInstance<Promise<void>, []>;
	let mockVerifyConnection: jest.SpyInstance<Promise<void>, []>;

	beforeAll(() => {
		mockVerifyConnection = jest
			.spyOn(NodeMailer.prototype, 'verifyConnection')
			.mockImplementation(async () => {});
		mockInit = jest.spyOn(NodeMailer.prototype, 'init').mockImplementation(async () => {});
	});

	afterAll(() => {
		mockVerifyConnection.mockRestore();
		mockInit.mockRestore();
	});

	test('not be called when SMTP not set up', async () => {
		const userManagementMailer = new UserManagementMailer();
		// NodeMailer.verifyConnection gets called only explicitly
		expect(async () => userManagementMailer.verifyConnection()).rejects.toThrow();

		expect(NodeMailer.prototype.verifyConnection).toHaveBeenCalledTimes(0);
	});

	test('to be called when SMTP set up', async () => {
		// host needs to be set, otherwise smtp is skipped
		config.set('userManagement.emails.smtp.host', 'host');
		config.set('userManagement.emails.mode', 'smtp');

		const userManagementMailer = new UserManagementMailer();
		// NodeMailer.verifyConnection gets called only explicitly
		expect(async () => userManagementMailer.verifyConnection()).not.toThrow();
	});
});
