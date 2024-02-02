import type { ListQuery } from '@/requests';
import type { User } from '@db/entities/User';
import * as testDb from './shared/testDb';
import { setupTestServer } from './shared/utils/';
import { randomCredentialPayload as payload } from './shared/random';
import { saveCredential } from './shared/db/credentials';
import { createMember, createOwner } from './shared/db/users';

const { any } = expect;

const testServer = setupTestServer({ endpointGroups: ['credentials'] });

let owner: User;
let member: User;

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'Credentials']);

	owner = await createOwner();
	member = await createMember();
});

type GetAllResponse = { body: { data: ListQuery.Credentials.WithOwnedByAndSharedWith[] } };

describe('POST /credentials', () => {
	const testPayload = {
		name: 'test',
		type: 'test',
		data: { super: 'secret' },
		nodesAccess: [],
	};

	describe('as unauthorized user', () => {
		it('returns 401', async () => {
			await testServer.authlessAgent.post('/credentials').send(testPayload).expect(401);
		});
	});

	describe('as a member', () => {
		it('persists the credential', async () => {
			//
			// ACT
			//
			const postResponse = await testServer
				.authAgentFor(member)
				.post('/credentials')
				.send(testPayload)
				.expect(200);

			//
			// ASSERT
			//
			expect(postResponse.body.data).toMatchObject({
				name: 'test',
				data: expect.any(String),
				type: 'test',
				nodesAccess: [],
				id: expect.any(String),
				updatedAt: expect.any(String),
				createdAt: expect.any(String),
			});

			const getResponse = await testServer
				.authAgentFor(member)
				.get(`/credentials/${postResponse.body.data.id}`)
				.query({ includeData: true })
				.expect(200);

			expect(getResponse.body.data).toMatchObject({
				...postResponse.body.data,
				// match against decryped data
				data: testPayload.data,
			});
		});
	});

	describe('as an owner', () => {
		it('persists the credential', async () => {
			//
			// ACT
			//
			const postResponse = await testServer
				.authAgentFor(owner)
				.post('/credentials')
				.send(testPayload)
				.expect(200);

			//
			// ASSERT
			//
			expect(postResponse.body.data).toMatchObject({
				name: 'test',
				data: expect.any(String),
				type: 'test',
				nodesAccess: [],
				id: expect.any(String),
				updatedAt: expect.any(String),
				createdAt: expect.any(String),
			});

			const getResponse = await testServer
				.authAgentFor(owner)
				.get(`/credentials/${postResponse.body.data.id}`)
				.query({ includeData: true })
				.expect(200);

			expect(getResponse.body.data).toMatchObject({
				...postResponse.body.data,
				// match against decrypted data
				data: testPayload.data,
			});
		});
	});
});

describe('GET /credentials/:id', () => {
	const testPayload = {
		name: 'test',
		type: 'test',
		data: { super: 'secret' },
		nodesAccess: [],
	};

	describe('as unauthorized user', () => {
		it('does not return the credential', async () => {
			//
			// ARRANGE
			//
			const postResponse = await testServer
				.authAgentFor(member)
				.post('/credentials')
				.send(testPayload)
				.expect(200);

			//
			// ACT & ASSERT
			//
			await testServer.authlessAgent.get(`/credentials/${postResponse.body.data.id}`).expect(401);
		});
	});

	describe('as a member', () => {
		it('does not return decrypted data by default', async () => {
			//
			// ARRANGE
			//
			const postResponse = await testServer
				.authAgentFor(member)
				.post('/credentials')
				.send(testPayload)
				.expect(200);

			//
			// ACT
			//
			const getResponse = await testServer
				.authAgentFor(member)
				.get(`/credentials/${postResponse.body.data.id}`)
				.expect(200);

			//
			// ASSERT
			//
			expect(getResponse.body.data.data).toBeUndefined();
		});

		it("does not return another user's credentials", async () => {
			//
			// ARRANGE
			//
			const postResponse = await testServer
				.authAgentFor(owner)
				.post('/credentials')
				.send(testPayload)
				.expect(200);

			//
			// ACT & ASSERT
			//
			await testServer
				.authAgentFor(member)
				.get(`/credentials/${postResponse.body.data.id}`)
				.expect(404);
		});
	});

	describe('as an owner', () => {
		it("returns another user's credential", async () => {
			//
			// ARRANGE
			//
			const postResponse = await testServer
				.authAgentFor(member)
				.post('/credentials')
				.send(testPayload)
				.expect(200);

			//
			// ACT
			//
			const getAllResponse = await testServer
				.authAgentFor(owner)
				.get(`/credentials/${postResponse.body.data.id}`)
				.query({ includeData: true })
				.expect(200);

			//
			// ASSERT
			//

			expect(getAllResponse.body.data).toMatchObject({
				...postResponse.body.data,
				// match against decryped data
				data: testPayload.data,
			});
		});
	});
});

