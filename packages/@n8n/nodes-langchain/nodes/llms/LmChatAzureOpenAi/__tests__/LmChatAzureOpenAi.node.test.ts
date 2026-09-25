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

		// supplyData reads this by name, so the suite stays green if the field is deleted.
		// `getConnectionHintNoticeField` is auto-mocked to undefined, hence the optional chain.
		it('should expose Extra Body as a JSON option', () => {
			const options = new LmChatAzureOpenAi().description.properties.find(
				(p) => p?.name === 'options',
			);
			const extraBody = options?.options?.find((o) => 'name' in o && o.name === 'extraBody');

			expect(extraBody).toEqual(
				expect.objectContaining({ displayName: 'Extra Body', type: 'json', default: '{}' }),
			);
		});

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

		it('should keep Response Format alongside an unrelated Extra Body key', async () => {
			const ctx = setupMockContext('azureOpenAiApi', apiKeyCredential, {
				responseFormat: 'json_object',
				extraBody: '{"seed":7}',
			});

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(vi.mocked(AzureChatOpenAI).mock.calls[0][0]).toMatchObject({
				modelKwargs: { response_format: { type: 'json_object' }, seed: 7 },
			});
		});

		// Extra Body is the escape hatch, so it has to override the option it overlaps with.
		it('should let Extra Body win when it sets the same key as Response Format', async () => {
			const ctx = setupMockContext('azureOpenAiApi', apiKeyCredential, {
				responseFormat: 'json_object',
				extraBody: '{"response_format":{"type":"text"}}',
			});

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(vi.mocked(AzureChatOpenAI).mock.calls[0][0]).toMatchObject({
				modelKwargs: { response_format: { type: 'text' } },
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
			// Reserved names. This node merges with a spread, so they would reach the request body
			// as literal keys rather than repoint anything, but they are still not model parameters.
			[
				'a prototype key',
				'{"__proto__":{"polluted":true}}',
				'The "Extra Body" field cannot set "__proto__"',
			],
			[
				'a constructor key',
				'{"constructor":{"x":1}}',
				'The "Extra Body" field cannot set "constructor"',
			],
		])('should reject a value that is %s', async (_, extraBody, message) => {
			const ctx = setupMockContext('azureOpenAiApi', apiKeyCredential, { extraBody });

			await expect(new LmChatAzureOpenAi().supplyData.call(ctx, 0)).rejects.toThrow(message);
		});
	});
});
