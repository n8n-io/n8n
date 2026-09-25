import { AzureChatOpenAI } from '@langchain/openai';
import { getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import { NodeHelpers, type INode, type ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatAzureOpenAi } from '../LmChatAzureOpenAi.node';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');

const mockNode: INode = {
	id: '1',
	name: 'Azure OpenAI Chat Model',
	typeVersion: 1,
	type: '@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
	position: [0, 0],
	parameters: {},
};

const apiKeyCredential = {
	apiKey: 'test-key',
	resourceName: 'my-resource',
	apiVersion: '2024-08-01-preview',
};

const entraCredential = {
	resourceName: 'my-resource',
	apiVersion: '2024-08-01-preview',
	oauthTokenData: { access_token: 'test-token' },
};

const setupMockContext = (authentication: string, credential: object) => {
	const ctx = createMockExecuteFunction<ISupplyDataFunctions>({}, mockNode);
	ctx.getCredentials = vi.fn().mockResolvedValue(credential);
	ctx.getNode = vi.fn().mockReturnValue(mockNode);
	ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
		if (paramName === 'authentication') return authentication;
		if (paramName === 'model') return 'gpt-4o';
		if (paramName === 'options') return {};
		return undefined;
	});
	ctx.logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
	return ctx;
};

describe('LmChatAzureOpenAi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each([
		[
			'API key with custom endpoint',
			'azureOpenAiApi',
			{ ...apiKeyCredential, endpoint: 'https://custom.openai.azure.com' },
			'https://custom.openai.azure.com',
		],
		[
			'API key without endpoint',
			'azureOpenAiApi',
			apiKeyCredential,
			'https://my-resource.openai.azure.com',
		],
		[
			'Entra ID without endpoint',
			'azureEntraCognitiveServicesOAuth2Api',
			entraCredential,
			'https://my-resource.openai.azure.com',
		],
	])(
		'resolves the proxy against the Azure host it dials (%s)',
		async (_, authentication, credential, expectedUrl) => {
			const ctx = setupMockContext(authentication, credential);

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(vi.mocked(getProxyAgent)).toHaveBeenCalledWith(
				expectedUrl,
				expect.any(Object),
				expect.any(Object),
			);
		},
	);

	// LangChain reads AZURE_OPENAI_ENDPOINT when the field is undefined. The proxy is resolved
	// from the node's own value, so letting the env win would send the request to one host with
	// the egress decision made for another.
	it('should ignore AZURE_OPENAI_ENDPOINT so the client and the proxy agree', async () => {
		const previous = process.env.AZURE_OPENAI_ENDPOINT;
		process.env.AZURE_OPENAI_ENDPOINT = 'https://someone-elses.openai.azure.com';
		try {
			const ctx = setupMockContext('azureEntraCognitiveServicesOAuth2Api', entraCredential);

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(vi.mocked(AzureChatOpenAI).mock.calls[0][0]).toMatchObject({
				azureOpenAIEndpoint: 'https://my-resource.openai.azure.com',
			});
			expect(vi.mocked(getProxyAgent)).toHaveBeenCalledWith(
				'https://my-resource.openai.azure.com',
				expect.any(Object),
				expect.any(Object),
			);
		} finally {
			if (previous === undefined) delete process.env.AZURE_OPENAI_ENDPOINT;
			else process.env.AZURE_OPENAI_ENDPOINT = previous;
		}
	});

	describe('model parameter', () => {
		const { description } = new LmChatAzureOpenAi();
		// `@n8n/ai-utilities` is mocked, so the connection-hint property is undefined here.
		const modelPropertyAt = (typeVersion: number) =>
			description.properties.filter(
				(p) =>
					p?.name === 'model' && NodeHelpers.displayParameter({}, p, { typeVersion }, description),
			);

		it('keeps the plain text field on version 1', () => {
			const shown = modelPropertyAt(1);
			expect(shown).toHaveLength(1);
			expect(shown[0].type).toBe('string');
		});

		it('shows a deployment list backed by searchModels on version 1.1', () => {
			const shown = modelPropertyAt(1.1);
			expect(shown).toHaveLength(1);
			expect(shown[0].type).toBe('resourceLocator');
			expect(shown[0].modes?.map((m) => m.name)).toEqual(['list', 'id']);
			expect(shown[0].modes?.[0].typeOptions?.searchListMethod).toBe('searchModels');
			expect(description.defaultVersion).toBe(1.1);
		});

		it('resolves a version 1.1 picker value to the deployment name', async () => {
			const ctx = setupMockContext('azureOpenAiApi', apiKeyCredential);
			// Mirrors the real helper: a picker value is unwrapped only when `extractValue` is set.
			ctx.getNodeParameter = vi
				.fn()
				.mockImplementation(
					(paramName: string, _i: number, _d: unknown, opts?: { extractValue?: boolean }) => {
						if (paramName === 'authentication') return 'azureOpenAiApi';
						if (paramName === 'model') {
							return opts?.extractValue ? 'gpt-4o' : { __rl: true, mode: 'list', value: 'gpt-4o' };
						}
						if (paramName === 'options') return {};
						return undefined;
					},
				);

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(vi.mocked(AzureChatOpenAI).mock.calls[0][0]).toMatchObject({
				model: 'gpt-4o',
				azureOpenAIApiDeploymentName: 'gpt-4o',
			});
		});
	});
});
