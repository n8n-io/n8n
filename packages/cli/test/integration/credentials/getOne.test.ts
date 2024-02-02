import type { SuperAgentTest } from 'supertest';

import type { User } from '@db/entities/User';
import { License } from '@/License';

import { randomCredentialPayload } from '../shared/random';
import * as testDb from '../shared/testDb';
import type { SaveCredentialFunction } from '../shared/types';
import * as utils from '../shared/utils/';
import { affixRoleToSaveCredential } from '../shared/db/credentials';
import { createUser } from '../shared/db/users';
import { validateMainCredentialData } from './shared';

// mock that credentialsSharing is not enabled
jest.spyOn(License.prototype, 'isSharingEnabled').mockReturnValue(false);
const testServer = utils.setupTestServer({ endpointGroups: ['credentials'] });

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let saveCredential: SaveCredentialFunction;

beforeAll(async () => {
	owner = await createUser({ role: 'global:owner' });
	member = await createUser({ role: 'global:member' });

	saveCredential = affixRoleToSaveCredential('credential:owner');

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'Credentials']);
});

describe('GET /credentials/:id', () => {
	test('should retrieve owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const firstResponse = await authOwnerAgent.get(`/credentials/${savedCredential.id}`);

		expect(firstResponse.statusCode).toBe(200);

		validateMainCredentialData(firstResponse.body.data);
		expect(firstResponse.body.data.data).toBeUndefined();

		const secondResponse = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });

		validateMainCredentialData(secondResponse.body.data);
		expect(secondResponse.body.data.data).toBeDefined();
	});

	test('should retrieve owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const firstResponse = await authMemberAgent.get(`/credentials/${savedCredential.id}`);

		expect(firstResponse.statusCode).toBe(200);

		validateMainCredentialData(firstResponse.body.data);
		expect(firstResponse.body.data.data).toBeUndefined();

		const secondResponse = await authMemberAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });

		expect(secondResponse.statusCode).toBe(200);

		validateMainCredentialData(secondResponse.body.data);
		expect(secondResponse.body.data.data).toBeDefined();
	});

	test('should retrieve non-owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const response1 = await authOwnerAgent.get(`/credentials/${savedCredential.id}`);

		expect(response1.statusCode).toBe(200);

		validateMainCredentialData(response1.body.data);
		expect(response1.body.data.data).toBeUndefined();

		const response2 = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });

		expect(response2.statusCode).toBe(200);

		validateMainCredentialData(response2.body.data);
		expect(response2.body.data.data).toBeDefined();
	});

	test('should not retrieve non-owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const response = await authMemberAgent.get(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(404);
		expect(response.body.data).toBeUndefined(); // owner's cred not returned
	});

	test('should return 404 if cred not found', async () => {
		const response = await authOwnerAgent.get('/credentials/789');
		expect(response.statusCode).toBe(404);

		const responseAbc = await authOwnerAgent.get('/credentials/abc');
		expect(responseAbc.statusCode).toBe(404);
	});
});
