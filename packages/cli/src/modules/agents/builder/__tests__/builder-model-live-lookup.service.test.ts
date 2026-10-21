import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import type {
	CustomFetch,
	HttpTransport,
	OutboundHttp,
	SsrfProtectionService,
} from '@n8n/backend-network';
import type { SsrfProtectionConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { UserError, type IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { CredentialsHelper } from '@/credentials-helper';
import type { AiGatewayService } from '@/services/ai-gateway.service';

import { BuilderModelLiveLookupService } from '../builder-model-live-lookup.service';

const listModelsForProvider = vi.fn();
const listAzureOpenAiModels = vi.fn();
vi.mock('@n8n/ai-utilities/model-discovery', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/ai-utilities/model-discovery')>()),
	listModelsForProvider: (...args: unknown[]) => listModelsForProvider(...args) as unknown,
	listAzureOpenAiModels: (...args: unknown[]) => listAzureOpenAiModels(...args) as unknown,
}));

// Only the token mint is replaced; the real `isAzureEntraCredential` classifies
// the credential record, so the auth-path choice stays under test.
const createEntraTokenProvider = vi.fn();
vi.mock('@n8n/agents', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents')>()),
	createEntraTokenProvider: (...args: unknown[]) => createEntraTokenProvider(...args) as unknown,
}));

const additionalData = mock<IWorkflowExecuteAdditionalData>();
const getBaseMock = vi.fn<(...args: unknown[]) => Promise<IWorkflowExecuteAdditionalData>>();
vi.mock('@/workflow-execute-additional-data', () => ({
	getBase: async (...args: unknown[]) => await getBaseMock(...args),
}));

const user = mock<User>({ id: 'user-1' });
const projectId = 'project-1';

function makeService({ ssrfEnabled = false }: { ssrfEnabled?: boolean } = {}) {
	const credentialsService = mock<CredentialsService>();
	const credentialsHelper = mock<CredentialsHelper>();
	const transport = mock<HttpTransport>();
	transport.asCustomFetch.mockReturnValue(vi.fn() as unknown as CustomFetch);
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.transport.mockReturnValue(transport);
	const aiGatewayService = mock<AiGatewayService>();
	const ssrfProtectionService = mock<SsrfProtectionService>();
	// `enabled` must be an explicit boolean: the auto-mock would return a
	// truthy Mock function for the property.
	const ssrfProtectionConfig = mock<SsrfProtectionConfig>({
		enabled: ssrfEnabled,
	});

	const service = new BuilderModelLiveLookupService(
		credentialsService,
		credentialsHelper,
		outboundHttp,
		aiGatewayService,
		ssrfProtectionService,
		ssrfProtectionConfig,
	);
	return {
		service,
		credentialsService,
		credentialsHelper,
		aiGatewayService,
		ssrfProtectionService,
		ssrfProtectionConfig,
	};
}

function usable(id: string, type: string) {
	return [{ id, name: 'My Credential', type }] as Awaited<
		ReturnType<CredentialsService['getCredentialsAUserCanUseInAWorkflow']>
	>;
}

