import validator from 'validator';
import { Not } from 'typeorm';
import type { SuperAgentTest } from 'supertest';

import * as Db from '@/Db';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { Role } from '@db/entities/Role';
import type { User } from '@db/entities/User';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { compareHash } from '@/UserManagement/UserManagementHelper';
import { UserManagementMailer } from '@/UserManagement/email/UserManagementMailer';

import { SUCCESS_RESPONSE_BODY } from './shared/constants';
import {
	randomCredentialPayload,
	randomEmail,
	randomInvalidPassword,
	randomName,
	randomValidPassword,
} from './shared/random';
import * as testDb from './shared/testDb';
import * as utils from './shared/utils/';
import { saveCredential } from './shared/db/credentials';
import { getAllRoles } from './shared/db/roles';
import { createUser, createUserShell } from './shared/db/users';
import { createWorkflow } from './shared/db/workflows';

let globalMemberRole: Role;
let workflowOwnerRole: Role;
let credentialOwnerRole: Role;
let owner: User;
let authOwnerAgent: SuperAgentTest;

const mailer = utils.mockInstance(UserManagementMailer, { isEmailSetUp: true });

const testServer = utils.setupTestServer({ endpointGroups: ['users'] });

beforeAll(async () => {
	const [
		globalOwnerRole,
		fetchedGlobalMemberRole,
		fetchedWorkflowOwnerRole,
		fetchedCredentialOwnerRole,
	] = await getAllRoles();

	globalMemberRole = fetchedGlobalMemberRole;
	workflowOwnerRole = fetchedWorkflowOwnerRole;
	credentialOwnerRole = fetchedCredentialOwnerRole;

	owner = await createUser({ globalRole: globalOwnerRole });

	authOwnerAgent = testServer.authAgentFor(owner);
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'SharedWorkflow', 'Workflow', 'Credentials']);
	await Db.collections.User.delete({ id: Not(owner.id) });

	mailer.invite.mockResolvedValue({ emailSent: true });
});

describe('DELETE /users/:id', () => {
	test('should delete the user', async () => {
		const userToDelete = await createUser({ globalRole: globalMemberRole });

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
		const { id: idToDelete } = await createUser({ globalRole: globalMemberRole });

		const response = await authOwnerAgent.delete(`/users/${idToDelete}`).query({
			transferId: idToDelete,
		});

		expect(response.statusCode).toBe(400);

		const user = await Db.collections.User.findOneBy({ id: idToDelete });
		expect(user).toBeDefined();
	});

	test('with transferId should perform transfer', async () => {
		const userToDelete = await createUser({ globalRole: globalMemberRole });

		const savedWorkflow = await createWorkflow(undefined, userToDelete);

		const savedCredential = await saveCredential(randomCredentialPayload(), {
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
		const memberShell = await createUserShell(globalMemberRole);

		const memberData = {
			inviterId: owner.id,
			firstName: randomName(),
			lastName: randomName(),
			password: randomValidPassword(),
		};

		const response = await testServer.authlessAgent
			.post(`/users/${memberShell.id}`)
			.send(memberData);

		const {
			id,
			email,
			firstName,
			lastName,
			personalizationAnswers,
			password,
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

		for (const invalidPayload of invalidPayloads) {
			const response = await testServer.authlessAgent
				.post(`/users/${memberShell.id}`)
				.send(invalidPayload);
			expect(response.statusCode).toBe(400);

			const storedUser = await Db.collections.User.findOneOrFail({
				where: { email: memberShellEmail },
			});

			expect(storedUser.firstName).toBeNull();
			expect(storedUser.lastName).toBeNull();
			expect(storedUser.password).toBeNull();
		}
	});

	test('should fail with already accepted invite', async () => {
		const member = await createUser({ globalRole: globalMemberRole });

		const newMemberData = {
			inviterId: owner.id,
			firstName: randomName(),
			lastName: randomName(),
			password: randomValidPassword(),
		};

		const response = await testServer.authlessAgent.post(`/users/${member.id}`).send(newMemberData);

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
	test('should succeed if emailing is not set up', async () => {
		mailer.invite.mockResolvedValueOnce({ emailSent: false });
		const response = await authOwnerAgent.post('/users').send([{ email: randomEmail() }]);

		expect(response.statusCode).toBe(200);
		expect(response.body.data[0].user.inviteAcceptUrl).toBeDefined();
	});

	test('should email invites and create user shells but ignore existing', async () => {
		const member = await createUser({ globalRole: globalMemberRole });
		const memberShell = await createUserShell(globalMemberRole);

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
			user: { id, email: receivedEmail, inviteAcceptUrl },
			error,
		} of response.body.data) {
			expect(validator.isUUID(id)).toBe(true);
			expect(id).not.toBe(member.id);
			expect(inviteAcceptUrl).toBeUndefined();

			const lowerCasedEmail = receivedEmail.toLowerCase();
			expect(receivedEmail).toBe(lowerCasedEmail);
			expect(payload.some(({ email }) => email.toLowerCase() === lowerCasedEmail)).toBe(true);

			if (error) {
				expect(error).toBe('Email could not be sent');
			}

			const storedUser = await Db.collections.User.findOneByOrFail({ id });
			const { firstName, lastName, personalizationAnswers, password } = storedUser;

			expect(firstName).toBeNull();
			expect(lastName).toBeNull();
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeNull();
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
	test('should send reinvite, but fail if user already accepted invite', async () => {
		const email = randomEmail();
		const payload = [{ email }];
		const response = await authOwnerAgent.post('/users').send(payload);

		expect(response.statusCode).toBe(200);

		const { data } = response.body;
		const invitedUserId = data[0].user.id;
		const reinviteResponse = await authOwnerAgent.post(`/users/${invitedUserId}/reinvite`);

		expect(reinviteResponse.statusCode).toBe(200);

		const member = await createUser({ globalRole: globalMemberRole });
		const reinviteMemberResponse = await authOwnerAgent.post(`/users/${member.id}/reinvite`);

		expect(reinviteMemberResponse.statusCode).toBe(400);
	});
});
