import { SecretsProviderConnectionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';

import { createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

let authOwnerAgent: SuperAgentTest;

const testServer = setupTestServer({
	endpointGroups: ['externalSecrets'],
	enabledFeatures: ['feat:externalSecrets'],
	modules: ['external-secrets'],
});

beforeAll(async () => {
	const owner = await createOwner();
	authOwnerAgent = testServer.authAgentFor(owner);
});

async function seedConfigFileManagedConnection(providerKey: string) {
	const repository = Container.get(SecretsProviderConnectionRepository);
	const cipher = Container.get(Cipher);
	const encryptedSettings = cipher.encryptWithInstanceKey(JSON.stringify({}));
	const connection = repository.create({
		providerKey,
		type: 'vault',
		encryptedSettings,
		isEnabled: true,
		managedBy: 'config-file',
	});
	return await repository.save(connection);
}

describe('config-file-managed connections are read-only', () => {
	test('PATCH /secret-providers/connections/:providerKey is rejected', async () => {
		await seedConfigFileManagedConnection('readonlyPatchTest');

		const resp = await authOwnerAgent
			.patch('/secret-providers/connections/readonlyPatchTest')
			.send({ isEnabled: false });

		expect(resp.status).toBe(403);
	});

	test('DELETE /secret-providers/connections/:providerKey is rejected', async () => {
		await seedConfigFileManagedConnection('readonlyDeleteTest');

		const resp = await authOwnerAgent.delete('/secret-providers/connections/readonlyDeleteTest');

		expect(resp.status).toBe(403);
	});

	test('GET /secret-providers/connections/:providerKey reports managedBy', async () => {
		await seedConfigFileManagedConnection('managedByVisibleTest');

		const resp = await authOwnerAgent.get('/secret-providers/connections/managedByVisibleTest');

		expect(resp.status).toBe(200);
		expect(resp.body.data.managedBy).toBe('config-file');
	});
});
