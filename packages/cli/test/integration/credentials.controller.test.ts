import * as testDb from './shared/testDb';
import * as utils from './shared/utils/';
import { randomCredentialPayload as payload } from './shared/random';

import type { Credentials } from '@/requests';
import type { User } from '@db/entities/User';

const testServer = utils.setupTestServer({ endpointGroups: ['credentials'] });

let owner: User;
let member: User;

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'Credentials']);

	owner = await testDb.createOwner();
	member = await testDb.createMember();
});

type GetAllResponse = { body: { data: Credentials.WithOwnedByAndSharedWith[] } };

describe('GET /credentials', () => {
	describe('should return', () => {
		test('all creds for owner', async () => {
			const role = await testDb.getCredentialOwnerRole();

			const { id: id1 } = await testDb.saveCredential(payload(), { user: owner, role });
			const { id: id2 } = await testDb.saveCredential(payload(), { user: member, role });

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.expect(200);

			expect(response.body.data).toHaveLength(2);

			response.body.data.forEach(validateCredential);

			const savedIds = [id1, id2];
			const returnedIds = response.body.data.map((c) => c.id);

			expect(savedIds).toEqual(returnedIds);
		});

		test('only own creds for member', async () => {
			const role = await testDb.getCredentialOwnerRole();

			const firstMember = member;
			const secondMember = await testDb.createMember();

			const c1 = await testDb.saveCredential(payload(), { user: firstMember, role });
			const c2 = await testDb.saveCredential(payload(), { user: secondMember, role });

			const response: GetAllResponse = await testServer
				.authAgentFor(firstMember)
				.get('/credentials')
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [firstMemberCred] = response.body.data;

			validateCredential(firstMemberCred);
			expect(firstMemberCred.id).toBe(c1.id);
			expect(firstMemberCred.id).not.toBe(c2.id);
		});
	});
});

function validateCredential(credential: Credentials.WithOwnedByAndSharedWith) {
	const { name, type, nodesAccess, sharedWith, ownedBy } = credential;

	expect(typeof name).toBe('string');
	expect(typeof type).toBe('string');
	expect(typeof nodesAccess[0].nodeType).toBe('string');
	expect('data' in credential).toBe(false);

	expect(Array.isArray(sharedWith)).toBe(true);

	if (ownedBy === null) fail('Expected `ownedBy` not to be `null`');

	const { id, email, firstName, lastName } = ownedBy;

	expect(typeof id).toBe('string');
	expect(typeof email).toBe('string');
	expect(typeof firstName).toBe('string');
	expect(typeof lastName).toBe('string');
}
