import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { HumanMessage } from '@langchain/core/messages';
import type { ISupplyDataFunctions } from 'n8n-workflow';

import type { GenerateResult, StreamChunk } from 'src/types/output';

import { LangchainAdapter } from '../../adapters/langchain-chat-model';

jest.mock('src/converters/tool', () => ({
	fromLcTool: jest.fn().mockImplementation((t: { name?: string }) => ({
		type: 'function' as const,
		name: t?.name ?? 'tool',
		description: '',
		inputSchema: { type: 'object' as const },
	})),
}));

jest.mock('src/utils/n8n-llm-tracing', () => ({
	N8nLlmTracing: jest.fn().mockImplementation(function (this: unknown) {
		return this;
	}),
}));

jest.mock('src/utils/failed-attempt-handler/n8nLlmFailedAttemptHandler', () => ({
	makeN8nLlmFailedAttemptHandler: jest.fn().mockReturnValue(jest.fn()),
}));

const { fromLcTool } = jest.requireMock('src/converters/tool');
const { N8nLlmTracing } = jest.requireMock('src/utils/n8n-llm-tracing');
const { makeN8nLlmFailedAttemptHandler } = jest.requireMock(
	'src/utils/failed-attempt-handler/n8nLlmFailedAttemptHandler',
);

function createMockChatModel(
	overrides: {
		generate?: jest.Mock;
		stream?: jest.Mock;
		withTools?: jest.Mock;
	} = {},
) {
	const generate = jest.fn();
	const stream = jest.fn();
	const withTools = jest.fn().mockImplementation(function (
		this: ReturnType<typeof createMockChatModel>,
	) {
		return this;
	});
	return {
		provider: 'test-provider',
		modelId: 'test-model',
		generate: overrides.generate ?? generate,
		stream: overrides.stream ?? stream,
		withTools: overrides.withTools ?? withTools,
	};
}

