/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import { makeN8nLlmFailedAttemptHandler, getProxyAgent, aiClientFetch } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';

import { LmChatOpenRouter } from '../LmChatOpenRouter.node';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');

const MockedChatOpenAI = vi.mocked(ChatOpenAI);
const mockedMakeN8nLlmFailedAttemptHandler = vi.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = vi.mocked(getProxyAgent);
const mockedAiClientFetch = vi.mocked(aiClientFetch);

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
		) as Mocked<ISupplyDataFunctions>;

		ctx.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'test-key',
			url: 'https://openrouter.ai/api/v1',
		});
		ctx.getNode = vi.fn().mockReturnValue(nodeDef);
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'anthropic/claude-sonnet-4-20250514';
			if (paramName === 'options') return {};
			return undefined;
		});

		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(vi.fn());
		mockedGetProxyAgent.mockReturnValue({} as any);
		// aiClientFetch wraps global fetch in production; mirror that so the
		// OpenRouter adapter drives the test's globalThis.fetch stub.
		mockedAiClientFetch.mockImplementation(
			async (...args) => await (globalThis.fetch as typeof fetch)(...args),
		);
		return ctx;
	};

	beforeEach(() => {
		node = new LmChatOpenRouter();
		vi.clearAllMocks();
	});

	describe('node description', () => {
		it('should have correct node properties', () => {
			expect(node.description).toMatchObject({
				displayName: 'OpenRouter Chat Model',
				name: 'lmChatOpenRouter',
				group: ['transform'],
				version: [1],
			});
		});

		it('should require openRouterApi credentials', () => {
			expect(node.description.credentials).toEqual([{ name: 'openRouterApi', required: true }]);
		});

		it('should output ai_languageModel', () => {
			expect(node.description.outputs).toEqual(['ai_languageModel']);
			expect(node.description.outputNames).toEqual(['Model']);
		});

		it('should offer the OpenRouter server tools in the options collection', () => {
			// getConnectionHintNoticeField is auto-mocked and returns undefined
			const optionsField = node.description.properties.find(
				(property) => property?.name === 'options',
			);
			const serverToolsField = optionsField?.options?.find(
				(option) => option.name === 'serverTools',
			);

			expect(serverToolsField).toMatchObject({
				displayName: 'Server Tools',
				type: 'multiOptions',
				default: [],
			});
			expect(serverToolsField?.options?.map((option) => option.value)).toEqual([
				'web_search',
				'datetime',
				'image_generation',
				'web_fetch',
				'fusion',
				'advisor',
				'subagent',
				'experimental__search_models',
				'files',
			]);
		});
	});

	describe('supplyData', () => {
		it('should create ChatOpenAI with basic configuration', async () => {
			const ctx = setupMockContext();

			const result = await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('openRouterApi');
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-key',
					model: 'anthropic/claude-sonnet-4-20250514',
					maxRetries: 2,
					callbacks: expect.arrayContaining([expect.any(Object)]),
					onFailedAttempt: expect.any(Function),
				}),
			);
			expect(result).toEqual({ response: expect.any(Object) });
		});

		it('should pass options to ChatOpenAI', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'anthropic/claude-sonnet-4-20250514';
				if (paramName === 'options')
					return {
						temperature: 0.5,
						maxTokens: 2000,
						topP: 0.9,
						frequencyPenalty: 0.3,
						presencePenalty: 0.2,
						timeout: 60000,
						maxRetries: 5,
					};
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					temperature: 0.5,
					maxTokens: 2000,
					topP: 0.9,
					frequencyPenalty: 0.3,
					presencePenalty: 0.2,
					timeout: 60000,
					maxRetries: 5,
				}),
			);
		});

		it('should set response_format in modelKwargs when responseFormat is provided', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'anthropic/claude-sonnet-4-20250514';
				if (paramName === 'options') return { responseFormat: 'json_object' };
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: { response_format: { type: 'json_object' } },
				}),
			);
		});

		it('should not set modelKwargs when no responseFormat', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: undefined,
				}),
			);
		});

		it('should pass a custom fetch wrapper in configuration', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			const callArgs = MockedChatOpenAI.mock.calls[0][0];
			expect(callArgs?.configuration?.fetch).toEqual(expect.any(Function));
		});

		describe('provider routing options', () => {
			it('should handle order option with comma-separated providers and spaces', async () => {
				const ctx = setupMockContext();
				ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'anthropic/claude-sonnet-4-20250514';
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
				ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'anthropic/claude-sonnet-4-20250514';
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
				ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'anthropic/claude-sonnet-4-20250514';
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
				ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'anthropic/claude-sonnet-4-20250514';
					if (paramName === 'options') return { providerRouting: {} };
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				const callArgs = MockedChatOpenAI.mock.calls[0][0];
				expect(callArgs?.modelKwargs).toBeUndefined();
			});
		});

		describe('reasoning effort', () => {
			const setupWithOptions = (model: string, options: Record<string, unknown>) => {
				const ctx = setupMockContext();
				ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return model;
					if (paramName === 'options') return options;
					return undefined;
				});
				return ctx;
			};

			it.each(['minimal', 'low', 'medium', 'high', 'xhigh'])(
				'should set reasoning.effort to %s in modelKwargs',
				async (effort) => {
					const ctx = setupWithOptions('openai/gpt-6-sol', { reasoningEffort: effort });

					await node.supplyData.call(ctx, 0);

					expect(MockedChatOpenAI).toHaveBeenCalledWith(
						expect.objectContaining({
							modelKwargs: { reasoning: { effort } },
						}),
					);
				},
			);

			it('should not pass reasoningEffort as a ChatOpenAI field', async () => {
				const ctx = setupWithOptions('openai/gpt-6-sol', { reasoningEffort: 'high' });

				await node.supplyData.call(ctx, 0);

				const callArgs = MockedChatOpenAI.mock.calls[0][0];
				expect(callArgs).not.toHaveProperty('reasoningEffort');
				expect(callArgs).not.toHaveProperty('reasoning');
			});

			it('should include reasoning, response format and provider routing together', async () => {
				const ctx = setupWithOptions('openai/gpt-6-sol', {
					reasoningEffort: 'low',
					responseFormat: 'json_object',
					providerRouting: { zdr: true },
				});

				await node.supplyData.call(ctx, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: {
							reasoning: { effort: 'low' },
							response_format: { type: 'json_object' },
							provider: { zdr: true },
						},
					}),
				);
			});

			it.each(['openai/gpt-6-sol', 'openai/gpt-5', 'anthropic/claude-sonnet-4-20250514'])(
				'should serialize reasoning in the OpenRouter request for %s',
				async (model) => {
					const ctx = setupWithOptions(model, { reasoningEffort: 'high' });
					await node.supplyData.call(ctx, 0);

					// Feed the node's constructor args into the real ChatOpenAI to inspect the request body
					const actual =
						await vi.importActual<typeof import('@langchain/openai')>('@langchain/openai');
					const realModel = new actual.ChatOpenAI(MockedChatOpenAI.mock.calls[0][0]);
					const params = realModel.invocationParams({});

					expect(params).toMatchObject({ model, reasoning: { effort: 'high' } });
					expect(params).not.toHaveProperty('reasoning_effort');
				},
			);
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

		/**
		 * Sets up a mock fetch, calls supplyData to capture it in the wrapper,
		 * and returns the wrapper function from the ChatOpenAI constructor args.
		 */
		async function setupFetchWrapper(mockFetch: Mock): Promise<typeof globalThis.fetch> {
			globalThis.fetch = mockFetch;
			const ctx = setupMockContext();
			await node.supplyData.call(ctx, 0);
			return MockedChatOpenAI.mock.calls[0][0]?.configuration?.fetch as typeof fetch;
		}

		it('should delegate to the bounded aiClientFetch under the wrapper', async () => {
			const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));

			const wrappedFetch = await setupFetchWrapper(mockFetch);
			await wrappedFetch('https://openrouter.ai/api/v1/models');

			// The wrapper must route through aiClientFetch, not call fetch directly,
			// so the outbound response stays bounded.
			expect(mockedAiClientFetch).toHaveBeenCalled();
		});

		it.each<{ input: unknown; expected: string; label: string }>([
			{ input: '', expected: '{}', label: 'empty string' },
			{ input: '   ', expected: '{}', label: 'whitespace-only string' },
			{ input: null, expected: '{}', label: 'null' },
			{ input: [], expected: '{}', label: 'empty array' },
			{ input: [1, 2], expected: '{}', label: 'non-empty array' },
			{ input: {}, expected: '{}', label: 'empty object (stringified)' },
			{
				input: { location: 'NYC' },
				expected: '{"location":"NYC"}',
				label: 'plain object (stringified)',
			},
			{
				input: '{"location":"NYC"}',
				expected: '{"location":"NYC"}',
				label: 'valid JSON string (unchanged)',
			},
			{ input: '{}', expected: '{}', label: 'empty JSON object string (unchanged)' },
		])('should normalize arguments: $label → $expected', async ({ input, expected }) => {
			const mockFetch = vi.fn().mockResolvedValue(
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
			const mockFetch = vi.fn().mockResolvedValue(
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
			const mockFetch = vi.fn().mockResolvedValue(jsonResponse(body));

			const wrappedFetch = await setupFetchWrapper(mockFetch);
			const response = await wrappedFetch('https://openrouter.ai/api/v1/models');

			expect(await response.json()).toEqual(body);
		});

		it('should pass through responses without tool_calls', async () => {
			const body = {
				choices: [{ message: { role: 'assistant', content: 'Hello!' } }],
			};
			const mockFetch = vi.fn().mockResolvedValue(jsonResponse(body));

			const wrappedFetch = await setupFetchWrapper(mockFetch);
			const response = await wrappedFetch('https://openrouter.ai/api/v1/chat/completions');

			expect(await response.json()).toEqual(body);
		});

		it('should fix only empty arguments in a mixed set of tool calls', async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				jsonResponse({
					choices: [
						{
							message: {
								tool_calls: [
									{
										id: 'call_1',
										function: { name: 'get_weather', arguments: '{"city":"NYC"}' },
									},
									{ id: 'call_2', function: { name: 'get_time', arguments: '' } },
									{
										id: 'call_3',
										function: { name: 'get_date', arguments: '{"format":"iso"}' },
									},
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
			const mockFetch = vi.fn().mockResolvedValue(
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
			// Stale metadata headers (content-length, etag, etc.) are not carried over
			expect(response.headers.get('content-length')).toBeNull();
		});
	});

	describe('server tools', () => {
		const origFetch = globalThis.fetch;

		afterEach(() => {
			globalThis.fetch = origFetch;
		});

		/**
		 * Captures the wrapper fetch with the given server tools selected and
		 * returns the fetch mock that receives the outbound request.
		 */
		async function setupServerTools(serverTools?: string[]) {
			const mockFetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				}),
			);
			globalThis.fetch = mockFetch;

			const ctx = setupMockContext();
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'anthropic/claude-sonnet-4-20250514';
				if (paramName === 'options') return serverTools ? { serverTools } : {};
				return undefined;
			});

			await node.supplyData.call(ctx, 0);
			const wrappedFetch = MockedChatOpenAI.mock.calls[0][0]?.configuration?.fetch as typeof fetch;
			return { mockFetch, wrappedFetch };
		}

		it('should append selected server tools next to function tools', async () => {
			const { mockFetch, wrappedFetch } = await setupServerTools(['web_search', 'datetime']);
			const functionTool = { type: 'function', function: { name: 'get_weather', parameters: {} } };
			const requestBody = {
				model: 'anthropic/claude-sonnet-4-20250514',
				messages: [{ role: 'user', content: 'What happened today?' }],
				tools: [functionTool],
			};

			await wrappedFetch('https://openrouter.ai/api/v1/chat/completions', {
				method: 'POST',
				body: JSON.stringify(requestBody),
				headers: { 'content-type': 'application/json', 'content-length': '123' },
			});

			const [, init] = mockFetch.mock.calls[0];
			const sentBody = JSON.parse(init.body as string);

			expect(sentBody.tools).toEqual([
				functionTool,
				{ type: 'openrouter:web_search' },
				{ type: 'openrouter:datetime' },
			]);
			expect(sentBody.messages).toEqual(requestBody.messages);
		});

		it('should create the tools array when the request has none', async () => {
			const { mockFetch, wrappedFetch } = await setupServerTools(['web_search']);

			await wrappedFetch('https://openrouter.ai/api/v1/chat/completions', {
				method: 'POST',
				body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }] }),
			});

			const [, init] = mockFetch.mock.calls[0];
			expect(JSON.parse(init.body as string).tools).toEqual([{ type: 'openrouter:web_search' }]);
		});

		it('should drop the stale content-length header after rewriting the body', async () => {
			const { mockFetch, wrappedFetch } = await setupServerTools(['web_search']);

			await wrappedFetch('https://openrouter.ai/api/v1/chat/completions', {
				method: 'POST',
				body: JSON.stringify({ messages: [] }),
				headers: { 'content-type': 'application/json', 'content-length': '2' },
			});

			const [, init] = mockFetch.mock.calls[0];
			const headers = new Headers(init.headers);
			expect(headers.get('content-length')).toBeNull();
			expect(headers.get('content-type')).toBe('application/json');
		});

		it('should not modify the request body when no server tools are selected', async () => {
			const { mockFetch, wrappedFetch } = await setupServerTools();
			const body = JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }] });

			await wrappedFetch('https://openrouter.ai/api/v1/chat/completions', {
				method: 'POST',
				body,
			});

			const [, init] = mockFetch.mock.calls[0];
			expect(init.body).toBe(body);
		});

		it('should send server tools in the request body built by the real ChatOpenAI', async () => {
			const { mockFetch, wrappedFetch } = await setupServerTools(['web_search']);
			mockFetch.mockResolvedValue(
				new Response(
					JSON.stringify({
						id: 'chatcmpl-1',
						object: 'chat.completion',
						created: 0,
						model: 'anthropic/claude-sonnet-4-20250514',
						choices: [
							{ index: 0, message: { role: 'assistant', content: 'Hello' }, finish_reason: 'stop' },
						],
						usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
					}),
					{ status: 200, headers: { 'content-type': 'application/json' } },
				),
			);

			const actual = await vi.importActual<typeof import('@langchain/openai')>('@langchain/openai');
			const constructorArgs = MockedChatOpenAI.mock.calls[0][0] as Record<string, any>;
			const realModel = new actual.ChatOpenAI({
				...constructorArgs,
				configuration: { ...constructorArgs.configuration, fetch: wrappedFetch },
			});

			await realModel.invoke('What happened in the news today?');

			const [url, init] = mockFetch.mock.calls[0];
			expect(String(url)).toContain('/chat/completions');
			expect(JSON.parse(init.body as string).tools).toEqual([{ type: 'openrouter:web_search' }]);
		});

		it('should not add a server tool that is already in the request', async () => {
			const { mockFetch, wrappedFetch } = await setupServerTools(['web_search']);
			const serverTool = { type: 'openrouter:web_search' };

			await wrappedFetch('https://openrouter.ai/api/v1/chat/completions', {
				method: 'POST',
				body: JSON.stringify({ messages: [], tools: [serverTool] }),
			});

			const [, init] = mockFetch.mock.calls[0];
			expect(JSON.parse(init.body as string).tools).toEqual([serverTool]);
		});
	});
});
