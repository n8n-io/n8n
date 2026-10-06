import { getBearerTokenProvider } from '@azure/identity';
import { ChatAnthropic } from '@langchain/anthropic';
import { AzureChatOpenAI, ChatOpenAI } from '@langchain/openai';
import {
	aiClientFetch,
	anthropicTokensUsageParser,
	getProxyAgent,
	makeN8nLlmFailedAttemptHandler,
	N8nLlmTracing,
} from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import { NodeHelpers, type INode, type ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatAzureOpenAi } from '../LmChatAzureOpenAi.node';

vi.mock('@langchain/openai');
vi.mock('@langchain/anthropic', () => ({ ChatAnthropic: vi.fn() }));
vi.mock('@n8n/ai-utilities');
vi.mock('@azure/identity', () => ({ getBearerTokenProvider: vi.fn() }));

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

const setupMockContext = (
	authentication: string,
	credential: object,
	options: object = {},
	responsesApiEnabled = false,
	modelFamily = 'openai',
) => {
	const ctx = createMockExecuteFunction<ISupplyDataFunctions>({}, mockNode);
	ctx.getCredentials = vi.fn().mockResolvedValue(credential);
	ctx.getNode = vi.fn().mockReturnValue(mockNode);
	ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
		if (paramName === 'authentication') return authentication;
		if (paramName === 'model') return 'gpt-4o';
		if (paramName === 'options') return options;
		if (paramName === 'responsesApiEnabled') return responsesApiEnabled;
		if (paramName === 'modelFamily') return modelFamily;
		return undefined;
	});
	ctx.logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
	return ctx;
};