describe('GET /credentials', () => {
	describe('should return', () => {
		test('all credentials for owner', async () => {
			const { id: id1 } = await saveCredential(payload(), {
				user: owner,
				role: 'credential:owner',
			});
			const { id: id2 } = await saveCredential(payload(), {
				user: member,
				role: 'credential:owner',
			});

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.expect(200);

			expect(response.body.data).toHaveLength(2);

			response.body.data.forEach(validateCredential);

			const savedIds = [id1, id2].sort();
			const returnedIds = response.body.data.map((c) => c.id).sort();

			expect(savedIds).toEqual(returnedIds);
		});

		test('only own credentials for member', async () => {
			const firstMember = member;
			const secondMember = await createMember();

			const c1 = await saveCredential(payload(), { user: firstMember, role: 'credential:owner' });
			const c2 = await saveCredential(payload(), { user: secondMember, role: 'credential:owner' });

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

	describe('filter', () => {
		test('should filter credentials by field: name - full match', async () => {
			const savedCred = await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "name": "${savedCred.name}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [returnedCred] = response.body.data;

			expect(returnedCred.name).toBe(savedCred.name);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('filter={ "name": "Non-Existing Credential" }')
				.expect(200);

			expect(_response.body.data).toHaveLength(0);
		});

		test('should filter credentials by field: name - partial match', async () => {
			const savedCred = await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const partialName = savedCred.name.slice(3);

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "name": "${partialName}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [returnedCred] = response.body.data;

			expect(returnedCred.name).toBe(savedCred.name);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('filter={ "name": "Non-Existing Credential" }')
				.expect(200);

			expect(_response.body.data).toHaveLength(0);
		});

		test('should filter credentials by field: type - full match', async () => {
			const savedCred = await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "type": "${savedCred.type}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [returnedCred] = response.body.data;

			expect(returnedCred.type).toBe(savedCred.type);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('filter={ "type": "Non-Existing Credential" }')
				.expect(200);

			expect(_response.body.data).toHaveLength(0);
		});

		test('should filter credentials by field: type - partial match', async () => {
			const savedCred = await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const partialType = savedCred.type.slice(3);

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "type": "${partialType}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [returnedCred] = response.body.data;

			expect(returnedCred.type).toBe(savedCred.type);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('filter={ "type": "Non-Existing Credential" }')
				.expect(200);

			expect(_response.body.data).toHaveLength(0);
		});
	});

	describe('select', () => {
		test('should select credential field: id', async () => {
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('select=["id"]')
				.expect(200);

			expect(response.body).toEqual({
				data: [{ id: any(String) }, { id: any(String) }],
			});
		});

		test('should select credential field: name', async () => {
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('select=["name"]')
				.expect(200);

			expect(response.body).toEqual({
				data: [{ name: any(String) }, { name: any(String) }],
			});
		});

		test('should select credential field: type', async () => {
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('select=["type"]')
				.expect(200);

			expect(response.body).toEqual({
				data: [{ type: any(String) }, { type: any(String) }],
			});
		});
	});

	describe('take', () => {
		test('should return n credentials or less, without skip', async () => {
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('take=2')
				.expect(200);

			expect(response.body.data).toHaveLength(2);

			response.body.data.forEach(validateCredential);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('take=1')
				.expect(200);

			expect(_response.body.data).toHaveLength(1);

			_response.body.data.forEach(validateCredential);
		});

		test('should return n credentials or less, with skip', async () => {
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('take=1&skip=1')
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			response.body.data.forEach(validateCredential);
		});
	});
});

function validateCredential(credential: ListQuery.Credentials.WithOwnedByAndSharedWith) {
	const { name, type, nodesAccess, sharedWith, ownedBy } = credential;

	expect(typeof name).toBe('string');
	expect(typeof type).toBe('string');
	expect(typeof nodesAccess[0].nodeType).toBe('string');
	expect('data' in credential).toBe(false);

	if (sharedWith) expect(Array.isArray(sharedWith)).toBe(true);

	if (ownedBy) {
		const { id, email, firstName, lastName } = ownedBy;

		expect(typeof id).toBe('string');
		expect(typeof email).toBe('string');
		expect(typeof firstName).toBe('string');
		expect(typeof lastName).toBe('string');
	}
}
