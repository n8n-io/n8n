import type { SecretProviderTypeResponse, SecretsProviderType } from '@n8n/api-types';
import { LicenseState, Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Response } from 'superagent';

import { ExternalSecretsProviders } from '@/modules/external-secrets.ee/external-secrets-providers.ee';
import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';

import {
	AnotherDummyProvider,
	createDummyProvider,
	DummyProvider,
	MockProviders,
} from '../../shared/external-secrets/utils';
import { createAdmin, createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

const mockProvidersInstance = new MockProviders();
mockInstance(ExternalSecretsProviders, mockProvidersInstance);

const licenseMock = mock<LicenseState>();
licenseMock.isLicensed.mockReturnValue(true);
Container.set(LicenseState, licenseMock);

mockInstance(ExternalSecretsConfig, {
	externalSecretsForProjects: true,
});

describe('Secret Providers Types API', () => {
	const testServer = setupTestServer({
		endpointGroups: ['externalSecrets'],
		enabledFeatures: ['feat:externalSecrets'],
		modules: ['external-secrets'],
	});

	let ownerAgent: SuperAgentTest;
	let adminAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;

	beforeAll(async () => {
		await testModules.loadModules(['external-secrets']);
		await testDb.init();

		Container.set(Logger, mockLogger());

		const owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);

		const admin = await createAdmin();
		adminAgent = testServer.authAgentFor(admin);

		const member = await createMember();
		memberAgent = testServer.authAgentFor(member);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('GET /secret-providers/types', () => {
		describe('Authorization', () => {
			beforeAll(() => {
				mockProvidersInstance.setProviders({
					dummy: DummyProvider,
				});
			});

			it('should authorize owner to list provider types', async () => {
				const response = await ownerAgent.get('/secret-providers/types');
				expect(response.status).toBe(200);
			});

			it('should authorize global admin to list provider types', async () => {
				const response = await adminAgent.get('/secret-providers/types');
				expect(response.status).toBe(200);
			});

			it('should refuse member to list provider types', async () => {
				const response = await memberAgent.get('/secret-providers/types');
				expect(response.status).toBe(403);
			});
		});

		describe('with providers', () => {
			const mockProvider = createDummyProvider({
				name: 'mock_provider',
				displayName: 'Mock Provider Custom',
				properties: [
					{
						name: 'apiKey',
						displayName: 'API Key',
						type: 'string',
						default: '',
						required: true,
						typeOptions: {
							password: true,
						},
					},
					{
						name: 'region',
						displayName: 'Region',
						type: 'options',
						default: 'us-east-1',
						options: [
							{ name: 'US East', value: 'us-east-1' },
							{ name: 'US West', value: 'us-west-2' },
							{ name: 'EU Central', value: 'eu-central-1' },
						],
						required: false,
					},
					{
						name: 'projectId',
						displayName: 'Project ID',
						type: 'string',
						default: '',
						required: false,
					},
					{
						name: 'environment',
						displayName: 'Environment',
						type: 'string',
						default: 'production',
						required: false,
					},
				],
			});

			let response: Response;

			beforeAll(async () => {
				mockProvidersInstance.setProviders({
					dummy: DummyProvider,
					another_dummy: AnotherDummyProvider,
					mock_provider: mockProvider,
				});

				response = await ownerAgent.get('/secret-providers/types');
			});

			it('should return all available provider types', () => {
				const { data } = response.body as { data: SecretProviderTypeResponse[] };
				expect(response.status).toBe(200);
				expect(data).toBeInstanceOf(Array);
				expect(data).toHaveLength(3);

				const providerNames = data.map((p) => p.type);
				expect(providerNames).toEqual(
					expect.arrayContaining(['dummy', 'another_dummy', 'mock_provider']),
				);
			});

			it('should return correct provider type data', () => {
				const { data } = response.body as { data: SecretProviderTypeResponse[] };

				const expectedMockProvider = data.find(
					(p) => p.type === ('mock_provider' as SecretsProviderType),
				);
				expect(expectedMockProvider).toBeDefined();
				expect(expectedMockProvider?.displayName).toBe('Mock Provider Custom');
				expect(expectedMockProvider?.properties).toHaveLength(4);

				const propertiesNames = expectedMockProvider?.properties?.map((p) => p.name);
				expect(propertiesNames).toEqual(
					expect.arrayContaining(['apiKey', 'region', 'projectId', 'environment']),
				);
			});
		});

		describe('without providers', () => {
			it('should return empty array when no providers are registered', async () => {
				mockProvidersInstance.setProviders({});

				const response = await ownerAgent.get('/secret-providers/types');

				expect(response.status).toBe(200);
				const { data } = response.body as { data: SecretProviderTypeResponse[] };
				expect(data).toBeInstanceOf(Array);
				expect(data).toHaveLength(0);
			});
		});
	});

	describe('GET /secret-providers/types/:type', () => {
		describe('Authorization', () => {
			beforeAll(() => {
				mockProvidersInstance.setProviders({
					dummy: DummyProvider,
				});
			});

			it('should authorize owner to get specific provider type', async () => {
				const response = await ownerAgent.get('/secret-providers/types/dummy');
				expect(response.status).toBe(200);
			});

			it('should authorize global admin to get specific provider type', async () => {
				const response = await adminAgent.get('/secret-providers/types/dummy');
				expect(response.status).toBe(200);
			});

			it('should refuse member to get provider type', async () => {
				const response = await memberAgent.get('/secret-providers/types/dummy');
				expect(response.status).toBe(403);
			});
		});

		describe('with provider', () => {
			const mockProvider = createDummyProvider({
				name: 'vault',
				displayName: 'HashiCorp Vault',
				properties: [
					{
						name: 'url',
						displayName: 'Vault URL',
						type: 'string',
						default: '',
						required: true,
						placeholder: 'https://vault.example.com',
					},
					{
						name: 'token',
						displayName: 'Token',
						type: 'string',
						default: '',
						required: true,
						typeOptions: {
							password: true,
						},
					},
					{
						name: 'namespace',
						displayName: 'Namespace',
						type: 'string',
						default: '',
						required: false,
					},
				],
			});

			let response: Response;

			beforeAll(async () => {
				mockProvidersInstance.setProviders({
					dummy: DummyProvider,
					vault: mockProvider,
				});

				response = await ownerAgent.get('/secret-providers/types/vault');
			});

			it('should return provider type', () => {
				expect(response.status).toBe(200);
				const { data } = response.body as { data: SecretProviderTypeResponse };
				expect(data).toBeDefined();
				expect(data.type).toBe('vault');
			});

			it('should return correct provider type data', () => {
				const { data } = response.body as { data: SecretProviderTypeResponse };

				expect(data.displayName).toBe('HashiCorp Vault');
				expect(data.icon).toBe('vault');
				expect(data.properties).toHaveLength(3);

				const propertyNames = data.properties.map((p) => p.name);
				expect(propertyNames).toEqual(expect.arrayContaining(['url', 'token', 'namespace']));

				// Verify password field has correct typeOptions
				const tokenProperty = data.properties.find((p) => p.name === 'token');
				expect(tokenProperty?.typeOptions).toEqual({ password: true });

				// Verify required fields
				const urlProperty = data.properties.find((p) => p.name === 'url');
				expect(urlProperty?.required).toBe(true);

				const namespaceProperty = data.properties.find((p) => p.name === 'namespace');
				expect(namespaceProperty?.required).toBe(false);
			});
		});

		describe('without provider', () => {
			let response: Response;

			beforeAll(async () => {
				mockProvidersInstance.setProviders({
					dummy: DummyProvider,
				});

				response = await ownerAgent.get('/secret-providers/types/non_existent');
			});

			it('should return 404 for non-existent provider type', () => {
				expect(response.status).toBe(404);
			});

			it('should return 404 with appropriate error message', () => {
				expect(response.body).toEqual({
					code: 404,
					message: 'Provider type "non_existent" not found',
				});
			});
		});
	});
});
