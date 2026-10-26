import type { CredentialProvider, ResolvedCredential } from '@n8n/agents';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { SsrfProtectionService } from '@n8n/backend-network';
import { SsrfProtectionConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { resolveCredentialAwareModelConfig } from '../model-config';
import type { AiGatewayModelCredentialResolver } from '../../agent-credential-provider.contracts';
import { AzureFoundryDeploymentsService } from '../../azure-foundry-deployments.service';

const { getCachedCatalog } = vi.hoisted(() => ({ getCachedCatalog: vi.fn() }));
vi.mock('@n8n/agents/catalog', () => ({ getCachedCatalog }));

describe('resolveCredentialAwareModelConfig', () => {
	it.each([
		{
			model: 'google-vertex/gemini-2.5-pro',
			sdk: '@ai-sdk/google-vertex',
			project: undefined,
			projectId: 'custom-project',
			expectedProject: 'custom-project',
		},
		{
			model: 'google-vertex/claude-opus-5@default',
			sdk: '@ai-sdk/google-vertex/anthropic',
			project: '__custom__',
			projectId: 'custom-project',
			expectedProject: 'custom-project',
		},
		{
			model: 'google-vertex/mistral-medium-3',
			sdk: '@ai-sdk/mistral',
			project: 'listed-project',
			projectId: 'old-custom-project',
			expectedProject: 'listed-project',
		},
		{
			model: 'google-vertex/xai/grok-4.20-reasoning',
			sdk: '@ai-sdk/openai-compatible',
			project: 'listed-project',
			projectId: undefined,
			expectedProject: 'listed-project',
		},
		{
			model: 'google-vertex/gemini-flash-latest',
			sdk: undefined,
			project: 'listed-project',
			projectId: undefined,
			expectedProject: 'listed-project',
		},
	])(
		'uses the catalog SDK and Vertex credential for $model',
		async ({ model, sdk, project, projectId, expectedProject }) => {
			getCachedCatalog.mockResolvedValue(
				sdk
					? {
							'google-vertex': {
								models: { [model.slice('google-vertex/'.length)]: { sdk } },
							},
						}
					: undefined,
			);
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.list.mockResolvedValue([
				{ id: 'vertex', name: 'Vertex', type: 'googleVertexAiApi' },
			]);
			credentialProvider.resolve.mockResolvedValue({
				email: 'agent@example.iam.gserviceaccount.com',
				privateKey: 'private-key',
				region: 'europe-west4',
				project,
				projectId,
			});
			await expect(
				resolveCredentialAwareModelConfig(model, 'vertex', credentialProvider),
			).resolves.toEqual({
				id: model,
				project: expectedProject,
				location: 'europe-west4',
				clientEmail: 'agent@example.iam.gserviceaccount.com',
				privateKey: 'private-key',
				usageCredential: { id: 'vertex' },
				...(sdk !== undefined && { sdk }),
			});
		},
	);

	it.each(['googleApi', 'googlePalmApi'])(
		'rejects an incompatible Vertex credential: %s',
		async (type) => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.list.mockResolvedValue([{ id: 'gcp', name: 'GCP', type }]);
			await expect(
				resolveCredentialAwareModelConfig(
					'google-vertex/gemini-2.5-pro',
					'gcp',
					credentialProvider,
				),
			).rejects.toThrow('Google Vertex AI credential');
			expect(credentialProvider.resolve).not.toHaveBeenCalled();
		},
	);

	// AGENT-1182: the credential URL serves a different API from the native gateway SDK.
	it.each(['https://ai-gateway.vercel.sh/v1', 'https://ai-gateway.vercel.sh/v1/'])(
		'uses the native Vercel SDK endpoint for the standard credential URL %s',
		async (url) => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({ apiKey: 'gateway-key', url });

			const result = await resolveCredentialAwareModelConfig(
				'vercel/anthropic/claude-sonnet-5.5',
				'cred-vercel',
				credentialProvider,
			);

			expect(result).toEqual({
				id: 'vercel/anthropic/claude-sonnet-5.5',
				apiKey: 'gateway-key',
				usageCredential: { id: 'cred-vercel' },
			});
		},
	);

	it('resolves a real credential via the credential provider (unchanged path)', async () => {
		const credentialProvider = mock<CredentialProvider>();
		credentialProvider.resolve.mockResolvedValue({
			apiKey: 'real-key',
			url: 'https://api.openai.com',
		} as ResolvedCredential);

		const result = await resolveCredentialAwareModelConfig(
			'openai/gpt-5',
			'cred-123',
			credentialProvider,
		);

		expect(credentialProvider.resolve).toHaveBeenCalledWith('cred-123');
		expect(result).toEqual({
			id: 'openai/gpt-5',
			apiKey: 'real-key',
			baseURL: 'https://api.openai.com',
			usageCredential: { id: 'cred-123' },
		});
	});

	describe('azure-openai', () => {
		const foundryDeployments = mock<AzureFoundryDeploymentsService>();
		beforeEach(() => {
			Container.set(AzureFoundryDeploymentsService, foundryDeployments);
			foundryDeployments.findUnderlyingModel.mockReset();
		});

		const foundryCredential = {
			endpointType: 'foundry',
			foundryEndpoint: 'https://my-resource.services.ai.azure.com/openai/v1',
			apiKey: 'az-key',
			project: 'my-project',
		};

		it('adds the catalog id of the model a Foundry deployment serves', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue(foundryCredential);
			foundryDeployments.findUnderlyingModel.mockResolvedValue('gpt-4.1');

			const result = await resolveCredentialAwareModelConfig(
				'azure-openai/my-chat',
				'cred-1',
				credentialProvider,
			);

			expect(foundryDeployments.findUnderlyingModel).toHaveBeenCalledWith(
				'cred-1',
				foundryCredential,
				'my-chat',
			);
			expect(result).toMatchObject({
				id: 'azure-openai/my-chat',
				catalogModelId: 'azure-openai/gpt-4.1',
			});
		});

		it('leaves the catalog id out when the served model is unknown', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue(foundryCredential);
			foundryDeployments.findUnderlyingModel.mockResolvedValue(undefined);

			const result = await resolveCredentialAwareModelConfig(
				'azure-openai/my-chat',
				'cred-1',
				credentialProvider,
			);

			expect(result).not.toHaveProperty('catalogModelId');
		});

		it('does not look up deployments for a classic credential', async () => {
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue({
				endpointType: 'classic',
				resourceName: 'my-resource',
				apiKey: 'az-key',
			});

			await resolveCredentialAwareModelConfig('azure-openai/gpt-4o', 'cred-1', credentialProvider);

			expect(foundryDeployments.findUnderlyingModel).not.toHaveBeenCalled();
		});
	});

	it('resolves the managed tag through the provider gateway resolver, keyed by provider prefix', async () => {
		const credentialProvider = mock<CredentialProvider & AiGatewayModelCredentialResolver>();
		credentialProvider.resolveAiGatewayModelCredential.mockResolvedValue({
			apiKey: 'gateway-jwt',
			url: 'https://gw.example/v1/gateway/openai/v1',
		} as ResolvedCredential);

		const result = await resolveCredentialAwareModelConfig(
			'openai/gpt-5',
			AI_GATEWAY_MANAGED_TAG,
			credentialProvider,
		);

		expect(credentialProvider.resolveAiGatewayModelCredential).toHaveBeenCalledWith('openai');
		expect(credentialProvider.resolve).not.toHaveBeenCalled();
		expect(result).toEqual({
			id: 'openai/gpt-5',
			apiKey: 'gateway-jwt',
			baseURL: 'https://gw.example/v1/gateway/openai/v1',
			usageCredential: { managedBy: 'aiGateway' },
			// The gateway serves OpenAI's Responses API; without this the model
			// factory infers /chat/completions from the baseURL.
			apiStyle: 'responses',
		});
	});

	it('throws for the managed tag when the provider cannot mint gateway credentials', async () => {
		// Resolving the tag as an ordinary credential id would surface as a confusing
		// "credential not found" instead of naming the real problem.
		const resolve = vi.fn();
		const credentialProvider = { resolve } as unknown as CredentialProvider;

		await expect(
			resolveCredentialAwareModelConfig('openai/gpt-5', AI_GATEWAY_MANAGED_TAG, credentialProvider),
		).rejects.toThrow('cannot resolve Gateway credits');
		expect(resolve).not.toHaveBeenCalled();
	});
	describe('Azure OpenAI outbound policy', () => {
		const ssrfProtectionService = mock<SsrfProtectionService>();
		const entraCredential = {
			endpointType: 'foundry',
			foundryEndpoint: 'https://my-resource.services.ai.azure.com/openai/v1',
			clientId: 'client-id',
			accessTokenUrl: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/token',
			oauthTokenData: { access_token: 'stored-token' },
		};
		const apiKeyCredential = {
			endpointType: 'foundry',
			foundryEndpoint: 'https://my-resource.services.ai.azure.com/openai/v1',
			apiKey: 'az-key',
		};

		beforeEach(() => {
			Container.set(SsrfProtectionService, ssrfProtectionService);
		});

		afterEach(() => {
			Container.reset();
		});

		async function resolveAzure(credential: ResolvedCredential, enabled: boolean) {
			Container.set(SsrfProtectionConfig, mock<SsrfProtectionConfig>({ enabled }));
			const credentialProvider = mock<CredentialProvider>();
			credentialProvider.resolve.mockResolvedValue(credential);
			return await resolveCredentialAwareModelConfig(
				'azure-openai/gpt-4o',
				'cred-azure',
				credentialProvider,
			);
		}

		it('adds the SSRF bridge to an Entra ID credential when protection is enabled', async () => {
			const result = await resolveAzure(entraCredential, true);

			expect(result).toMatchObject({ ssrfBridge: ssrfProtectionService });
		});

		it.each([
			{
				name: 'an Entra ID credential with protection disabled',
				credential: entraCredential,
				enabled: false,
			},
			{ name: 'an API key credential', credential: apiKeyCredential, enabled: true },
		])('leaves the SSRF bridge out for $name', async ({ credential, enabled }) => {
			const result = await resolveAzure(credential, enabled);

			expect(result).not.toHaveProperty('ssrfBridge');
		});
	});
});
