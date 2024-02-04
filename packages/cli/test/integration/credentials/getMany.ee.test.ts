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
let authOwnerAgent: SuperAgentTest;
let saveCredential: SaveCredentialFunction;

beforeAll(async () => {
	owner = await createUser({ role: 'global:owner' });

	authOwnerAgent = testServer.authAgentFor(owner);

	saveCredential = affixRoleToSaveCredential('credential:owner');
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'Credentials']);
});

afterEach(() => {
	jest.clearAllMocks();
});

describe('GET /credentials', () => {
	test('should return all credentials for owner', async () => {
		const [member1, member2, member3] = await createManyUsers(3, {
			role: 'global:member',
		});

		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });
		await saveCredential(randomCredentialPayload(), { user: member1 });

		const sharedWith = [member1, member2, member3];
		await shareCredentialWithUsers(savedCredential, sharedWith);

		const response = await authOwnerAgent.get('/credentials');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(2); // owner retrieved owner cred and member cred
		const ownerCredential = response.body.data.find(
			(e: ListQuery.Credentials.WithOwnedByAndSharedWith) => e.ownedBy?.id === owner.id,
		);
		const memberCredential = response.body.data.find(
			(e: ListQuery.Credentials.WithOwnedByAndSharedWith) => e.ownedBy?.id === member1.id,
		);

		validateMainCredentialData(ownerCredential);
		expect(ownerCredential.data).toBeUndefined();

		validateMainCredentialData(memberCredential);
		expect(memberCredential.data).toBeUndefined();

		expect(ownerCredential.ownedBy).toMatchObject({
			id: owner.id,
			email: owner.email,
			firstName: owner.firstName,
			lastName: owner.lastName,
		});

		expect(Array.isArray(ownerCredential.sharedWith)).toBe(true);
		expect(ownerCredential.sharedWith).toHaveLength(3);

		// Fix order issue (MySQL might return items in any order)
		const ownerCredentialsSharedWithOrdered = [...ownerCredential.sharedWith!].sort(
			(a: IUser, b: IUser) => (a.email < b.email ? -1 : 1),
		);
		const orderedSharedWith = [...sharedWith].sort((a, b) => (a.email < b.email ? -1 : 1));

		ownerCredentialsSharedWithOrdered.forEach((recipient: IUser, idx: number) => {
			expect(recipient).toMatchObject({
				id: orderedSharedWith[idx].id,
				email: orderedSharedWith[idx].email,
				firstName: orderedSharedWith[idx].firstName,
				lastName: orderedSharedWith[idx].lastName,
			});
		});

		expect(memberCredential.ownedBy).toMatchObject({
			id: member1.id,
			email: member1.email,
			firstName: member1.firstName,
			lastName: member1.lastName,
		});

		expect(Array.isArray(memberCredential.sharedWith)).toBe(true);
		expect(memberCredential.sharedWith).toHaveLength(0);
	});

	test('should return only relevant credentials for member', async () => {
		const [member1, member2] = await createManyUsers(2, {
			role: 'global:member',
		});

		await saveCredential(randomCredentialPayload(), { user: member2 });
		const savedMemberCredential = await saveCredential(randomCredentialPayload(), {
			user: member1,
		});

		await shareCredentialWithUsers(savedMemberCredential, [member2]);

		const response = await testServer.authAgentFor(member1).get('/credentials');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(1); // member retrieved only member cred

		const [member1Credential] = response.body.data;

		validateMainCredentialData(member1Credential);
		expect(member1Credential.data).toBeUndefined();

		expect(member1Credential.ownedBy).toMatchObject({
			id: member1.id,
			email: member1.email,
			firstName: member1.firstName,
			lastName: member1.lastName,
		});

		expect(Array.isArray(member1Credential.sharedWith)).toBe(true);
		expect(member1Credential.sharedWith).toHaveLength(1);

		const [recipient] = member1Credential.sharedWith;

		expect(recipient).toMatchObject({
			id: member2.id,
			email: member2.email,
			firstName: member2.firstName,
			lastName: member2.lastName,
		});
	});
});

function validateMainCredentialData(credential: ListQuery.Credentials.WithOwnedByAndSharedWith) {
	expect(typeof credential.name).toBe('string');
	expect(typeof credential.type).toBe('string');
	expect(typeof credential.nodesAccess[0].nodeType).toBe('string');
	expect(credential.ownedBy).toBeDefined();
	expect(Array.isArray(credential.sharedWith)).toBe(true);
}
