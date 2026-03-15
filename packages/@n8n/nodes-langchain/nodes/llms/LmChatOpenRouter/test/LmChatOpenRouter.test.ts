/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import { makeN8nLlmFailedAttemptHandler, N8nLlmTracing, getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatOpenRouter } from '../LmChatOpenRouter.node';

jest.mock('@langchain/openai');
jest.mock('@n8n/ai-utilities');

const MockedChatOpenAI = jest.mocked(ChatOpenAI);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = jest.mocked(getProxyAgent);

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
			if (paramName === 'model') return 'anthropic/claude-sonnet-4-20250514';
			if (paramName === 'options') return {};
			return undefined;
		});

		MockedN8nLlmTracing.mockImplementation(() => ({}) as unknown as N8nLlmTracing);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());
		mockedGetProxyAgent.mockReturnValue({} as any);
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
			});
		});

		it('should require openRouterApi credentials', () => {
			expect(node.description.credentials).toEqual([{ name: 'openRouterApi', required: true }]);
		});

		it('should output ai_languageModel', () => {
			expect(node.description.outputs).toEqual(['ai_languageModel']);
			expect(node.description.outputNames).toEqual(['Model']);
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
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
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
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
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
			// Stale metadata headers (content-length, etag, etc.) are not carried over
			expect(response.headers.get('content-length')).toBeNull();
		});
	});
});