describe('LangchainAdapter', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('constructor', () => {
		it('passes callbacks and onFailedAttempt when ctx is provided', () => {
			const ctx = {
				getNode: jest.fn(),
				addOutputData: jest.fn(),
			} as unknown as ISupplyDataFunctions;
			const chatModel = createMockChatModel();

			new LangchainAdapter(chatModel, ctx);

			expect(N8nLlmTracing).toHaveBeenCalledWith(ctx, expect.any(Object));
			expect(makeN8nLlmFailedAttemptHandler).toHaveBeenCalledWith(ctx);
		});

		it('does not pass callbacks or onFailedAttempt when ctx is omitted', () => {
			const chatModel = createMockChatModel();

			new LangchainAdapter(chatModel);

			expect(N8nLlmTracing).not.toHaveBeenCalled();
			expect(makeN8nLlmFailedAttemptHandler).not.toHaveBeenCalled();
		});
	});

	describe('_llmType', () => {
		it('returns "n8n-chat-model"', () => {
			const adapter = new LangchainAdapter(createMockChatModel());

			expect(adapter._llmType()).toBe('n8n-chat-model');
		});
	});

	describe('_generate', () => {
		it('transforms messages and calls chatModel.generate', async () => {
			const chatModel = createMockChatModel();
			const response: GenerateResult = {
				message: {
					role: 'assistant',
					content: [{ type: 'text', text: 'Hi there' }],
				},
			};
			chatModel.generate.mockResolvedValue(response);
			const adapter = new LangchainAdapter(chatModel);
			const messages = [new HumanMessage('hello')];
			const options = { temperature: 0.5 };

			const result = await adapter._generate(messages, options);

			expect(chatModel.generate).toHaveBeenCalledWith(
				[{ role: 'user', content: [{ type: 'text', text: 'hello' }] }],
				options,
			);
			expect(result.generations).toHaveLength(1);
			expect(result.generations[0].text).toBe('Hi there');
			expect(result.generations[0].message.content).toEqual([{ type: 'text', text: 'Hi there' }]);
		});

		it('builds usage_metadata from result.usage', async () => {
			const chatModel = createMockChatModel();
			const response: GenerateResult = {
				message: {
					role: 'assistant',
					content: [{ type: 'text', text: 'ok' }],
				},
				usage: {
					promptTokens: 10,
					completionTokens: 20,
					totalTokens: 30,
					inputTokenDetails: { cacheRead: 5 },
					outputTokenDetails: { reasoning: 15 },
				},
			};
			chatModel.generate.mockResolvedValue(response);
			const adapter = new LangchainAdapter(chatModel);

			const result = await adapter._generate([new HumanMessage('x')], {});

			const msg = result.generations[0].message as any;
			expect(msg.usage_metadata).toEqual({
				input_tokens: 10,
				output_tokens: 20,
				total_tokens: 30,
				input_token_details: { cache_read: 5 },
				output_token_details: { reasoning: 15 },
			});
			expect(result.llmOutput?.tokenUsage).toEqual(msg.usage_metadata);
		});

		it('maps result.toolCalls to message tool_calls and sets provider metadata', async () => {
			const chatModel = createMockChatModel();
			const response: GenerateResult = {
				message: {
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'tc-1',
							toolName: 'get_weather',
							input: JSON.stringify({ location: 'Berlin' }),
						},
						{ type: 'text', text: 'Hello, world!' },
					],
				},
				id: 'gen-1',
				providerMetadata: { finish_reason: 'tool_calls' },
			};
			chatModel.generate.mockResolvedValue(response);
			const adapter = new LangchainAdapter(chatModel);

			const result = await adapter._generate([new HumanMessage('hi')], {});

			const msg = result.generations[0].message as any;
			expect(msg.tool_calls).toEqual([
				{ type: 'tool_call', id: 'tc-1', name: 'get_weather', args: { location: 'Berlin' } },
			]);
			expect(msg.response_metadata).toEqual(
				expect.objectContaining({
					model: 'test-model',
					provider: 'test-provider',
					finish_reason: 'tool_calls',
				}),
			);
			expect(result.llmOutput?.id).toBe('gen-1');
		});
	});

	describe('_streamResponseChunks', () => {
		it('yields ChatGenerationChunk for text-delta chunks and calls runManager.handleLLMNewToken', async () => {
			async function* stream() {
				const response: StreamChunk = {
					type: 'text-delta',
					delta: 'Hello ',
				};
				const response2: StreamChunk = {
					type: 'text-delta',
					delta: 'world',
				};
				yield response;
				yield response2;
			}
			const chatModel = createMockChatModel({
				stream: jest.fn().mockImplementation(() => stream()),
			});
			const adapter = new LangchainAdapter(chatModel);
			const handleLLMNewToken = jest.fn();

			const chunks: any[] = [];
			for await (const chunk of adapter._streamResponseChunks([new HumanMessage('hi')], {}, {
				handleLLMNewToken,
			} as unknown as CallbackManagerForLLMRun)) {
				chunks.push(chunk);
			}

			expect(chunks).toHaveLength(2);
			expect(chunks[0].text).toBe('Hello ');
			expect(chunks[1].text).toBe('world');
			expect(handleLLMNewToken).toHaveBeenCalledWith(
				'Hello ',
				expect.any(Object),
				undefined,
				undefined,
				undefined,
				expect.any(Object),
			);
			expect(handleLLMNewToken).toHaveBeenCalledWith(
				'world',
				expect.any(Object),
				undefined,
				undefined,
				undefined,
				expect.any(Object),
			);
		});

		it('yields ChatGenerationChunk for tool-call-delta chunks', async () => {
			async function* stream() {
				const response: StreamChunk = {
					type: 'tool-call-delta',
					id: 'tc-1',
					name: 'search',
					argumentsDelta: '{"q":"x"}',
				};
				yield response;
			}
			const chatModel = createMockChatModel({
				stream: jest.fn().mockImplementation(() => stream()),
			});
			const adapter = new LangchainAdapter(chatModel);

			const chunks: any[] = [];
			for await (const chunk of adapter._streamResponseChunks([new HumanMessage('hi')], {})) {
				chunks.push(chunk);
			}

			expect(chunks).toHaveLength(1);
			expect(chunks[0].message.tool_call_chunks).toEqual([
				{ type: 'tool_call_chunk', id: 'tc-1', name: 'search', args: '{"q":"x"}', index: 0 },
			]);
		});

		it('yields ChatGenerationChunk for finish chunks with usage_metadata', async () => {
			async function* stream() {
				yield {
					type: 'finish' as const,
					finishReason: 'stop' as const,
					usage: {
						promptTokens: 1,
						completionTokens: 2,
						totalTokens: 3,
					},
				};
			}
			const chatModel = createMockChatModel({
				stream: jest.fn().mockImplementation(() => stream()),
			});
			const adapter = new LangchainAdapter(chatModel);

			const chunks: any[] = [];
			for await (const chunk of adapter._streamResponseChunks([new HumanMessage('hi')], {})) {
				chunks.push(chunk);
			}

			expect(chunks).toHaveLength(1);
			expect(chunks[0].message.usage_metadata).toEqual({
				input_tokens: 1,
				output_tokens: 2,
				total_tokens: 3,
			});
			expect(chunks[0].generationInfo?.finish_reason).toBe('stop');
		});
	});

	describe('bindTools', () => {
		it('converts tools via fromLcTool, calls chatModel.withTools, and returns new LangchainAdapter', () => {
			const chatModel = createMockChatModel();
			const adapter = new LangchainAdapter(chatModel, undefined);
			const lcTools = [{ name: 'my_tool', schema: {}, invoke: jest.fn() }];

			const bound = adapter.bindTools(lcTools);

			expect(fromLcTool).toHaveBeenCalledWith(lcTools[0], 0, lcTools);
			expect(chatModel.withTools).toHaveBeenCalledWith([
				{ type: 'function', name: 'my_tool', description: '', inputSchema: { type: 'object' } },
			]);
			expect(bound).toBeInstanceOf(LangchainAdapter);
			expect(bound).not.toBe(adapter);
		});
	});
});