describe('BuilderModelLiveLookupService', () => {
	beforeEach(() => {
		listModelsForProvider.mockReset();
		listAzureOpenAiModels.mockReset();
		createEntraTokenProvider.mockReset();
		getBaseMock.mockReset();
		getBaseMock.mockResolvedValue(additionalData);
	});

	describe('lookup', () => {
		it('returns a deterministic catalog for an eval credential without using its secret', async () => {
			const { service, credentialsService, credentialsHelper, aiGatewayService } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'openAiApi'),
			);

			const result = await service.lookup(user, projectId, 'cred-1', 'openAiApi', 'openai', {
				useEvalModelCatalog: true,
			});

			expect(result).toEqual({
				status: 'success',
				policy: 'curated',
				models: [{ name: 'gpt-5.6-terra', value: 'gpt-5.6-terra' }],
			});
			expect(credentialsHelper.getDecrypted).not.toHaveBeenCalled();
			expect(getBaseMock).not.toHaveBeenCalled();
			expect(listModelsForProvider).not.toHaveBeenCalled();
			expect(aiGatewayService.getSyntheticCredential).not.toHaveBeenCalled();
		});

		it('returns a deterministic managed catalog in evaluations without calling the gateway', async () => {
			const { service, credentialsService, credentialsHelper, aiGatewayService } = makeService();

			const result = await service.lookup(
				user,
				projectId,
				AI_GATEWAY_MANAGED_TAG,
				'openAiApi',
				'openai',
				{ useEvalModelCatalog: true },
			);

			expect(result).toEqual({
				status: 'success',
				policy: 'managed',
				models: [{ name: 'gpt-5.6-terra', value: 'gpt-5.6-terra' }],
			});
			expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).not.toHaveBeenCalled();
			expect(credentialsHelper.getDecrypted).not.toHaveBeenCalled();
			expect(listModelsForProvider).not.toHaveBeenCalled();
			expect(aiGatewayService.getCredentialTypeForProvider).not.toHaveBeenCalled();
			expect(aiGatewayService.getSyntheticCredential).not.toHaveBeenCalled();
		});

		it('uses a deterministic fallback when the credential default belongs to another provider', async () => {
			const { service, credentialsService, credentialsHelper } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'anthropicApi'),
			);

			const result = await service.lookup(user, projectId, 'cred-1', 'anthropicApi', 'openai', {
				useEvalModelCatalog: true,
			});

			expect(result).toEqual({
				status: 'success',
				policy: 'curated',
				models: [{ name: 'eval-openai-model', value: 'eval-openai-model' }],
			});
			expect(credentialsHelper.getDecrypted).not.toHaveBeenCalled();
			expect(listModelsForProvider).not.toHaveBeenCalled();
		});

		it('returns endpoint-only models and forwards OpenAI credential request options', async () => {
			const { service, credentialsService, credentialsHelper } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'openAiApi'),
			);
			credentialsHelper.getDecrypted.mockResolvedValue({
				apiKey: 'sk-key',
				url: 'https://openai-compatible.example/v1',
				organizationId: 'org-123',
				header: true,
				headerName: 'authorization',
				headerValue: 'Bearer custom-token',
			});
			listModelsForProvider.mockResolvedValue([{ id: 'custom-model', name: 'Custom model' }]);

			const result = await service.lookup(user, projectId, 'cred-1', 'openAiApi', 'openai');

			expect(result).toEqual({
				status: 'success',
				policy: 'endpoint-only',
				models: [{ name: 'Custom model', value: 'custom-model' }],
			});
			expect(listModelsForProvider).toHaveBeenCalledWith(
				'openai',
				expect.objectContaining({
					apiKey: 'sk-key',
					baseURL: 'https://openai-compatible.example/v1',
					headers: {
						Authorization: 'Bearer custom-token',
						'OpenAI-Organization': 'org-123',
					},
				}),
			);
		});

		it('lets a custom OpenAI organization header override the credential organization', async () => {
			const { service, credentialsService, credentialsHelper } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'openAiApi'),
			);
			credentialsHelper.getDecrypted.mockResolvedValue({
				apiKey: 'sk-key',
				url: 'https://openai-compatible.example/v1',
				organizationId: 'org-default',
				header: true,
				headerName: 'openai-organization',
				headerValue: 'org-custom',
			});
			listModelsForProvider.mockResolvedValue([{ id: 'custom-model', name: 'Custom model' }]);

			await service.lookup(user, projectId, 'cred-1', 'openAiApi', 'openai');

			expect(listModelsForProvider).toHaveBeenCalledWith(
				'openai',
				expect.objectContaining({
					headers: { 'OpenAI-Organization': 'org-custom' },
				}),
			);
		});

		it('returns curated models for the official OpenAI endpoint', async () => {
			const { service, credentialsService, credentialsHelper } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'openAiApi'),
			);
			credentialsHelper.getDecrypted.mockResolvedValue({
				apiKey: 'sk-key',
				url: 'https://api.openai.com/v1',
			});
			listModelsForProvider.mockResolvedValue([{ id: 'gpt-5', name: 'GPT-5' }]);

			const result = await service.lookup(user, projectId, 'cred-1', 'openAiApi', 'openai');

			expect(result).toEqual({
				status: 'success',
				policy: 'curated',
				models: [{ name: 'GPT-5', value: 'gpt-5' }],
			});
		});

		it('preserves endpoint-only policy when custom OpenAI discovery fails', async () => {
			const { service, credentialsService, credentialsHelper } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'openAiApi'),
			);
			credentialsHelper.getDecrypted.mockResolvedValue({
				apiKey: 'sk-key',
				url: 'https://openai-compatible.example/v1',
			});
			const error = new Error('Model listing failed');
			listModelsForProvider.mockRejectedValue(error);

			const result = await service.lookup(user, projectId, 'cred-1', 'openAiApi', 'openai');

			expect(result).toEqual({ status: 'unavailable', policy: 'endpoint-only', error });
		});

		it('preserves endpoint-only policy when custom OpenAI discovery is empty', async () => {
			const { service, credentialsService, credentialsHelper } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'openAiApi'),
			);
			credentialsHelper.getDecrypted.mockResolvedValue({
				apiKey: 'sk-key',
				url: 'https://openai-compatible.example/v1',
			});
			listModelsForProvider.mockResolvedValue([]);

			const result = await service.lookup(user, projectId, 'cred-1', 'openAiApi', 'openai');

			expect(result).toEqual({
				status: 'unavailable',
				policy: 'endpoint-only',
				error: expect.objectContaining({ message: 'Provider openai returned no models' }),
			});
		});

		it('returns managed policy for the n8n Connect managed tag', async () => {
			const { service, aiGatewayService } = makeService();
			aiGatewayService.getCredentialTypeForProvider.mockResolvedValue('openAiApi');
			aiGatewayService.getSyntheticCredential.mockResolvedValue({
				apiKey: 'gateway-jwt',
				url: 'https://gw.example/v1/gateway/openai/v1',
			});
			listModelsForProvider.mockResolvedValue([{ id: 'gpt-5-mini', name: 'GPT-5 mini' }]);

			const result = await service.lookup(
				user,
				projectId,
				AI_GATEWAY_MANAGED_TAG,
				'openAiApi',
				'openai',
			);

			expect(result).toEqual({
				status: 'success',
				policy: 'managed',
				models: [{ name: 'GPT-5 mini', value: 'gpt-5-mini' }],
			});
		});

		it('passes a priority from Gateway credits discovery on to the model choice', async () => {
			const { service, aiGatewayService } = makeService();
			aiGatewayService.getCredentialTypeForProvider.mockResolvedValue('googlePalmApi');
			aiGatewayService.getSyntheticCredential.mockResolvedValue({
				apiKey: 'gateway-jwt',
				host: 'https://gw.example/v1/gateway/google',
			});
			listModelsForProvider.mockResolvedValue([
				{ id: 'models/gemini-featured', name: 'Gemini Featured', priority: 10 },
				{ id: 'models/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
			]);

			const result = await service.lookup(
				user,
				projectId,
				AI_GATEWAY_MANAGED_TAG,
				'googlePalmApi',
				'google',
			);

			expect(result).toEqual({
				status: 'success',
				policy: 'managed',
				models: [
					{ name: 'Gemini Featured', value: 'models/gemini-featured', priority: 10 },
					{ name: 'Gemini 2.5 Pro', value: 'models/gemini-2.5-pro' },
				],
			});
		});

		it('keeps list compatible with successful and unavailable lookups', async () => {
			const { service } = makeService();
			const models = [{ name: 'GPT-5', value: 'gpt-5' }];
			const error = new Error('Model listing failed');
			const lookup = vi
				.spyOn(service, 'lookup')
				.mockResolvedValueOnce({ status: 'success', policy: 'curated', models })
				.mockResolvedValueOnce({ status: 'unavailable', policy: 'curated', error });

			await expect(service.list(user, projectId, 'cred-1', 'openAiApi', 'openai')).resolves.toBe(
				models,
			);
			await expect(service.list(user, projectId, 'cred-1', 'openAiApi', 'openai')).rejects.toBe(
				error,
			);
			expect(lookup).toHaveBeenCalledTimes(2);
		});
	});

	describe('azure-openai Foundry deployments', () => {
		it('lists a Foundry project deployments with the api-key header', async () => {
			const { service, credentialsService, credentialsHelper } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'azureOpenAiApi'),
			);
			credentialsHelper.getDecrypted.mockResolvedValue({
				endpointType: 'foundry',
				foundryEndpoint: 'https://res.services.ai.azure.com/openai/v1',
				project: 'my-project',
				apiKey: 'az-key',
			});
			listAzureOpenAiModels.mockResolvedValue([
				{ id: 'my-chat', name: 'my-chat (gpt-4.1)' },
				{ id: 'my-other', name: 'my-other (gpt-4.1-mini)' },
			]);

			const result = await service.lookup(
				user,
				projectId,
				'cred-1',
				'azureOpenAiApi',
				'azure-openai',
			);

			expect(result).toEqual({
				status: 'success',
				policy: 'endpoint-only',
				models: [
					{ name: 'my-chat (gpt-4.1)', value: 'my-chat' },
					{ name: 'my-other (gpt-4.1-mini)', value: 'my-other' },
				],
			});
			// The list call takes the origin of the Foundry endpoint, not its path.
			expect(listAzureOpenAiModels).toHaveBeenCalledWith({
				baseURL: 'https://res.services.ai.azure.com',
				project: 'my-project',
				headers: { 'api-key': 'az-key' },
				fetch: expect.any(Function),
			});
			expect(listModelsForProvider).not.toHaveBeenCalled();
		});

		it('accepts the Entra ID credential type and mints a Foundry-audience token', async () => {
			const { service, credentialsService, credentialsHelper, ssrfProtectionService } = makeService(
				{ ssrfEnabled: true },
			);
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'azureEntraCognitiveServicesOAuth2Api'),
			);
			credentialsHelper.getDecrypted.mockResolvedValue({
				endpointType: 'foundry',
				foundryEndpoint: 'https://res.services.ai.azure.com/openai/v1',
				project: 'my-project',
				clientId: 'client-id',
				clientSecret: 'client-secret',
				accessTokenUrl: 'https://login.example/token',
				tenantId: '8f2a1b3c-4d5e-6f70-8192-a3b4c5d6e7f8',
				oauthTokenData: { access_token: 'stored-token' },
			});
			createEntraTokenProvider.mockReturnValue(async () => 'minted-token');
			listAzureOpenAiModels.mockResolvedValue([{ id: 'my-chat', name: 'my-chat (gpt-4.1)' }]);

			// The catalog service passes the first registered credential type; the
			// Entra type must be accepted for the same provider.
			const result = await service.lookup(
				user,
				projectId,
				'cred-1',
				'azureOpenAiApi',
				'azure-openai',
			);

			expect(result).toEqual({
				status: 'success',
				policy: 'endpoint-only',
				models: [{ name: 'my-chat (gpt-4.1)', value: 'my-chat' }],
			});
			// The deployments list needs the Foundry audience, not the inference
			// audience, and the token mint runs through the instance's SSRF policy.
			expect(createEntraTokenProvider).toHaveBeenCalledWith(
				expect.objectContaining({
					oauthClientId: 'client-id',
					oauthTenantId: '8f2a1b3c-4d5e-6f70-8192-a3b4c5d6e7f8',
				}),
				'https://ai.azure.com',
				ssrfProtectionService,
			);
			expect(listAzureOpenAiModels).toHaveBeenCalledWith(
				expect.objectContaining({ headers: { Authorization: 'Bearer minted-token' } }),
			);
		});

		it('omits the ssrfBridge when the SSRF guard is disabled', async () => {
			const { service, credentialsService, credentialsHelper, ssrfProtectionService } =
				makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'azureOpenAiApi'),
			);
			credentialsHelper.getDecrypted.mockResolvedValue({
				endpointType: 'foundry',
				foundryEndpoint: 'https://res.services.ai.azure.com/openai/v1',
				project: 'my-project',
				clientId: 'client-id',
				accessTokenUrl: 'https://login.example/token',
				tenantId: '8f2a1b3c-4d5e-6f70-8192-a3b4c5d6e7f8',
				oauthTokenData: { access_token: 'stored-token' },
			});
			createEntraTokenProvider.mockReturnValue(async () => 'minted-token');
			listAzureOpenAiModels.mockResolvedValue([{ id: 'my-chat', name: 'my-chat (gpt-4.1)' }]);

			await service.lookup(user, projectId, 'cred-1', 'azureOpenAiApi', 'azure-openai');

			const [mappedCreds, audience, ssrfBridge] = createEntraTokenProvider.mock.calls[0];
			expect(mappedCreds).toEqual(expect.objectContaining({ oauthClientId: 'client-id' }));
			expect(audience).toBe('https://ai.azure.com');
			// No bridge when the SSRF guard is disabled for the instance.
			expect(ssrfBridge).toBeUndefined();
			expect(ssrfProtectionService.validateUrl).not.toHaveBeenCalled();
		});

		it('throws a UserError when the credential has no project set', async () => {
			const { service, credentialsService, credentialsHelper } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'azureOpenAiApi'),
			);
			credentialsHelper.getDecrypted.mockResolvedValue({
				endpointType: 'foundry',
				foundryEndpoint: 'https://res.services.ai.azure.com/openai/v1',
				apiKey: 'az-key',
			});

			const error = await service
				.lookup(user, projectId, 'cred-1', 'azureOpenAiApi', 'azure-openai')
				.catch((e: unknown) => e);
			expect(error).toBeInstanceOf(UserError);
			expect((error as Error).message).toBe('The credential has no Microsoft Foundry project set');
			expect(listAzureOpenAiModels).not.toHaveBeenCalled();
		});

		it('throws for a classic (non-Foundry) credential', async () => {
			const { service, credentialsService, credentialsHelper } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'azureOpenAiApi'),
			);
			credentialsHelper.getDecrypted.mockResolvedValue({
				endpointType: 'classic',
				resourceName: 'my-resource',
				apiVersion: '2025-03-01-preview',
				apiKey: 'az-key',
			});

			await expect(
				service.lookup(user, projectId, 'cred-1', 'azureOpenAiApi', 'azure-openai'),
			).rejects.toThrow('Only a Microsoft Foundry credential');
			expect(listAzureOpenAiModels).not.toHaveBeenCalled();
		});

		it('rejects a credential type the provider does not serve', async () => {
			const { service, credentialsService } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'openAiApi'),
			);

			await expect(
				service.lookup(user, projectId, 'cred-1', 'azureOpenAiApi', 'azure-openai'),
			).rejects.toThrow('not found or not accessible');
			expect(listAzureOpenAiModels).not.toHaveBeenCalled();
		});

		it('preserves endpoint-only policy when the deployments list fails', async () => {
			const { service, credentialsService, credentialsHelper } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'azureOpenAiApi'),
			);
			credentialsHelper.getDecrypted.mockResolvedValue({
				endpointType: 'foundry',
				foundryEndpoint: 'https://res.services.ai.azure.com/openai/v1',
				project: 'missing-project',
				apiKey: 'az-key',
			});
			const error = new Error('Project "missing-project" was not found');
			listAzureOpenAiModels.mockRejectedValue(error);

			const result = await service.lookup(
				user,
				projectId,
				'cred-1',
				'azureOpenAiApi',
				'azure-openai',
			);

			expect(result).toEqual({ status: 'unavailable', policy: 'endpoint-only', error });
		});

		it('preserves endpoint-only policy when the project lists no deployments', async () => {
			const { service, credentialsService, credentialsHelper } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				usable('cred-1', 'azureOpenAiApi'),
			);
			credentialsHelper.getDecrypted.mockResolvedValue({
				endpointType: 'foundry',
				foundryEndpoint: 'https://res.services.ai.azure.com/openai/v1',
				project: 'my-project',
				apiKey: 'az-key',
			});
			listAzureOpenAiModels.mockResolvedValue([]);

			const result = await service.lookup(
				user,
				projectId,
				'cred-1',
				'azureOpenAiApi',
				'azure-openai',
			);

			expect(result).toEqual({
				status: 'unavailable',
				policy: 'endpoint-only',
				error: expect.objectContaining({ message: 'The Azure project returned no deployments' }),
			});
		});
	});

	it('lists models for a credential the user can use in the project', async () => {
		const { service, credentialsService, credentialsHelper } = makeService();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
			usable('cred-1', 'anthropicApi'),
		);
		credentialsHelper.getDecrypted.mockResolvedValue({
			apiKey: 'sk-key',
			url: 'https://proxy.local',
		});
		listModelsForProvider.mockResolvedValue([
			{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
		]);

		const result = await service.list(user, projectId, 'cred-1', 'anthropicApi', 'anthropic');

		expect(result).toEqual([{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' }]);
		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(user, {
			projectId,
			excludePersonalRoute: true,
		});
		// Credential fields are mapped for the provider (anthropic: apiKey + url→baseURL).
		expect(listModelsForProvider).toHaveBeenCalledWith(
			'anthropic',
			expect.objectContaining({ apiKey: 'sk-key', baseURL: 'https://proxy.local' }),
		);
	});

	it('resolves credential defaults and expressions instead of reading raw stored data', async () => {
		const { service, credentialsService, credentialsHelper } = makeService();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
			usable('cred-1', 'anthropicApi'),
		);
		credentialsHelper.getDecrypted.mockResolvedValue({
			apiKey: 'sk-key',
			url: 'https://api.region.example/v1',
		});
		listModelsForProvider.mockResolvedValue([
			{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
		]);

		await service.list(user, projectId, 'cred-1', 'anthropicApi', 'anthropic');

		expect(getBaseMock).toHaveBeenCalledWith({ userId: 'user-1', projectId });
		expect(credentialsHelper.getDecrypted).toHaveBeenCalledWith(
			additionalData,
			{ id: 'cred-1', name: 'My Credential' },
			'anthropicApi',
			'internal',
		);
		expect(credentialsService.decrypt).not.toHaveBeenCalled();
		expect(listModelsForProvider).toHaveBeenCalledWith(
			'anthropic',
			expect.objectContaining({ baseURL: 'https://api.region.example/v1' }),
		);
	});

	it('treats an empty provider response as a failed lookup', async () => {
		const { service, credentialsService, credentialsHelper } = makeService();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
			usable('cred-1', 'anthropicApi'),
		);
		credentialsHelper.getDecrypted.mockResolvedValue({ apiKey: 'sk-key' });
		// An empty list from a chat provider is far more likely a broken request
		// or drifted response shape than a real zero-model account — callers must
		// fall back rather than prune everything.
		listModelsForProvider.mockResolvedValue([]);

		await expect(
			service.list(user, projectId, 'cred-1', 'anthropicApi', 'anthropic'),
		).rejects.toThrow('returned no models');
	});

	it('rejects a credential that is not available in the project', async () => {
		const { service, credentialsService } = makeService();
		// The user can read this credential, but it is not in the project's set.
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);

		await expect(
			service.list(user, projectId, 'cred-other-project', 'anthropicApi', 'anthropic'),
		).rejects.toThrow('not found or not accessible');
		expect(listModelsForProvider).not.toHaveBeenCalled();
	});

	it('rejects a credential whose type does not match the provider', async () => {
		const { service, credentialsService } = makeService();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
			usable('cred-1', 'openAiApi'),
		);

		await expect(
			service.list(user, projectId, 'cred-1', 'anthropicApi', 'anthropic'),
		).rejects.toThrow('not found or not accessible');
		expect(listModelsForProvider).not.toHaveBeenCalled();
	});

	describe('list with the n8n Connect managed tag', () => {
		it('resolves the synthetic gateway credential and lists its allowlisted models', async () => {
			const { service, aiGatewayService, credentialsService, credentialsHelper } = makeService();
			aiGatewayService.getCredentialTypeForProvider.mockResolvedValue('openAiApi');
			aiGatewayService.getSyntheticCredential.mockResolvedValue({
				apiKey: 'gateway-jwt',
				url: 'https://gw.example/v1/gateway/openai/v1',
			});
			listModelsForProvider.mockResolvedValue([{ id: 'gpt-5-mini', name: 'GPT-5 mini' }]);

			const result = await service.list(
				user,
				projectId,
				AI_GATEWAY_MANAGED_TAG,
				'openAiApi',
				'openai',
			);

			expect(result).toEqual([{ name: 'GPT-5 mini', value: 'gpt-5-mini' }]);
			expect(aiGatewayService.getSyntheticCredential).toHaveBeenCalledWith({
				credentialType: 'openAiApi',
				userId: 'user-1',
				projectId,
			});
			// No stored-credential lookup or decryption for the managed tag.
			expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).not.toHaveBeenCalled();
			expect(credentialsHelper.getDecrypted).not.toHaveBeenCalled();
			// Discovery hits the gateway baseURL → the gateway returns only allowlisted models.
			expect(listModelsForProvider).toHaveBeenCalledWith(
				'openai',
				expect.objectContaining({
					apiKey: 'gateway-jwt',
					baseURL: 'https://gw.example/v1/gateway/openai/v1',
				}),
			);
		});

		it('throws when the gateway does not serve the provider', async () => {
			const { service, aiGatewayService } = makeService();
			aiGatewayService.getCredentialTypeForProvider.mockResolvedValue(undefined);

			await expect(
				service.list(user, projectId, AI_GATEWAY_MANAGED_TAG, 'xAiApi', 'xai'),
			).rejects.toThrow('do not support');
			expect(aiGatewayService.getSyntheticCredential).not.toHaveBeenCalled();
			expect(listModelsForProvider).not.toHaveBeenCalled();
		});
	});
});