describe('LmChatAzureOpenAi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('node identity', () => {
		const { description } = new LmChatAzureOpenAi();

		it('should be labelled for the whole Foundry catalogue, not just OpenAI', () => {
			expect(description.displayName).toBe('Microsoft Foundry Chat Model');
			expect(description.defaults.name).toBe('Microsoft Foundry Chat Model');
		});

		// A saved workflow resolves its nodes by type, so the rename is only safe while this is
		// untouched. Changing it would orphan every existing Azure OpenAI Chat Model node.
		it('should keep the node type, which saved workflows resolve by', () => {
			expect(description.name).toBe('lmChatAzureOpenAi');
		});

		// Without this the old label finds nothing at all, which is the one way the rename
		// could actually cost a user something.
		it('should still be findable by the old name', () => {
			expect(description.codex?.alias).toContain('Azure OpenAI');
		});

		it.each(['Azure', 'Azure OpenAI Chat Model', 'Azure AI Foundry', 'Foundry', 'AOAI'])(
			'should be findable by %s',
			(term) => {
				expect(description.codex?.alias).toContain(term);
			},
		);
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

	describe('Use Responses API', () => {
		const foundry = {
			...apiKeyCredential,
			endpointType: 'foundry',
			foundryEndpoint: 'https://my-resource.services.ai.azure.com/openai/v1',
		};

		it.each([
			['off', false],
			['on', true],
		])('should pass the setting through on Foundry when %s', async (_, enabled) => {
			const ctx = setupMockContext('azureOpenAiApi', foundry, {}, enabled);

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(vi.mocked(ChatOpenAI).mock.calls[0][0]).toMatchObject({
				useResponsesApi: enabled,
			});
		});

		// The toggle must not appear on nodes saved before it existed, and the node has to keep
		// offering both versions so those nodes still resolve.
		it('should offer version 1 alongside 1.1', () => {
			expect(new LmChatAzureOpenAi().description.version).toEqual([1, 1.1]);
		});

		it('should show the toggle only from version 1.1', () => {
			const toggle = new LmChatAzureOpenAi().description.properties.find(
				(p) => p?.name === 'responsesApiEnabled',
			);

			expect(toggle).toEqual(
				expect.objectContaining({
					type: 'boolean',
					default: false,
					displayOptions: {
						show: { '@version': [{ _cnd: { gte: 1.1 } }], modelFamily: ['openai'] },
					},
				}),
			);
		});

		// A version 1 node has no stored value for it, so the read has to fall back to off.
		it('should force Chat Completions when the parameter is absent', async () => {
			const ctx = setupMockContext('azureOpenAiApi', foundry, {});
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string, _i, fallback) => {
				if (paramName === 'authentication') return 'azureOpenAiApi';
				if (paramName === 'model') return 'gpt-4o';
				if (paramName === 'options') return {};
				return fallback;
			});

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(vi.mocked(ChatOpenAI).mock.calls[0][0]).toMatchObject({ useResponsesApi: false });
			expect(vi.mocked(ChatAnthropic)).not.toHaveBeenCalled();
		});

		// The two APIs name the format differently, and modelKwargs is spread over LangChain's own.
		it.each([
			[false, { response_format: { type: 'json_object' } }],
			[true, { text: { format: { type: 'json_object' } } }],
		])(
			'should send the response format in the shape that API takes (on=%s)',
			async (enabled, expected) => {
				const ctx = setupMockContext(
					'azureOpenAiApi',
					foundry,
					{ responseFormat: 'json_object' },
					enabled,
				);

				await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

				expect(vi.mocked(ChatOpenAI).mock.calls[0][0]).toMatchObject({ modelKwargs: expected });
			},
		);

		// The shared chain looks for JSON in modelKwargs.response_format, which the Responses
		// API never sets. Only that one combination may carry the flag that tells the chain directly.
		it.each([
			[true, 'json_object', 'json'],
			[false, 'json_object', undefined],
			[true, undefined, undefined],
		])(
			'should tell the chain to parse JSON only on Responses with json_object (on=%s, format=%s)',
			async (enabled, responseFormat, expected) => {
				const ctx = setupMockContext(
					'azureOpenAiApi',
					foundry,
					responseFormat ? { responseFormat } : {},
					enabled,
				);

				await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

				const params = vi.mocked(ChatOpenAI).mock.calls[0][0];
				expect(params).toBeDefined();
				expect(params!.metadata?.output_format).toBe(expected);
			},
		);

		// Azure answers the route it does not serve with a bare 404, which reads as a missing
		// deployment. The handler has to say which API the node asked for.
		it.each([
			[false, 'Chat Completions', "Turn on 'Use Responses API'"],
			[true, 'the Responses API', "Turn off 'Use Responses API'"],
		])('should explain a Foundry 404 when the setting is %s', async (enabled, api, remedy) => {
			const ctx = setupMockContext('azureOpenAiApi', foundry, {}, enabled);

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			const handler = vi.mocked(makeN8nLlmFailedAttemptHandler).mock.calls[0][1];
			expect(handler).toBeDefined();
			expect(() => handler!({ status: 404 } as never)).toThrow(
				`Azure did not accept the deployment "gpt-4o" on ${api}`,
			);
			expect(() => handler!({ status: 404 } as never)).toThrow(remedy);
		});

		// The classic base URL ends in /openai/deployments/<name>, which has no Responses API
		it('should refuse on a classic credential rather than call a path that does not exist', async () => {
			const ctx = setupMockContext('azureOpenAiApi', apiKeyCredential, {}, true);

			await expect(new LmChatAzureOpenAi().supplyData.call(ctx, 0)).rejects.toThrow(
				'The Responses API needs a credential using the Microsoft Foundry endpoint type',
			);
			expect(vi.mocked(AzureChatOpenAI)).not.toHaveBeenCalled();
		});

		it('should keep forcing Chat Completions on classic when the setting is off', async () => {
			const ctx = setupMockContext('azureOpenAiApi', apiKeyCredential, {}, false);

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(vi.mocked(AzureChatOpenAI).mock.calls[0][0]).toMatchObject({
				useResponsesApi: false,
			});
		});
	});

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

	describe('Model Family: Anthropic', () => {
		const foundry = {
			...apiKeyCredential,
			endpointType: 'foundry',
			foundryEndpoint: 'https://my-resource.services.ai.azure.com/openai/v1',
		};
		const entraFoundry = {
			...entraCredential,
			endpointType: 'foundry',
			foundryEndpoint: 'https://my-resource.services.ai.azure.com/openai/v1',
		};
		const { properties } = new LmChatAzureOpenAi().description;
		const findOption = (name: string) =>
			properties
				.find((p) => p?.name === 'options')
				?.options?.find((o) => 'name' in o && o.name === name);

		// Azure does not report the API family, so the user says which one the deployment answers on.
		it('should expose Model Family with OpenAI as the default', () => {
			const index = properties.findIndex((p) => p?.name === 'modelFamily');

			expect(properties[index]).toEqual(
				expect.objectContaining({
					type: 'options',
					default: 'openai',
					options: [
						expect.objectContaining({ value: 'openai' }),
						expect.objectContaining({ value: 'anthropic' }),
					],
				}),
			);
			expect(properties[index + 1]?.name).toBe('responsesApiEnabled');
		});

		it.each(['frequencyPenalty', 'presencePenalty', 'responseFormat'])(
			'should show %s for the OpenAI family only',
			(name) => {
				expect(findOption(name)).toEqual(
					expect.objectContaining({
						displayOptions: { show: { '/modelFamily': ['openai'] } },
					}),
				);
			},
		);

		it('should cap Sampling Temperature at 1 for the Anthropic family and 2 for OpenAI', () => {
			const temperatures = properties
				.find((p) => p?.name === 'options')
				?.options?.filter((o) => 'name' in o && o.name === 'temperature');

			expect(temperatures).toEqual([
				expect.objectContaining({
					typeOptions: expect.objectContaining({ maxValue: 2 }),
					displayOptions: { show: { '/modelFamily': ['openai'] } },
				}),
				expect.objectContaining({
					typeOptions: expect.objectContaining({ maxValue: 1 }),
					displayOptions: { show: { '/modelFamily': ['anthropic'] } },
				}),
			]);
		});

		it('should build the client against the resource origin plus /anthropic', async () => {
			const ctx = setupMockContext('azureOpenAiApi', foundry, {}, false, 'anthropic');

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(vi.mocked(ChatAnthropic).mock.calls[0][0]).toMatchObject({
				model: 'gpt-4o',
				anthropicApiUrl: 'https://my-resource.services.ai.azure.com/anthropic',
			});
			expect(vi.mocked(ChatOpenAI)).not.toHaveBeenCalled();
			expect(vi.mocked(AzureChatOpenAI)).not.toHaveBeenCalled();
		});

		it('should pass the API key as anthropicApiKey', async () => {
			const ctx = setupMockContext('azureOpenAiApi', foundry, {}, false, 'anthropic');

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			const params = vi.mocked(ChatAnthropic).mock.calls[0][0];
			expect(params).toMatchObject({ anthropicApiKey: 'test-key' });
			expect(params?.clientOptions?.fetch).toBe(aiClientFetch);
			// Null keeps the SDK from reading ANTHROPIC_AUTH_TOKEN off the host.
			expect(params?.clientOptions?.authToken).toBeNull();
		});

		// The classic endpoint type serves only the Azure OpenAI route, so fail before any request.
		it('should refuse a classic credential before building a client', async () => {
			const ctx = setupMockContext('azureOpenAiApi', apiKeyCredential, {}, false, 'anthropic');

			await expect(new LmChatAzureOpenAi().supplyData.call(ctx, 0)).rejects.toThrow(
				'Claude deployments need a credential using the Azure AI Foundry endpoint type',
			);
			expect(vi.mocked(ChatAnthropic)).not.toHaveBeenCalled();
			expect(vi.mocked(AzureChatOpenAI)).not.toHaveBeenCalled();
			expect(vi.mocked(ChatOpenAI)).not.toHaveBeenCalled();
		});

		// The SDK's bearer option is a static string and an Entra token expires mid-run, so each
		// request asks the provider for a token and drops the placeholder API key header.
		it('should mint a token for every request and send it as a bearer', async () => {
			vi.mocked(getBearerTokenProvider).mockReturnValue(
				vi.fn().mockResolvedValueOnce('tok-1').mockResolvedValueOnce('tok-2'),
			);
			const ctx = setupMockContext(
				'azureEntraCognitiveServicesOAuth2Api',
				entraFoundry,
				{},
				false,
				'anthropic',
			);

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			const params = vi.mocked(ChatAnthropic).mock.calls[0][0];
			expect(typeof params?.anthropicApiKey).toBe('string');
			expect(params?.anthropicApiKey).not.toBe('');
			const fetchImpl = params?.clientOptions?.fetch;
			expect(fetchImpl).toBeDefined();
			const input = 'https://my-resource.services.ai.azure.com/anthropic/v1/messages';
			const init = {
				method: 'POST',
				headers: { 'x-api-key': 'entra-id', 'content-type': 'application/json' },
			};
			await fetchImpl!(input, init);
			await fetchImpl!(input, init);

			expect(vi.mocked(aiClientFetch)).toHaveBeenCalledTimes(2);
			for (const [n, [calledInput, calledInit]] of vi.mocked(aiClientFetch).mock.calls.entries()) {
				const headers = new Headers(calledInit?.headers);
				expect(calledInput).toBe(input);
				expect(calledInit?.method).toBe('POST');
				expect(headers.get('Authorization')).toBe(`Bearer tok-${n + 1}`);
				expect(headers.has('x-api-key')).toBe(false);
				expect(headers.get('content-type')).toBe('application/json');
			}
		});

		it('should resolve the proxy against the Anthropic host', async () => {
			const dispatcher = { tag: 'dispatcher' };
			vi.mocked(getProxyAgent).mockReturnValue(dispatcher as never);
			const ctx = setupMockContext(
				'azureOpenAiApi',
				foundry,
				{ timeout: 1234 },
				false,
				'anthropic',
			);

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(vi.mocked(getProxyAgent)).toHaveBeenCalledWith(
				'https://my-resource.services.ai.azure.com/anthropic',
				{ headersTimeout: 1234, bodyTimeout: 1234 },
				expect.any(Object),
			);
			expect(vi.mocked(ChatAnthropic).mock.calls[0][0]).toMatchObject({
				clientOptions: { timeout: 1234, fetchOptions: { dispatcher } },
			});
		});

		// Claude 4.x rejects temperature and top_p together, so only what the user added is sent.
		it.each([
			[{}, undefined, undefined],
			[{ temperature: 0.2 }, 0.2, undefined],
			[{ topP: 0.9 }, undefined, 0.9],
		])(
			'should send temperature and top P only when set (%j)',
			async (options, temperature, topP) => {
				const ctx = setupMockContext('azureOpenAiApi', foundry, options, false, 'anthropic');

				await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

				const params = vi.mocked(ChatAnthropic).mock.calls[0][0];
				expect(params?.temperature).toBe(temperature);
				expect(params?.topP).toBe(topP);
			},
		);

		// -1 is the OpenAI "use default" sentinel; the Messages API rejects it.
		it.each([
			[undefined, undefined],
			[-1, undefined],
			[1024, 1024],
		])(
			'should leave max tokens to the client default when unset or -1 (%s)',
			async (maxTokens, expected) => {
				const options = maxTokens === undefined ? {} : { maxTokens };
				const ctx = setupMockContext('azureOpenAiApi', foundry, options, false, 'anthropic');

				await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

				expect(vi.mocked(ChatAnthropic).mock.calls[0][0]?.maxTokens).toBe(expected);
			},
		);

		it('should pass Extra Body as invocationKwargs and drop Response Format', async () => {
			const ctx = setupMockContext(
				'azureOpenAiApi',
				foundry,
				{
					frequencyPenalty: 0.5,
					presencePenalty: 0.5,
					responseFormat: 'json_object',
					extraBody: '{"top_k":40}',
				},
				false,
				'anthropic',
			);

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			const params = vi.mocked(ChatAnthropic).mock.calls[0][0];
			expect(params).toMatchObject({ invocationKwargs: { top_k: 40 } });
			expect(JSON.stringify(params)).not.toContain('response_format');
			expect(params).not.toHaveProperty('frequencyPenalty');
			expect(params).not.toHaveProperty('presencePenalty');
			expect(params).not.toHaveProperty('responseFormat');
		});

		it.each([
			[{ maxRetries: 5 }, 5],
			[{}, 2],
		])('should pass through max retries and default them to 2 (%j)', async (options, expected) => {
			const ctx = setupMockContext('azureOpenAiApi', foundry, options, false, 'anthropic');

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(vi.mocked(ChatAnthropic).mock.calls[0][0]?.maxRetries).toBe(expected);
		});

		// The default parser reads the OpenAI usage shape and would record estimates for Claude.
		it('should record Anthropic token counts', async () => {
			const ctx = setupMockContext('azureOpenAiApi', foundry, {}, false, 'anthropic');

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(anthropicTokensUsageParser).toBeDefined();
			expect(vi.mocked(N8nLlmTracing)).toHaveBeenCalledWith(
				ctx,
				expect.objectContaining({ tokensUsageParser: anthropicTokensUsageParser }),
			);
		});

		it('should explain a 404 on the Anthropic route', async () => {
			const ctx = setupMockContext('azureOpenAiApi', foundry, {}, false, 'anthropic');

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			const handler = vi.mocked(makeN8nLlmFailedAttemptHandler).mock.calls[0][1];
			expect(handler).toBeDefined();
			expect(() => handler!({ status: 404 } as never)).toThrow('on the Anthropic Messages API');
			expect(() => handler!({ status: 404 } as never)).toThrow('Set Model Family to OpenAI');
		});
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
			// The list needs a Foundry credential, and new credentials default to classic.
			expect(shown[0].default).toEqual({ mode: 'id', value: '' });
			expect(shown[0].modes?.[0].typeOptions?.searchListMethod).toBe('searchModels');
			expect(description.defaultVersion).toBe(1.1);
		});

		it('reads the deployment name with extractValue, so both version shapes resolve', async () => {
			const ctx = setupMockContext('azureOpenAiApi', apiKeyCredential);

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(ctx.getNodeParameter).toHaveBeenCalledWith('model', 0, '', { extractValue: true });
			expect(vi.mocked(AzureChatOpenAI).mock.calls[0][0]).toMatchObject({
				model: 'gpt-4o',
				azureOpenAIApiDeploymentName: 'gpt-4o',
			});
		});
	});
});
