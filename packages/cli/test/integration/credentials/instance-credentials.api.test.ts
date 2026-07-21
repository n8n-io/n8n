import { randomCredentialPayload, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { CredentialsEntity, SharedCredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createCredentials, encryptCredentialData } from '../shared/db/credentials';
import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { initCredentialsTypes, setupTestServer } from '../shared/utils';

const testServer = setupTestServer({ endpointGroups: ['credentials'] });

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

beforeAll(async () => {
	await initCredentialsTypes();
	owner = await createOwner();
	member = await createMember();
	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
});

async function createInstanceCredential(payload = randomCredentialPayload()) {
	const entity = new CredentialsEntity();
	Object.assign(entity, payload, { availability: 'instance' });
	await encryptCredentialData(entity);
	return await createCredentials(entity);
}

describe('instance credentials', () => {
	test('owner creates one without any sharing rows', async () => {
		const payload = { ...randomCredentialPayload(), availability: 'instance' };

		const response = await authOwnerAgent.post('/credentials').send(payload);

		expect(response.statusCode).toBe(200);
		const { id } = response.body.data;
		await expect(
			Container.get(SharedCredentialsRepository).findBy({ credentialsId: id }),
		).resolves.toEqual([]);
	});

	test('member cannot create one', async () => {
		const payload = { ...randomCredentialPayload(), availability: 'instance' };

		await authMemberAgent.post('/credentials').send(payload).expect(403);
	});

	test('never appear in the credentials list', async () => {
		const credential = await createInstanceCredential();

		for (const agent of [authOwnerAgent, authMemberAgent]) {
			const response = await agent.get('/credentials').expect(200);
			const ids = response.body.data.map((c: { id: string }) => c.id);
			expect(ids).not.toContain(credential.id);
		}
	});

	test('member cannot read, update, or delete one', async () => {
		const credential = await createInstanceCredential();

		await authMemberAgent.get(`/credentials/${credential.id}`).expect(404);
		await authMemberAgent
			.patch(`/credentials/${credential.id}`)
			.send(randomCredentialPayload())
			.expect(404);
		await authMemberAgent.delete(`/credentials/${credential.id}`).expect(404);
	});

	test('owner reads one without exposing plain secrets', async () => {
		const payload = randomCredentialPayload();
		const credential = await createInstanceCredential(payload);

		const response = await authOwnerAgent
			.get(`/credentials/${credential.id}`)
			.query({ includeData: true })
			.expect(200);

		expect(response.body.data.id).toBe(credential.id);
		expect(response.body.data.data?.accessToken).not.toBe(payload.data.accessToken);
	});

	test('owner can delete one', async () => {
		const credential = await createInstanceCredential();

		await authOwnerAgent.delete(`/credentials/${credential.id}`).expect(200);
	});
});
