import { mockInstance, randomCredentialPayload, testDb } from '@n8n/backend-test-utils';
import type { ICredentialsDb, User } from '@n8n/db';
import {
	CredentialsEntity,
	CredentialsRepository,
	InstanceCredentialAssignmentRepository,
	SharedCredentialsRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';
import { InstanceCredentialBroker } from '@/credentials/instance-credential-broker';
import type { InstanceCredentialUse } from '@/credentials/instance-credential-use.registry';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { ExternalHooks } from '@/external-hooks';

import {
	createCredentials,
	decryptCredentialData,
	encryptCredentialData,
} from '../shared/db/credentials';
import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { initCredentialsTypes, setupTestServer } from '../shared/utils';

const externalHooks = mockInstance(ExternalHooks);
const testServer = setupTestServer({ endpointGroups: ['credentials'] });
const TEST_CREDENTIAL_USE = {
	id: 'test:instance-credential',
	credentialTypes: ['httpHeaderAuth'],
	validate: ({ data }) => {
		if (data.name !== 'x-api-key') throw new UnprocessableRequestError('Invalid header name');
	},
} satisfies InstanceCredentialUse;

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

beforeAll(async () => {
	await initCredentialsTypes();
	Container.get(InstanceCredentialBroker).registerUse(TEST_CREDENTIAL_USE);
	owner = await createOwner();
	member = await createMember();
	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
});

beforeEach(async () => {
	externalHooks.run.mockReset();
	await testDb.truncate(['InstanceCredentialAssignment', 'SharedCredentials', 'CredentialsEntity']);
});

async function createInstanceCredential(payload = randomCredentialPayload()) {
	const entity = new CredentialsEntity();
	Object.assign(entity, payload, { usageScope: 'instance' });
	await encryptCredentialData(entity);
	return await createCredentials(entity);
}

describe('instance credentials', () => {
	test('owner creates one without any sharing rows', async () => {
		const payload = { ...randomCredentialPayload(), usageScope: 'instance' };

		const response = await authOwnerAgent.post('/credentials').send(payload);

		expect(response.statusCode).toBe(200);
		const { id } = response.body.data;
		await expect(
			Container.get(SharedCredentialsRepository).findBy({ credentialsId: id }),
		).resolves.toEqual([]);
	});

	test('member cannot create one', async () => {
		const payload = { ...randomCredentialPayload(), usageScope: 'instance' };

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

	describe('assigned to an instance credential use', () => {
		const sandboxPayload = {
			name: 'AI Assistant sandbox',
			type: 'httpHeaderAuth',
			data: { name: 'x-api-key', value: 'secret' },
		};

		async function createAssignedSandboxCredential() {
			const credential = await createInstanceCredential(sandboxPayload);
			await Container.get(InstanceCredentialAssignmentRepository).assignCredential(
				TEST_CREDENTIAL_USE.id,
				credential.id,
				TEST_CREDENTIAL_USE.credentialTypes,
			);
			return credential;
		}

		test('owner can update an assigned credential', async () => {
			const credential = await createAssignedSandboxCredential();

			await authOwnerAgent
				.patch(`/credentials/${credential.id}`)
				.send({ ...sandboxPayload, data: { name: 'x-api-key', value: 'rotated' } })
				.expect(200);

			const row = await Container.get(CredentialsRepository).findOneByOrFail({
				id: credential.id,
			});
			expect(await decryptCredentialData(row)).toMatchObject({ value: 'rotated' });
		});

		test('owner cannot update an assigned credential with data rejected by its use', async () => {
			const credential = await createAssignedSandboxCredential();

			await authOwnerAgent
				.patch(`/credentials/${credential.id}`)
				.send({ ...sandboxPayload, data: { name: 'Authorization', value: 'secret' } })
				.expect(422);

			const row = await Container.get(CredentialsRepository).findOneByOrFail({
				id: credential.id,
			});
			expect(await decryptCredentialData(row)).toMatchObject({ name: 'x-api-key' });
		});

		test('owner cannot update one when a hook makes it invalid for its use', async () => {
			const credential = await createAssignedSandboxCredential();
			const invalid = await Container.get(CredentialsService).createEncryptedData({
				id: credential.id,
				name: credential.name,
				type: credential.type,
				data: { name: 'Authorization', value: 'hooked' },
			});
			externalHooks.run.mockImplementation(async (event, hookParameters) => {
				if (event !== 'credentials.update') return;
				const [hooked] = hookParameters as [ICredentialsDb];
				hooked.data = invalid.data;
			});

			await authOwnerAgent
				.patch(`/credentials/${credential.id}`)
				.send({ ...sandboxPayload, data: { name: 'x-api-key', value: 'rotated' } })
				.expect(422);

			const row = await Container.get(CredentialsRepository).findOneByOrFail({
				id: credential.id,
			});
			expect(await decryptCredentialData(row)).toMatchObject({
				name: 'x-api-key',
				value: 'secret',
			});
		});
	});
});
