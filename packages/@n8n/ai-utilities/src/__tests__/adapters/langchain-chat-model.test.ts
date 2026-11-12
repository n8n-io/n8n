import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import type { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { AIMessageChunk } from '@langchain/core/messages';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import * as toolConverter from 'src/converters/tool';
import type { ChatModelConfig } from 'src/types/chat-model';
import type { GenerateResult, StreamChunk } from 'src/types/output';
import * as failedAttemptHandler from 'src/utils/failed-attempt-handler/n8nLlmFailedAttemptHandler';
import * as n8nLlmTracing from 'src/utils/n8n-llm-tracing';

import { LangchainChatModelAdapter } from '../../adapters/langchain-chat-model';

vi.mock('src/converters/tool', () => ({
	fromLcTool: vi.fn().mockImplementation((t: { name?: string }) => ({
		type: 'function' as const,
		name: t?.name ?? 'tool',
		description: '',
		inputSchema: { type: 'object' as const },
	})),
}));

vi.mock('src/utils/n8n-llm-tracing', () => ({
	N8nLlmTracing: vi.fn().mockImplementation(function (this: unknown) {
		return this;
	}),
}));

vi.mock('src/utils/failed-attempt-handler/n8nLlmFailedAttemptHandler', () => ({
	makeN8nLlmFailedAttemptHandler: vi.fn().mockReturnValue(vi.fn()),
}));

const fromLcTool = vi.mocked(toolConverter.fromLcTool);
const N8nLlmTracing = vi.mocked(n8nLlmTracing.N8nLlmTracing);
const makeN8nLlmFailedAttemptHandler = vi.mocked(
	failedAttemptHandler.makeN8nLlmFailedAttemptHandler,
);

function createMockChatModel(
	overrides: {
		generate?: Mock;
		stream?: Mock;
		withTools?: Mock;
	} = {},
) {
	const generate = vi.fn();
	const stream = vi.fn();
	const withTools = vi.fn().mockImplementation(function (
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

type LangchainCallOptions = ChatModelConfig & BaseChatModelCallOptions;

const response: GenerateResult = {
	message: { role: 'assistant', content: [{ type: 'text', text: 'ok' }] },
};

describe('LangchainAdapter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('constructor', () => {
		it('passes callbacks and onFailedAttempt when ctx is provided', () => {
			const ctx = {
				getNode: vi.fn(),
				addOutputData: vi.fn(),
			} as unknown as ISupplyDataFunctions;
			const chatModel = createMockChatModel();

			new LangchainChatModelAdapter(chatModel, ctx);

			expect(N8nLlmTracing).toHaveBeenCalledWith(ctx, expect.any(Object));
			expect(makeN8nLlmFailedAttemptHandler).toHaveBeenCalledWith(ctx);
		});

		it('reads token usage from the LangChain result', () => {
			const ctx = mock<ISupplyDataFunctions>();
			new LangchainChatModelAdapter(createMockChatModel(), ctx);
			const { tokensUsageParser } = N8nLlmTracing.mock.calls[0][1] ?? {};

			expect(
				tokensUsageParser?.({
					generations: [],
					llmOutput: { tokenUsage: { input_tokens: 3, output_tokens: 5, total_tokens: 8 } },
				}),
			).toEqual({ completionTokens: 5, promptTokens: 3, totalTokens: 8 });
			expect(tokensUsageParser?.({ generations: [] })).toEqual({
				completionTokens: 0,
				promptTokens: 0,
				totalTokens: 0,
			});
		});

		it('does not pass callbacks or onFailedAttempt when ctx is omitted', () => {
			const chatModel = createMockChatModel();

			new LangchainChatModelAdapter(chatModel);

			expect(N8nLlmTracing).not.toHaveBeenCalled();
			expect(makeN8nLlmFailedAttemptHandler).not.toHaveBeenCalled();
		});
	});

	describe('_llmType', () => {
		it('returns "n8n-chat-model"', () => {
			const adapter = new LangchainChatModelAdapter(createMockChatModel());

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
			const adapter = new LangchainChatModelAdapter(chatModel);
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
			const adapter = new LangchainChatModelAdapter(chatModel);

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
			const adapter = new LangchainChatModelAdapter(chatModel);

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
				stream: vi.fn().mockImplementation(() => stream()),
			});
			const adapter = new LangchainChatModelAdapter(chatModel);
			const handleLLMNewToken = vi.fn();

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
				stream: vi.fn().mockImplementation(() => stream()),
			});
			const adapter = new LangchainChatModelAdapter(chatModel);

			const chunks: any[] = [];
			for await (const chunk of adapter._streamResponseChunks([new HumanMessage('hi')], {})) {
				chunks.push(chunk);
			}

			expect(chunks).toHaveLength(1);
			expect(chunks[0].message.tool_call_chunks).toEqual([
				{ type: 'tool_call_chunk', id: 'tc-1', name: 'search', args: '{"q":"x"}', index: 0 },
			]);
		});

		describe('parallel tool calls', () => {
			async function streamToolCalls(deltas: StreamChunk[]) {
				async function* stream() {
					yield* deltas;
				}
				const chatModel = createMockChatModel({
					stream: vi.fn().mockImplementation(() => stream()),
				});
				const adapter = new LangchainChatModelAdapter(chatModel);

				let merged: AIMessageChunk | undefined;
				for await (const chunk of await adapter.stream([new HumanMessage('hi')])) {
					merged = merged ? merged.concat(chunk) : chunk;
				}
				return merged?.tool_calls;
			}

			it('keeps calls apart when continuation deltas have no id', async () => {
				const toolCalls = await streamToolCalls([
					{ type: 'tool-call-delta', id: 'tc-1', name: 'search', argumentsDelta: '' },
					{ type: 'tool-call-delta', argumentsDelta: '{"q":' },
					{ type: 'tool-call-delta', argumentsDelta: '"cats"}' },
					{ type: 'tool-call-delta', id: 'tc-2', name: 'weather', argumentsDelta: '' },
					{ type: 'tool-call-delta', argumentsDelta: '{"city":' },
					{ type: 'tool-call-delta', argumentsDelta: '"Berlin"}' },
				]);

				expect(toolCalls).toEqual([
					expect.objectContaining({ id: 'tc-1', name: 'search', args: { q: 'cats' } }),
					expect.objectContaining({ id: 'tc-2', name: 'weather', args: { city: 'Berlin' } }),
				]);
			});

			it('keeps interleaved calls apart when every delta has an id', async () => {
				const toolCalls = await streamToolCalls([
					{ type: 'tool-call-delta', id: 'tc-1', name: 'search', argumentsDelta: '{"q":' },
					{ type: 'tool-call-delta', id: 'tc-2', name: 'weather', argumentsDelta: '{"city":' },
					{ type: 'tool-call-delta', id: 'tc-1', argumentsDelta: '"cats"}' },
					{ type: 'tool-call-delta', id: 'tc-2', argumentsDelta: '"Berlin"}' },
				]);

				expect(toolCalls).toEqual([
					expect.objectContaining({ id: 'tc-1', name: 'search', args: { q: 'cats' } }),
					expect.objectContaining({ id: 'tc-2', name: 'weather', args: { city: 'Berlin' } }),
				]);
			});
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
				stream: vi.fn().mockImplementation(() => stream()),
			});
			const adapter = new LangchainChatModelAdapter(chatModel);

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
		it('converts tools via fromLcTool and calls chatModel.withTools', () => {
			const chatModel = createMockChatModel();
			const adapter = new LangchainChatModelAdapter(chatModel, undefined);
			const lcTools = [{ name: 'my_tool', schema: {}, invoke: vi.fn() }];

			const bound = adapter.bindTools(lcTools);

			expect(fromLcTool).toHaveBeenCalledWith(lcTools[0], 0, lcTools);
			expect(chatModel.withTools).toHaveBeenCalledWith([
				{ type: 'function', name: 'my_tool', description: '', inputSchema: { type: 'object' } },
			]);
			expect(bound).not.toBe(adapter);
		});

		it('passes the bound call options to generate', async () => {
			const chatModel = createMockChatModel();
			chatModel.generate.mockResolvedValue(response);
			const adapter = new LangchainChatModelAdapter<LangchainCallOptions>(chatModel);

			const bound = adapter.bindTools([{ name: 'my_tool', schema: {}, invoke: vi.fn() }], {
				tool_choice: 'any',
				stop: ['END'],
			});
			await bound.invoke([new HumanMessage('hi')]);

			expect(chatModel.generate).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({ tool_choice: 'any', stopSequences: ['END'] }),
			);
		});

		it('passes the bound call options to stream', async () => {
			async function* stream(): AsyncGenerator<StreamChunk> {
				yield { type: 'text-delta', delta: 'ok' };
			}
			const chatModel = createMockChatModel({
				stream: vi.fn().mockImplementation(() => stream()),
			});
			const adapter = new LangchainChatModelAdapter<LangchainCallOptions>(chatModel);

			const bound = adapter.bindTools([{ name: 'my_tool', schema: {}, invoke: vi.fn() }], {
				tool_choice: 'any',
			});
			for await (const _ of await bound.stream([new HumanMessage('hi')])) {
				// drain
			}

			expect(chatModel.stream).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({ tool_choice: 'any' }),
			);
		});
	});

	describe('call options', () => {
		it('passes the LangChain signal and stop sequences to generate under their documented names', async () => {
			const chatModel = createMockChatModel();
			chatModel.generate.mockResolvedValue(response);
			const adapter = new LangchainChatModelAdapter<LangchainCallOptions>(chatModel);
			const { signal } = new AbortController();

			await adapter.invoke([new HumanMessage('hi')], { signal, stop: ['END'] });

			expect(chatModel.generate).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({
					abortSignal: signal,
					stopSequences: ['END'],
					signal,
					stop: ['END'],
				}),
			);
		});

		it('passes the LangChain signal and stop sequences to stream under their documented names', async () => {
			async function* stream(): AsyncGenerator<StreamChunk> {
				yield { type: 'text-delta', delta: 'ok' };
			}
			const chatModel = createMockChatModel({
				stream: vi.fn().mockImplementation(() => stream()),
			});
			const adapter = new LangchainChatModelAdapter<LangchainCallOptions>(chatModel);
			const { signal } = new AbortController();

			for await (const _ of await adapter.stream([new HumanMessage('hi')], {
				signal,
				stop: ['END'],
			})) {
				// drain
			}

			expect(chatModel.stream).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({
					abortSignal: signal,
					stopSequences: ['END'],
					signal,
					stop: ['END'],
				}),
			);
		});

		it('keeps abortSignal and stopSequences when the caller sets them', async () => {
			const chatModel = createMockChatModel();
			chatModel.generate.mockResolvedValue(response);
			const adapter = new LangchainChatModelAdapter<LangchainCallOptions>(chatModel);
			const abortSignal = new AbortController().signal;

			await adapter._generate([new HumanMessage('hi')], {
				abortSignal,
				stopSequences: ['STOP'],
				signal: new AbortController().signal,
				stop: ['END'],
			});

			expect(chatModel.generate).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({ abortSignal, stopSequences: ['STOP'] }),
			);
		});
	});
});
