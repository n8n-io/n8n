import { Container } from 'typedi';
import type { SuperAgentTest } from 'supertest';

import type { User } from '@db/entities/User';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { License } from '@/License';

import { randomCredentialPayload } from '../shared/random';
import * as testDb from '../shared/testDb';
import * as utils from '../shared/utils/';
import { createUser } from '../shared/db/users';
import { INVALID_PAYLOADS } from './shared';

// mock that credentialsSharing is not enabled
jest.spyOn(License.prototype, 'isSharingEnabled').mockReturnValue(false);
const testServer = utils.setupTestServer({ endpointGroups: ['credentials'] });

let owner: User;
let authOwnerAgent: SuperAgentTest;

beforeAll(async () => {
	owner = await createUser({ role: 'global:owner' });

	authOwnerAgent = testServer.authAgentFor(owner);
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'Credentials']);
});

describe('POST /credentials', () => {
	test('should create cred', async () => {
		const payload = randomCredentialPayload();

		const response = await authOwnerAgent.post('/credentials').send(payload);

		expect(response.statusCode).toBe(200);

		const { id, name, type, nodesAccess, data: encryptedData } = response.body.data;

		expect(name).toBe(payload.name);
		expect(type).toBe(payload.type);
		if (!payload.nodesAccess) {
			fail('Payload did not contain a nodesAccess array');
		}
		expect(nodesAccess[0].nodeType).toBe(payload.nodesAccess[0].nodeType);
		expect(encryptedData).not.toBe(payload.data);

		const credential = await Container.get(CredentialsRepository).findOneByOrFail({ id });

		expect(credential.name).toBe(payload.name);
		expect(credential.type).toBe(payload.type);
		expect(credential.nodesAccess[0].nodeType).toBe(payload.nodesAccess[0].nodeType);
		expect(credential.data).not.toBe(payload.data);

		const sharedCredential = await Container.get(SharedCredentialsRepository).findOneOrFail({
			relations: ['user', 'credentials'],
			where: { credentialsId: credential.id },
		});

		expect(sharedCredential.user.id).toBe(owner.id);
		expect(sharedCredential.credentials.name).toBe(payload.name);
	});

	test('should fail with invalid inputs', async () => {
		for (const invalidPayload of INVALID_PAYLOADS) {
			const response = await authOwnerAgent.post('/credentials').send(invalidPayload);
			expect(response.statusCode).toBe(400);
		}
	});

	test('should ignore ID in payload', async () => {
		const firstResponse = await authOwnerAgent
			.post('/credentials')
			.send({ id: '8', ...randomCredentialPayload() });

		expect(firstResponse.body.data.id).not.toBe('8');

		const secondResponse = await authOwnerAgent
			.post('/credentials')
			.send({ id: 8, ...randomCredentialPayload() });

		expect(secondResponse.body.data.id).not.toBe(8);
	});
});
