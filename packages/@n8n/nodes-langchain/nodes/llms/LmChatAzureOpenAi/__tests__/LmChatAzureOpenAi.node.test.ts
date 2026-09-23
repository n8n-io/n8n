import { AzureChatOpenAI, ChatOpenAI } from '@langchain/openai';
import { getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

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

const setupMockContext = (authentication: string, credential: object, options: object = {}) => {
	const ctx = createMockExecuteFunction<ISupplyDataFunctions>({}, mockNode);
	ctx.getCredentials = vi.fn().mockResolvedValue(credential);
	ctx.getNode = vi.fn().mockReturnValue(mockNode);
	ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
		if (paramName === 'authentication') return authentication;
		if (paramName === 'model') return 'gpt-4o';
		if (paramName === 'options') return options;
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
		// The Entra handler turns a missing endpoint into '' rather than undefined
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

	describe('Extra Body', () => {
		const foundryCredential = {
			...apiKeyCredential,
			endpointType: 'foundry',
			foundryEndpoint: 'https://my-resource.services.ai.azure.com/openai/v1',
		};

		it('should reach modelKwargs on the classic deployment', async () => {
			const ctx = setupMockContext('azureOpenAiApi', apiKeyCredential, {
				extraBody: '{"logit_bias":{"50256":-100}}',
			});

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(vi.mocked(AzureChatOpenAI).mock.calls[0][0]).toMatchObject({
				modelKwargs: { logit_bias: { '50256': -100 } },
			});
		});

		it('should reach modelKwargs on the Foundry deployment', async () => {
			const ctx = setupMockContext('azureOpenAiApi', foundryCredential, {
				extraBody: '{"top_k":40}',
			});

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(vi.mocked(ChatOpenAI).mock.calls[0][0]).toMatchObject({
				modelKwargs: { top_k: 40 },
			});
		});

		// It is a JSON string, so spreading the options onto the constructor would pass it through
		it('should not leak the raw field onto the client', async () => {
			const ctx = setupMockContext('azureOpenAiApi', apiKeyCredential, {
				extraBody: '{"top_k":40}',
			});

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(vi.mocked(AzureChatOpenAI).mock.calls[0][0]).not.toHaveProperty('extraBody');
		});

		it('should keep Response Format when both are set, and let Extra Body win a collision', async () => {
			const ctx = setupMockContext('azureOpenAiApi', apiKeyCredential, {
				responseFormat: 'json_object',
				extraBody: '{"seed":7}',
			});

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(vi.mocked(AzureChatOpenAI).mock.calls[0][0]).toMatchObject({
				modelKwargs: { response_format: { type: 'json_object' }, seed: 7 },
			});
		});

		it('should leave modelKwargs unset when neither option is used', async () => {
			const ctx = setupMockContext('azureOpenAiApi', apiKeyCredential);

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(vi.mocked(AzureChatOpenAI).mock.calls[0][0]).toMatchObject({
				modelKwargs: undefined,
			});
		});

		it.each([
			['not valid JSON', 'not json', 'The value in the "Extra Body" field is not valid JSON'],
			['not an object', '[1,2]', 'The value in the "Extra Body" field must be a JSON object'],
		])('should reject a value that is %s', async (_, extraBody, message) => {
			const ctx = setupMockContext('azureOpenAiApi', apiKeyCredential, { extraBody });

			await expect(new LmChatAzureOpenAi().supplyData.call(ctx, 0)).rejects.toThrow(message);
		});
	});
});
