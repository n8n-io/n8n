import type { User } from '@n8n/db';
import { SecretsProviderConnectionRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

let owner: User;
let publicApiAgent: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi'],
	enabledFeatures: ['feat:externalSecrets'],
	modules: ['external-secrets'],
});

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	publicApiAgent = testServer.publicApiAgentFor(owner);
});

async function seedConnection(providerKey: string, managedBy: 'api' | 'config-file' = 'api') {
	const repository = Container.get(SecretsProviderConnectionRepository);
	return await repository.save(
		repository.create({
			providerKey,
			type: 'vault',
			encryptedSettings: '{}',
			isEnabled: true,
			managedBy,
		}),
	);
}

describe('Public API external secrets connections', () => {
	test('GET /external-secrets/connections lists connections without settings', async () => {
		await seedConnection('publicApiListTest', 'config-file');

		const resp = await publicApiAgent.get('/external-secrets/connections');

		expect(resp.status).toBe(200);
		const found = resp.body.data.find((c: { name: string }) => c.name === 'publicApiListTest');
		expect(found).toMatchObject({ managedBy: 'config-file', type: 'vault' });
		expect(found.settings).toBeUndefined();
	});

	test('GET /external-secrets/connections/:providerKey returns one connection', async () => {
		await seedConnection('publicApiGetTest');

		const resp = await publicApiAgent.get('/external-secrets/connections/publicApiGetTest');

		expect(resp.status).toBe(200);
		expect(resp.body).toMatchObject({ name: 'publicApiGetTest', managedBy: 'api' });
	});

	test('POST /external-secrets/connections/:providerKey has no matching route for create', async () => {
		const resp = await publicApiAgent.post('/external-secrets/connections').send({});

		expect(resp.status).toBe(404);
	});
});
