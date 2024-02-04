import type { SuperAgentTest } from 'supertest';
import type { IUser } from 'n8n-workflow';

import type { ListQuery } from '@/requests';
import type { User } from '@db/entities/User';

import { randomCredentialPayload } from '../shared/random';
import * as testDb from '../shared/testDb';
import type { SaveCredentialFunction } from '../shared/types';
import * as utils from '../shared/utils/';
import { affixRoleToSaveCredential, shareCredentialWithUsers } from '../shared/db/credentials';
import { createManyUsers, createUser } from '../shared/db/users';

const testServer = utils.setupTestServer({
	endpointGroups: ['credentials'],
	enabledFeatures: ['feat:sharing'],
});

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let saveCredential: SaveCredentialFunction;

beforeAll(async () => {
	owner = await createUser({ role: 'global:owner' });
	member = await createUser({ role: 'global:member' });

	authOwnerAgent = testServer.authAgentFor(owner);

	saveCredential = affixRoleToSaveCredential('credential:owner');
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'Credentials']);
});

afterEach(() => {
	jest.clearAllMocks();
});

describe('GET /credentials/:id', () => {
	test('should retrieve owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const firstResponse = await authOwnerAgent.get(`/credentials/${savedCredential.id}`);

		expect(firstResponse.statusCode).toBe(200);

		const { data: firstCredential } = firstResponse.body;
		validateMainCredentialData(firstCredential);
		expect(firstCredential.data).toBeUndefined();
		expect(firstCredential.ownedBy).toMatchObject({
			id: owner.id,
			email: owner.email,
			firstName: owner.firstName,
			lastName: owner.lastName,
		});
		expect(firstCredential.sharedWith).toHaveLength(0);

		const secondResponse = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });

		expect(secondResponse.statusCode).toBe(200);

		const { data: secondCredential } = secondResponse.body;
		validateMainCredentialData(secondCredential);
		expect(secondCredential.data).toBeDefined();
	});

	test('should retrieve non-owned cred for owner', async () => {
		const [member1, member2] = await createManyUsers(2, {
			role: 'global:member',
		});

		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member1 });
		await shareCredentialWithUsers(savedCredential, [member2]);

		const response1 = await authOwnerAgent.get(`/credentials/${savedCredential.id}`);

		expect(response1.statusCode).toBe(200);

		validateMainCredentialData(response1.body.data);
		expect(response1.body.data.data).toBeUndefined();
		expect(response1.body.data.ownedBy).toMatchObject({
			id: member1.id,
			email: member1.email,
			firstName: member1.firstName,
			lastName: member1.lastName,
		});
		expect(response1.body.data.sharedWith).toHaveLength(1);
		expect(response1.body.data.sharedWith[0]).toMatchObject({
			id: member2.id,
			email: member2.email,
			firstName: member2.firstName,
			lastName: member2.lastName,
		});

		const response2 = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });

		expect(response2.statusCode).toBe(200);

		validateMainCredentialData(response2.body.data);
		expect(response2.body.data.data).toBeUndefined();
		expect(response2.body.data.sharedWith).toHaveLength(1);
	});

	test('should retrieve owned cred for member', async () => {
		const [member1, member2, member3] = await createManyUsers(3, {
			role: 'global:member',
		});
		const authMemberAgent = testServer.authAgentFor(member1);
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member1 });
		await shareCredentialWithUsers(savedCredential, [member2, member3]);

		const firstResponse = await authMemberAgent.get(`/credentials/${savedCredential.id}`);

		expect(firstResponse.statusCode).toBe(200);

		const { data: firstCredential } = firstResponse.body;
		validateMainCredentialData(firstCredential);
		expect(firstCredential.data).toBeUndefined();
		expect(firstCredential.ownedBy).toMatchObject({
			id: member1.id,
			email: member1.email,
			firstName: member1.firstName,
			lastName: member1.lastName,
		});
		expect(firstCredential.sharedWith).toHaveLength(2);
		firstCredential.sharedWith.forEach((recipient: IUser, _idx: number) => {
			expect([member2.id, member3.id]).toContain(recipient.id);
		});

		const secondResponse = await authMemberAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });

		expect(secondResponse.statusCode).toBe(200);

		const { data: secondCredential } = secondResponse.body;
		validateMainCredentialData(secondCredential);
		expect(secondCredential.data).toBeDefined();
		expect(firstCredential.sharedWith).toHaveLength(2);
	});

	test('should not retrieve non-owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const response = await testServer
			.authAgentFor(member)
			.get(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(403);
		expect(response.body.data).toBeUndefined(); // owner's cred not returned
	});

	test('should return 404 if cred not found', async () => {
		const response = await authOwnerAgent.get('/credentials/789');
		expect(response.statusCode).toBe(404);

		const responseAbc = await authOwnerAgent.get('/credentials/abc');
		expect(responseAbc.statusCode).toBe(404);

		// because EE router has precedence, check if forwards this route
		const responseNew = await authOwnerAgent.get('/credentials/new');
		expect(responseNew.statusCode).toBe(200);
	});
});

function validateMainCredentialData(credential: ListQuery.Credentials.WithOwnedByAndSharedWith) {
	expect(typeof credential.name).toBe('string');
	expect(typeof credential.type).toBe('string');
	expect(typeof credential.nodesAccess[0].nodeType).toBe('string');
	expect(credential.ownedBy).toBeDefined();
	expect(Array.isArray(credential.sharedWith)).toBe(true);
}
