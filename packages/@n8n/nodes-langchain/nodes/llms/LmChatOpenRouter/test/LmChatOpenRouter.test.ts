/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */

import { ChatOpenAI } from '@langchain/openai';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatOpenRouter } from '../LmChatOpenRouter.node';

jest.mock('@langchain/openai');

jest.mock(
	'@n8n/ai-utilities',
	() => ({
		makeN8nLlmFailedAttemptHandler: jest.fn(),
		N8nLlmTracing: jest.fn(),
		getProxyAgent: jest.fn(),
	}),
	{ virtual: true },
);

const MockedChatOpenAI = jest.mocked(ChatOpenAI);
const aiUtilitiesMock = jest.requireMock('@n8n/ai-utilities') as {
	makeN8nLlmFailedAttemptHandler: jest.Mock;
	N8nLlmTracing: jest.Mock;
	getProxyAgent: jest.Mock;
};
const mockMakeN8nLlmFailedAttemptHandler = aiUtilitiesMock.makeN8nLlmFailedAttemptHandler;
const mockN8nLlmTracing = aiUtilitiesMock.N8nLlmTracing;
const mockGetProxyAgent = aiUtilitiesMock.getProxyAgent;

describe('LmChatOpenRouter', () => {
	let node: LmChatOpenRouter;

	const mockNodeDef: INode = {
		id: '1',
		name: 'OpenRouter Chat Model',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.lmChatOpenRouter',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (nodeOverrides: Partial<INode> = {}) => {
		const nodeDef = { ...mockNodeDef, ...nodeOverrides };
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			nodeDef,
		) as jest.Mocked<ISupplyDataFunctions>;

		ctx.getCredentials = jest.fn().mockResolvedValue({
			apiKey: 'test-key',
			url: 'https://openrouter.ai/api/v1',
		});
		ctx.getNode = jest.fn().mockReturnValue(nodeDef);
		ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'openai/gpt-4.1-mini';
			if (paramName === 'options') return {};
			return undefined;
		});

		mockN8nLlmTracing.mockImplementation(() => ({}));
		mockMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());
		mockGetProxyAgent.mockReturnValue({});

		return ctx;
	};

	beforeEach(() => {
		node = new LmChatOpenRouter();
		jest.clearAllMocks();
	});

	describe('node description', () => {
		it('should have correct node properties', () => {
			expect(node.description).toMatchObject({
				displayName: 'OpenRouter Chat Model',
				name: 'lmChatOpenRouter',
				group: ['transform'],
				version: [1],
				description: 'For advanced usage with an AI chain',
			});
		});

		it('should require openRouterApi credentials', () => {
			expect(node.description.credentials).toEqual([{ name: 'openRouterApi', required: true }]);
		});

		it('should output ai_languageModel', () => {
			expect(node.description.outputs).toEqual(['ai_languageModel']);
			expect(node.description.outputNames).toEqual(['Model']);
		});

		it('should have expected key parameters', () => {
			expect(node.description.inputs).toEqual([]);

			const modelParam = node.description.properties.find((p) => p.name === 'model');
			expect(modelParam?.type).toBe('options');

			const optionsParam = node.description.properties.find((p) => p.name === 'options');
			expect(optionsParam?.type).toBe('collection');
		});
	});

	describe('supplyData', () => {
		describe('basic configuration', () => {
			it('should create ChatOpenAI with basic configuration', async () => {
				const ctx = setupMockContext();

				const result = await node.supplyData.call(ctx, 0);

				expect(ctx.getCredentials).toHaveBeenCalledWith('openRouterApi');
				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						apiKey: 'test-key',
						model: 'openai/gpt-4.1-mini',
						maxRetries: 2,
						timeout: undefined,
						callbacks: expect.arrayContaining([expect.any(Object)]),
						onFailedAttempt: expect.any(Function),
					}),
				);
				expect(result).toEqual({ response: expect.any(Object) });
			});

			it('should use baseURL from credentials', async () => {
				const ctx = setupMockContext();
				ctx.getCredentials = jest.fn().mockResolvedValue({
					apiKey: 'test-key',
					url: 'https://custom-openrouter.example.com/v1',
				});

				await node.supplyData.call(ctx, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						configuration: expect.objectContaining({
							baseURL: 'https://custom-openrouter.example.com/v1',
						}),
					}),
				);
			});

			it('should create tracing callback and failed attempt handler', async () => {
				const ctx = setupMockContext();

				await node.supplyData.call(ctx, 0);

				expect(mockN8nLlmTracing).toHaveBeenCalledWith(ctx);
				expect(mockMakeN8nLlmFailedAttemptHandler).toHaveBeenCalledWith(ctx, expect.any(Function));
			});

			it('should pass a custom fetch wrapper in configuration', async () => {
				const ctx = setupMockContext();

				await node.supplyData.call(ctx, 0);

				const callArgs = MockedChatOpenAI.mock.calls[0][0];
				expect(callArgs?.configuration?.fetch).toEqual(expect.any(Function));
			});
		});

		describe('standard LLM options', () => {
			it('should pass all standard options', async () => {
				const ctx = setupMockContext();
				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') {
						return {
							frequencyPenalty: 0.5,
							maxTokens: 1000,
							presencePenalty: 0.3,
							temperature: 0.8,
							topP: 0.9,
							timeout: 45000,
							maxRetries: 3,
						};
					}
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						frequencyPenalty: 0.5,
						maxTokens: 1000,
						presencePenalty: 0.3,
						temperature: 0.8,
						topP: 0.9,
						timeout: 45000,
						maxRetries: 3,
					}),
				);
			});

			it('should use default maxRetries when not provided', async () => {
				const ctx = setupMockContext();

				await node.supplyData.call(ctx, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						maxRetries: 2,
					}),
				);
			});
		});

		describe('response format option', () => {
			it.each(['text', 'json_object'] as const)(
				'should handle %s response format',
				async (responseFormat) => {
					const ctx = setupMockContext();
					ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
						if (paramName === 'model') return 'openai/gpt-4.1-mini';
						if (paramName === 'options') return { responseFormat };
						return undefined;
					});

					await node.supplyData.call(ctx, 0);

					expect(MockedChatOpenAI).toHaveBeenCalledWith(
						expect.objectContaining({
							modelKwargs: expect.objectContaining({
								response_format: { type: responseFormat },
							}),
						}),
					);
				},
			);

			it('should not set modelKwargs when no responseFormat and no provider routing', async () => {
				const ctx = setupMockContext();
				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { temperature: 0.7 };
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				const callArgs = MockedChatOpenAI.mock.calls[0][0];
				expect(callArgs.modelKwargs).toBeUndefined();
			});
		});

		describe('provider routing options', () => {
			it('should handle order option with comma-separated providers and spaces', async () => {
				const ctx = setupMockContext();
				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') {
						return { providerRouting: { order: ' anthropic , openai ,, google ' } };
					}
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							provider: expect.objectContaining({
								order: ['anthropic', 'openai', 'google'],
							}),
						}),
					}),
				);
			});

			it('should map provider routing fields to OpenRouter payload', async () => {
				const ctx = setupMockContext();
				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') {
						return {
							providerRouting: {
								allowFallbacks: false,
								requireParameters: true,
								dataCollection: 'deny',
								zdr: true,
								only: 'azure,anthropic',
								ignore: 'google',
								sort: 'price',
							},
						};
					}
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							provider: expect.objectContaining({
								allow_fallbacks: false,
								require_parameters: true,
								data_collection: 'deny',
								zdr: true,
								only: ['azure', 'anthropic'],
								ignore: ['google'],
								sort: 'price',
							}),
						}),
					}),
				);
			});

			it('should include response format and provider routing together', async () => {
				const ctx = setupMockContext();
				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') {
						return {
							responseFormat: 'json_object',
							providerRouting: {
								order: 'anthropic,openai',
								sort: 'price',
							},
						};
					}
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							response_format: { type: 'json_object' },
							provider: expect.objectContaining({
								order: ['anthropic', 'openai'],
								sort: 'price',
							}),
						}),
					}),
				);
			});

			it('should not add provider to modelKwargs when providerRouting is empty', async () => {
				const ctx = setupMockContext();
				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { providerRouting: {} };
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				const callArgs = MockedChatOpenAI.mock.calls[0][0];
				expect(callArgs.modelKwargs).toBeUndefined();
			});
		});
	});

	describe('fetch wrapper (empty tool call arguments fix)', () => {
		const origFetch = globalThis.fetch;

		afterEach(() => {
			globalThis.fetch = origFetch;
		});

		function jsonResponse(body: unknown): Response {
			const json = JSON.stringify(body);
			return new Response(json, {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		}

		async function setupFetchWrapper(mockFetch: jest.Mock): Promise<typeof globalThis.fetch> {
			globalThis.fetch = mockFetch;
			const ctx = setupMockContext();
			await node.supplyData.call(ctx, 0);
			return MockedChatOpenAI.mock.calls[0][0]?.configuration?.fetch as typeof fetch;
		}

		it.each<{ input: unknown; expected: string; label: string }>([
			{ input: '', expected: '{}', label: 'empty string' },
			{ input: '   ', expected: '{}', label: 'whitespace-only string' },
			{ input: null, expected: '{}', label: 'null' },
			{ input: [], expected: '{}', label: 'empty array' },
			{ input: [1, 2], expected: '{}', label: 'non-empty array' },
			{ input: {}, expected: '{}', label: 'empty object (stringified)' },
			{ input: { location: 'NYC' }, expected: '{"location":"NYC"}', label: 'plain object' },
			{
				input: '{"location":"NYC"}',
				expected: '{"location":"NYC"}',
				label: 'valid JSON string',
			},
			{ input: '{}', expected: '{}', label: 'empty JSON object string' },
		])('should normalize arguments: $label', async ({ input, expected }) => {
			const mockFetch = jest.fn().mockResolvedValue(
				jsonResponse({
					choices: [
						{
							message: {
								tool_calls: [{ id: 'call_1', function: { name: 'tool', arguments: input } }],
							},
						},
					],
				}),
			);

			const wrappedFetch = await setupFetchWrapper(mockFetch);
			const response = await wrappedFetch('https://openrouter.ai/api/v1/chat/completions');
			const result = await response.json();

			expect(result.choices[0].message.tool_calls[0].function.arguments).toBe(expected);
		});

		it('should pass through non-JSON responses untouched', async () => {
			const textBody = 'plain text response';
			const mockFetch = jest.fn().mockResolvedValue(
				new Response(textBody, {
					status: 200,
					headers: { 'content-type': 'text/plain' },
				}),
			);

			const wrappedFetch = await setupFetchWrapper(mockFetch);
			const response = await wrappedFetch('https://openrouter.ai/api/v1/chat/completions');

			expect(await response.text()).toBe(textBody);
		});

		it('should pass through JSON responses without choices', async () => {
			const body = { models: ['a', 'b'] };
			const mockFetch = jest.fn().mockResolvedValue(jsonResponse(body));

			const wrappedFetch = await setupFetchWrapper(mockFetch);
			const response = await wrappedFetch('https://openrouter.ai/api/v1/models');

			expect(await response.json()).toEqual(body);
		});

		it('should pass through responses without tool_calls', async () => {
			const body = {
				choices: [{ message: { role: 'assistant', content: 'Hello!' } }],
			};
			const mockFetch = jest.fn().mockResolvedValue(jsonResponse(body));

			const wrappedFetch = await setupFetchWrapper(mockFetch);
			const response = await wrappedFetch('https://openrouter.ai/api/v1/chat/completions');

			expect(await response.json()).toEqual(body);
		});

		it('should fix only empty arguments in a mixed set of tool calls', async () => {
			const mockFetch = jest.fn().mockResolvedValue(
				jsonResponse({
					choices: [
						{
							message: {
								tool_calls: [
									{ id: 'call_1', function: { name: 'get_weather', arguments: '{"city":"NYC"}' } },
									{ id: 'call_2', function: { name: 'get_time', arguments: '' } },
									{ id: 'call_3', function: { name: 'get_date', arguments: '{"format":"iso"}' } },
								],
							},
						},
					],
				}),
			);

			const wrappedFetch = await setupFetchWrapper(mockFetch);
			const response = await wrappedFetch('https://openrouter.ai/api/v1/chat/completions');
			const result = await response.json();

			const toolCalls = result.choices[0].message.tool_calls;
			expect(toolCalls[0].function.arguments).toBe('{"city":"NYC"}');
			expect(toolCalls[1].function.arguments).toBe('{}');
			expect(toolCalls[2].function.arguments).toBe('{"format":"iso"}');
		});

		it('should only carry content-type header on modified responses', async () => {
			const mockFetch = jest.fn().mockResolvedValue(
				jsonResponse({
					choices: [
						{
							message: {
								tool_calls: [{ id: 'call_1', function: { name: 'get_time', arguments: '' } }],
							},
						},
					],
				}),
			);

			const wrappedFetch = await setupFetchWrapper(mockFetch);
			const response = await wrappedFetch('https://openrouter.ai/api/v1/chat/completions');

			expect(response.headers.get('content-type')).toBe('application/json');
			expect(response.headers.get('content-length')).toBeNull();
		});
	});
});
