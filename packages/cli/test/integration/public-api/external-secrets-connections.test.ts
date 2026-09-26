import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { SecretsProviderConnectionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';

import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { ExternalSecretsManager } from '@/modules/external-secrets.ee/external-secrets-manager.ee';
import { ExternalSecretsProviders } from '@/modules/external-secrets.ee/external-secrets-providers.ee';
import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';

import { DummyProvider, MockProviders } from '../../shared/external-secrets/utils';
import { createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

const mockProvidersInstance = new MockProviders();
mockProvidersInstance.setProviders({ vault: DummyProvider });
mockInstance(ExternalSecretsProviders, mockProvidersInstance);

mockInstance(ExternalSecretsConfig, {
	externalSecretsForProjects: true,
	configFilePath: '',
});

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

beforeEach(() => {
	testServer.license.enable('feat:externalSecrets');
});

async function seedConnection(providerKey: string, managedBy: 'api' | 'config-file' = 'api') {
	const repository = Container.get(SecretsProviderConnectionRepository);
	const encryptedSettings = await Container.get(Cipher).encryptV2({ username: 'user' });
	return await repository.save(
		repository.create({
			providerKey,
			type: 'vault',
			encryptedSettings,
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

	test('POST /external-secrets/connections/:providerKey/test tests a config-file-managed connection', async () => {
		await seedConnection('publicApiTestTest', 'config-file');

		const resp = await publicApiAgent.post('/external-secrets/connections/publicApiTestTest/test');

		expect(resp.status).toBe(200);
		expect(resp.body).toMatchObject({ success: true });
	});

	test('POST /external-secrets/connections/:providerKey/reload reloads a config-file-managed connection', async () => {
		await seedConnection('publicApiReloadTest', 'config-file');
		const manager = Container.get(ExternalSecretsManager);
		await manager.reloadAllProviders();
		const updateSpy = vi.spyOn(manager.getProvider('publicApiReloadTest')!, 'update');

		const resp = await publicApiAgent.post(
			'/external-secrets/connections/publicApiReloadTest/reload',
		);

		expect(resp.status).toBe(200);
		expect(resp.body).toEqual({ success: true });
		expect(updateSpy).toHaveBeenCalled();
	});

	test('POST /external-secrets/connections/:providerKey/reload returns 404 for an unknown key', async () => {
		const resp = await publicApiAgent.post('/external-secrets/connections/doesNotExist/reload');

		expect(resp.status).toBe(404);
	});

	describe('license gating', () => {
		const licenseErrorMessage = new FeatureNotLicensedError('feat:externalSecrets').message;

		test.each([
			['get', '/external-secrets/connections'],
			['get', '/external-secrets/connections/publicApiLicenseTest'],
			['post', '/external-secrets/connections/publicApiLicenseTest/test'],
			['post', '/external-secrets/connections/publicApiLicenseTest/reload'],
		] as const)('%s %s is rejected when not licensed', async (method, path) => {
			await seedConnection(`publicApiLicense${method}${path.length}`);
			testServer.license.disable('feat:externalSecrets');

			const resp = await publicApiAgent[method](path);

			expect(resp.status).toBe(403);
			expect(resp.body).toHaveProperty('message', licenseErrorMessage);
		});
	});

	describe('scope gating', () => {
		test.each([
			['get', '/external-secrets/connections'],
			['get', '/external-secrets/connections/publicApiScopeTest'],
			['post', '/external-secrets/connections/publicApiScopeTest/test'],
			['post', '/external-secrets/connections/publicApiScopeTest/reload'],
		] as const)('%s %s is rejected without the matching API key scope', async (method, path) => {
			const ownerWithoutScope = await createOwnerWithApiKey({ scopes: ['variable:list'] });

			const resp = await testServer.publicApiAgentFor(ownerWithoutScope)[method](path);

			expect(resp.status).toBe(403);
			expect(resp.body).toHaveProperty('message', 'Forbidden');
		});
	});
});
