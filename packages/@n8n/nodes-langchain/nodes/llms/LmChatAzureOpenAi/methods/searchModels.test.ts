import * as modelDiscovery from '@n8n/ai-utilities/model-discovery';
import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { searchModels } from './searchModels';
import { AuthenticationType, AZURE_AI_FOUNDRY_AUDIENCE } from '../types';

const n8nOAuth2TokenCredentialSpy = vi.fn();
const getTokenSpy = vi.fn().mockResolvedValue({
	token: 'entra-token',
	expiresOnTimestamp: 1234567890,
});

vi.mock('../credentials/N8nOAuth2TokenCredential', () => ({
	N8nOAuth2TokenCredential: class N8nOAuth2TokenCredentialMock {
		constructor(...args: unknown[]) {
			n8nOAuth2TokenCredentialSpy(...args);
		}

		getToken = getTokenSpy;
	},
}));

const mockNode: INode = {
	id: '1',
	name: 'Mock node',
	typeVersion: 1,
	type: 'n8n-nodes-langchain.lmChatAzureOpenAi',
	position: [0, 0],
	parameters: {},
};

const mockModels = [{ id: 'my-gpt4', name: 'my-gpt4-display' }];

describe('LmChatAzureOpenAi -> searchModels', () => {
	let ctx: ILoadOptionsFunctions;
	let listAzureOpenAiModelsSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		ctx = mock<ILoadOptionsFunctions>();
		ctx.getNode = vi.fn().mockReturnValue(mockNode);
		ctx.helpers.getSecureEgressFilter = vi.fn().mockReturnValue(vi.fn());
		listAzureOpenAiModelsSpy = vi
			.spyOn(modelDiscovery, 'listAzureOpenAiModels')
			.mockResolvedValue(mockModels);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('rejects a classic api-key credential with a clear error (no data-plane deployments API)', async () => {
		ctx.getNodeParameter = vi
			.fn()
			.mockReturnValueOnce(AuthenticationType.ApiKey)
			.mockReturnValueOnce('');
		ctx.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'secret-key',
			resourceName: 'my-resource',
		});

		await expect(searchModels.call(ctx)).rejects.toThrow(
			'Only an Azure AI Foundry credential can list deployments',
		);

		expect(listAzureOpenAiModelsSpy).not.toHaveBeenCalled();
	});

	it('rejects a classic Entra ID credential with a clear error', async () => {
		ctx.getNodeParameter = vi
			.fn()
			.mockReturnValueOnce(AuthenticationType.EntraOAuth2)
			.mockReturnValueOnce('');
		ctx.getCredentials = vi.fn().mockResolvedValue({ resourceName: 'my-resource' });

		await expect(searchModels.call(ctx)).rejects.toThrow(
			'Only an Azure AI Foundry credential can list deployments',
		);

		expect(listAzureOpenAiModelsSpy).not.toHaveBeenCalled();
		expect(n8nOAuth2TokenCredentialSpy).not.toHaveBeenCalled();
	});

	it('derives the base URL from the Foundry endpoint origin for an api-key credential', async () => {
		ctx.getNodeParameter = vi
			.fn()
			.mockReturnValueOnce(AuthenticationType.ApiKey)
			.mockReturnValueOnce('my-project');
		ctx.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'secret-key',
			endpointType: 'foundry',
			foundryEndpoint: 'https://my-resource.services.ai.azure.com/openai/v1',
		});

		await searchModels.call(ctx);

		expect(listAzureOpenAiModelsSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				baseURL: 'https://my-resource.services.ai.azure.com',
				project: 'my-project',
				headers: { 'api-key': 'secret-key' },
			}),
		);
	});

	it('mints a bearer token for a Foundry credential with Entra ID authentication', async () => {
		ctx.getNodeParameter = vi
			.fn()
			.mockReturnValueOnce(AuthenticationType.EntraOAuth2)
			.mockReturnValueOnce('my-project');
		ctx.getCredentials = vi.fn().mockResolvedValue({
			endpointType: 'foundry',
			foundryEndpoint: 'https://my-resource.services.ai.azure.com/openai/v1',
		});

		await searchModels.call(ctx);

		expect(listAzureOpenAiModelsSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				baseURL: 'https://my-resource.services.ai.azure.com',
				headers: { Authorization: 'Bearer entra-token' },
			}),
		);
		// The egress filter reaches the token mint, not just the model-list fetch.
		expect(n8nOAuth2TokenCredentialSpy).toHaveBeenCalledWith(
			mockNode,
			expect.anything(),
			AZURE_AI_FOUNDRY_AUDIENCE,
			ctx.helpers.getSecureEgressFilter(),
		);
	});

	it('throws when the Entra token cannot be retrieved', async () => {
		getTokenSpy.mockResolvedValueOnce(null);
		ctx.getNodeParameter = vi
			.fn()
			.mockReturnValueOnce(AuthenticationType.EntraOAuth2)
			.mockReturnValueOnce('my-project');
		ctx.getCredentials = vi.fn().mockResolvedValue({
			endpointType: 'foundry',
			foundryEndpoint: 'https://my-resource.services.ai.azure.com/openai/v1',
		});

		await expect(searchModels.call(ctx)).rejects.toThrow('Failed to retrieve access token');
	});

	it('filters results by the search term', async () => {
		listAzureOpenAiModelsSpy.mockResolvedValue([
			{ id: 'my-gpt4', name: 'my-gpt4-display' },
			{ id: 'other-deployment', name: 'other-deployment-display' },
		]);
		ctx.getNodeParameter = vi
			.fn()
			.mockReturnValueOnce(AuthenticationType.ApiKey)
			.mockReturnValueOnce('my-project');
		ctx.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'key',
			endpointType: 'foundry',
			foundryEndpoint: 'https://my-resource.services.ai.azure.com/openai/v1',
		});

		const result = await searchModels.call(ctx, 'gpt4');

		expect(result).toEqual({ results: [{ name: 'my-gpt4-display', value: 'my-gpt4' }] });
	});
});
