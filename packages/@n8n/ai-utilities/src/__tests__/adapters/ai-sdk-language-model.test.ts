import type { LanguageModelV4CallOptions, LanguageModelV4StreamPart } from '@ai-sdk/provider';
import { UserError } from '@n8n/errors';

import type { ChatModel, ChatModelConfig } from 'src/types/chat-model';
import type { Message } from 'src/types/message';
import type { GenerateResult, StreamChunk } from 'src/types/output';
import type { Tool } from 'src/types/tool';

import { AiSdkLanguageModelAdapter } from '../../adapters/ai-sdk-language-model';

interface FakeCall {
	messages: Message[];
	config?: ChatModelConfig;
	/** Tools bound to the instance that received the call. */
	tools: Tool[];
	/** Schema bound to the instance that received the call. */
	structuredOutputSchema?: Record<string, unknown>;
}

interface FakeChatModel extends ChatModel {
	calls: FakeCall[];
}

function createFakeChatModel(
	options: {
		result?: GenerateResult;
		chunks?: StreamChunk[];
		structuredOutput?: boolean;
		onStreamClose?: () => void;
	} = {},
): FakeChatModel {
	const calls: FakeCall[] = [];

	// Every binding returns a new instance, so a test fails when the adapter
	// keeps calling the unbound model.
	function bind(tools: Tool[], structuredOutputSchema?: Record<string, unknown>): FakeChatModel {
		const model: FakeChatModel = {
			provider: 'fake',
			modelId: 'fake-model',
			calls,
			async generate(messages, config) {
				calls.push({ messages, config, tools, structuredOutputSchema });
				return options.result ?? { message: { role: 'assistant', content: [] } };
			},
			async *stream(messages, config) {
				calls.push({ messages, config, tools, structuredOutputSchema });
				try {
					for (const chunk of options.chunks ?? []) yield chunk;
				} finally {
					options.onStreamClose?.();
				}
			},
			withTools: (newTools) => bind(newTools, structuredOutputSchema),
		};

		if (options.structuredOutput) {
			model.withStructuredOutput = (schema) => bind(tools, schema);
		}

		return model;
	}

	return bind([]);
}

function callOptions(
	overrides: Partial<LanguageModelV4CallOptions> = {},
): LanguageModelV4CallOptions {
	return { prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }], ...overrides };
}

async function readAll(stream: ReadableStream<LanguageModelV4StreamPart>) {
	const parts: LanguageModelV4StreamPart[] = [];
	const reader = stream.getReader();
	while (true) {
		const { done, value } = await reader.read();
		if (done) return parts;
		parts.push(value);
	}
}

describe('AiSdkLanguageModelAdapter', () => {
	it('exposes the chat model identity as a v4 language model', () => {
		const adapter = new AiSdkLanguageModelAdapter(createFakeChatModel());

		expect(adapter.specificationVersion).toBe('v4');
		expect(adapter.provider).toBe('fake');
		expect(adapter.modelId).toBe('fake-model');
		expect(adapter.supportedUrls).toEqual({});
	});

	describe('doGenerate', () => {
		it('maps the prompt into chat model messages', async () => {
			const model = createFakeChatModel();
			const adapter = new AiSdkLanguageModelAdapter(model);

			await adapter.doGenerate(
				callOptions({
					prompt: [
						{ role: 'system', content: 'be brief' },
						{
							role: 'user',
							content: [
								{ type: 'text', text: 'hello' },
								{ type: 'file', mediaType: 'image/png', data: { type: 'data', data: 'aGk=' } },
								{ type: 'file', mediaType: 'text/plain', data: { type: 'text', text: 'hi' } },
							],
						},
						{
							role: 'assistant',
							content: [
								{ type: 'reasoning', text: 'thinking' },
								{ type: 'tool-call', toolCallId: 'call-1', toolName: 'lookup', input: { q: 1 } },
							],
						},
						{
							role: 'tool',
							content: [
								{
									type: 'tool-result',
									toolCallId: 'call-1',
									toolName: 'lookup',
									output: { type: 'json', value: { answer: 42 } },
								},
							],
						},
					],
				}),
			);

			expect(model.calls[0].messages).toEqual([
				{ role: 'system', content: [{ type: 'text', text: 'be brief' }] },
				{
					role: 'user',
					content: [
						{ type: 'text', text: 'hello' },
						{ type: 'file', mediaType: 'image/png', data: 'aGk=' },
						{ type: 'file', mediaType: 'text/plain', data: new TextEncoder().encode('hi') },
					],
				},
				{
					role: 'assistant',
					content: [
						{ type: 'reasoning', text: 'thinking' },
						{ type: 'tool-call', toolCallId: 'call-1', toolName: 'lookup', input: '{"q":1}' },
					],
				},
				{
					role: 'tool',
					content: [{ type: 'tool-result', toolCallId: 'call-1', result: { answer: 42 } }],
				},
			]);
		});

		it('maps error and denied tool outputs to error results', async () => {
			const model = createFakeChatModel();
			const adapter = new AiSdkLanguageModelAdapter(model);

			await adapter.doGenerate(
				callOptions({
					prompt: [
						{
							role: 'tool',
							content: [
								{
									type: 'tool-result',
									toolCallId: 'a',
									toolName: 't',
									output: { type: 'error-text', value: 'boom' },
								},
								{
									type: 'tool-result',
									toolCallId: 'b',
									toolName: 't',
									output: { type: 'execution-denied', reason: 'no' },
								},
							],
						},
					],
				}),
			);

			expect(model.calls[0].messages[0].content).toEqual([
				{ type: 'tool-result', toolCallId: 'a', result: 'boom', isError: true },
				{ type: 'tool-result', toolCallId: 'b', result: 'no', isError: true },
			]);
		});

		it('warns about prompt parts the chat model cannot take', async () => {
			const model = createFakeChatModel();
			const adapter = new AiSdkLanguageModelAdapter(model);

			const result = await adapter.doGenerate(
				callOptions({
					prompt: [
						{
							role: 'user',
							content: [
								{
									type: 'file',
									mediaType: 'image/png',
									data: { type: 'url', url: new URL('https://example.com/a.png') },
								},
								{
									type: 'file',
									mediaType: 'application/pdf',
									data: { type: 'reference', reference: { openai: 'file-1' } },
								},
							],
						},
						{
							role: 'assistant',
							content: [
								{
									type: 'reasoning-file',
									mediaType: 'image/png',
									data: { type: 'data', data: 'aGk=' },
								},
								{ type: 'custom', kind: 'fake.thing' },
							],
						},
						{
							role: 'tool',
							content: [{ type: 'tool-approval-response', approvalId: 'x', approved: true }],
						},
					],
				}),
			);

			expect(model.calls[0].messages).toEqual([]);
			expect(result.warnings).toEqual([
				{ type: 'unsupported', feature: 'file URL input' },
				{ type: 'unsupported', feature: 'file reference input' },
				{ type: 'unsupported', feature: 'reasoning file input' },
				{ type: 'unsupported', feature: 'custom part fake.thing' },
				{ type: 'unsupported', feature: 'tool approval response' },
			]);
		});

		it('maps tool result content with binary and URL file data to JSON', async () => {
			const model = createFakeChatModel();
			const adapter = new AiSdkLanguageModelAdapter(model);

			await adapter.doGenerate(
				callOptions({
					prompt: [
						{
							role: 'tool',
							content: [
								{
									type: 'tool-result',
									toolCallId: 'a',
									toolName: 't',
									output: {
										type: 'content',
										value: [
											{ type: 'text', text: 'chart' },
											{
												type: 'file',
												mediaType: 'image/png',
												data: { type: 'data', data: new Uint8Array([104, 105]) },
											},
											{
												type: 'file',
												mediaType: 'image/png',
												filename: 'b.png',
												data: { type: 'url', url: new URL('https://example.com/b.png') },
											},
										],
									},
								},
							],
						},
					],
				}),
			);

			expect(model.calls[0].messages[0].content).toEqual([
				{
					type: 'tool-result',
					toolCallId: 'a',
					result: [
						{ type: 'text', text: 'chart' },
						{ type: 'file', mediaType: 'image/png', data: { type: 'data', data: 'aGk=' } },
						{
							type: 'file',
							mediaType: 'image/png',
							filename: 'b.png',
							data: { type: 'url', url: 'https://example.com/b.png' },
						},
					],
				},
			]);
		});

		it('passes only the call options that were set as chat model config', async () => {
			const model = createFakeChatModel();
			const adapter = new AiSdkLanguageModelAdapter(model);
			const abortSignal = new AbortController().signal;

			await adapter.doGenerate(
				callOptions({
					maxOutputTokens: 100,
					temperature: 0.2,
					topP: 0.9,
					topK: 40,
					presencePenalty: 0.1,
					frequencyPenalty: 0.3,
					stopSequences: ['END'],
					seed: 7,
					abortSignal,
					headers: { 'x-test': '1' },
					includeRawChunks: true,
					providerOptions: { fake: { mode: 'x' } },
				}),
			);

			expect(model.calls[0].config).toStrictEqual({
				maxTokens: 100,
				temperature: 0.2,
				topP: 0.9,
				topK: 40,
				presencePenalty: 0.1,
				frequencyPenalty: 0.3,
				stopSequences: ['END'],
				seed: 7,
				abortSignal,
				headers: { 'x-test': '1' },
			});
			expect(model.calls[0].config?.abortSignal).toBe(abortSignal);
		});

		it('warns that the chat model cannot take a reasoning effort', async () => {
			const model = createFakeChatModel();
			const adapter = new AiSdkLanguageModelAdapter(model);

			const high = await adapter.doGenerate(callOptions({ reasoning: 'high' }));
			const providerDefault = await adapter.doGenerate(
				callOptions({ reasoning: 'provider-default' }),
			);

			expect(high.warnings).toEqual([{ type: 'unsupported', feature: 'reasoning high' }]);
			expect(providerDefault.warnings).toEqual([]);
			expect(model.calls[0].config).toStrictEqual({});
		});

		it('binds function tools and warns about provider tools and tool choice', async () => {
			const model = createFakeChatModel();
			const adapter = new AiSdkLanguageModelAdapter(model);
			const inputSchema = { type: 'object', properties: { q: { type: 'string' } } } as const;

			const result = await adapter.doGenerate(
				callOptions({
					tools: [
						{ type: 'function', name: 'lookup', description: 'Find things', inputSchema },
						{ type: 'provider', id: 'anthropic.web_search', name: 'web_search', args: {} },
					],
					toolChoice: { type: 'required' },
				}),
			);

			expect(model.calls[0].tools).toEqual([
				{
					type: 'function',
					name: 'lookup',
					description: 'Find things',
					inputSchema,
					strict: undefined,
					providerOptions: undefined,
				},
			]);
			expect(result.warnings).toEqual([
				{ type: 'unsupported', feature: 'provider tool anthropic.web_search' },
				{ type: 'unsupported', feature: 'toolChoice required' },
			]);
		});

		it('uses structured output for a json response format when the model offers it', async () => {
			const model = createFakeChatModel({ structuredOutput: true });
			const adapter = new AiSdkLanguageModelAdapter(model);
			const schema = { type: 'object', properties: { ok: { type: 'boolean' } } } as const;

			const result = await adapter.doGenerate(
				callOptions({ responseFormat: { type: 'json', schema } }),
			);

			expect(model.calls[0].structuredOutputSchema).toEqual(schema);
			expect(result.warnings).toEqual([]);
		});

		it('warns about a json response format when the model has no structured output', async () => {
			const model = createFakeChatModel();
			const adapter = new AiSdkLanguageModelAdapter(model);

			const result = await adapter.doGenerate(
				callOptions({ responseFormat: { type: 'json', schema: { type: 'object' } } }),
			);

			expect(model.calls[0].structuredOutputSchema).toBeUndefined();
			expect(result.warnings).toEqual([{ type: 'unsupported', feature: 'responseFormat json' }]);
		});

		it('maps the generated message into content parts', async () => {
			const model = createFakeChatModel({
				result: {
					message: {
						role: 'assistant',
						content: [
							{ type: 'reasoning', text: 'hmm' },
							{ type: 'text', text: 'Hello', providerMetadata: { foo: 'bar' } },
							{ type: 'tool-call', toolCallId: 'call-1', toolName: 'lookup', input: '{"q":1}' },
							{ type: 'tool-result', toolCallId: 'call-1', result: { hits: 3 } },
							{ type: 'tool-result', toolCallId: 'call-2', result: new Date(0), isError: true },
							{ type: 'invalid-tool-call', toolCallId: 'call-3', name: 'broken', args: '{' },
							{ type: 'invalid-tool-call', error: 'no name' },
							{ type: 'citation', url: 'https://example.com', title: 'Example' },
							{ type: 'citation', text: 'no url' },
							{ type: 'file', data: 'aGk=' },
							{ type: 'provider', value: { raw: true } },
						],
					},
				},
			});
			const adapter = new AiSdkLanguageModelAdapter(model);

			const result = await adapter.doGenerate(callOptions());

			expect(result.content).toEqual([
				{ type: 'reasoning', text: 'hmm' },
				{ type: 'text', text: 'Hello', providerMetadata: { fake: { foo: 'bar' } } },
				{
					type: 'tool-call',
					toolCallId: 'call-1',
					toolName: 'lookup',
					input: '{"q":1}',
					providerExecuted: true,
				},
				{ type: 'tool-result', toolCallId: 'call-1', toolName: 'lookup', result: { hits: 3 } },
				{
					type: 'tool-result',
					toolCallId: 'call-2',
					toolName: '',
					result: '1970-01-01T00:00:00.000Z',
					isError: true,
				},
				{ type: 'tool-call', toolCallId: 'call-3', toolName: 'broken', input: '{' },
				{
					type: 'source',
					sourceType: 'url',
					id: expect.any(String),
					url: 'https://example.com',
					title: 'Example',
				},
				{
					type: 'file',
					mediaType: 'application/octet-stream',
					data: { type: 'data', data: 'aGk=' },
				},
			]);
		});

		it('maps finish reason, usage, response id and provider metadata', async () => {
			const model = createFakeChatModel({
				result: {
					id: 'resp-1',
					finishReason: 'tool-calls',
					usage: {
						promptTokens: 10,
						completionTokens: 20,
						totalTokens: 30,
						inputTokenDetails: { cacheRead: 4 },
						outputTokenDetails: { reasoning: 6 },
						additionalMetadata: { billed: 1 },
					},
					providerMetadata: { status: 'completed', reasoning: { id: 'r1' }, at: new Date(0) },
					message: { role: 'assistant', content: [] },
				},
			});
			const adapter = new AiSdkLanguageModelAdapter(model);

			const result = await adapter.doGenerate(callOptions());

			expect(result.finishReason).toEqual({ unified: 'tool-calls', raw: undefined });
			expect(result.usage).toEqual({
				inputTokens: { total: 10, noCache: 6, cacheRead: 4, cacheWrite: undefined },
				outputTokens: { total: 20, text: 14, reasoning: 6 },
				raw: { billed: 1 },
			});
			expect(result.response).toEqual({ id: 'resp-1', modelId: 'fake-model' });
			expect(result.providerMetadata).toEqual({
				fake: { status: 'completed', reasoning: { id: 'r1' }, at: '1970-01-01T00:00:00.000Z' },
			});
		});

		it('leaves the uncached input tokens unknown when cache reads are not reported', async () => {
			const adapter = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					result: {
						usage: { promptTokens: 10, completionTokens: 2, totalTokens: 12 },
						message: { role: 'assistant', content: [] },
					},
				}),
			);

			const result = await adapter.doGenerate(callOptions());

			expect(result.usage.inputTokens).toEqual({
				total: 10,
				noCache: undefined,
				cacheRead: undefined,
				cacheWrite: undefined,
			});
		});

		it('sends block metadata back to the chat model when the AI SDK replays it', async () => {
			const model = createFakeChatModel({
				result: {
					message: {
						role: 'assistant',
						content: [
							{ type: 'reasoning', text: 'hmm', providerMetadata: { signature: 'sig-1' } },
							{
								type: 'tool-call',
								toolCallId: 'call-1',
								toolName: 'lookup',
								input: '{}',
								providerMetadata: { thought: 'sig-2' },
							},
						],
					},
				},
			});
			const adapter = new AiSdkLanguageModelAdapter(model);

			const generated = await adapter.doGenerate(callOptions());
			await adapter.doGenerate(
				callOptions({
					prompt: [
						{
							role: 'assistant',
							content: [
								{
									type: 'reasoning',
									text: 'hmm',
									providerOptions: generated.content[0].providerMetadata,
								},
								{
									type: 'tool-call',
									toolCallId: 'call-1',
									toolName: 'lookup',
									input: {},
									providerOptions: {
										...generated.content[1].providerMetadata,
										other: { ignored: true },
									},
								},
							],
						},
					],
				}),
			);

			expect(model.calls[1].messages[0].content).toEqual([
				{ type: 'reasoning', text: 'hmm', providerMetadata: { signature: 'sig-1' } },
				{
					type: 'tool-call',
					toolCallId: 'call-1',
					toolName: 'lookup',
					input: '{}',
					providerMetadata: { thought: 'sig-2' },
				},
			]);
		});

		it('falls back to "other" and empty usage when the chat model reports none', async () => {
			const adapter = new AiSdkLanguageModelAdapter(createFakeChatModel());

			const result = await adapter.doGenerate(callOptions());

			expect(result.finishReason).toEqual({ unified: 'other', raw: undefined });
			expect(result.usage.inputTokens.total).toBeUndefined();
			expect(result.usage.outputTokens.total).toBeUndefined();
			expect(result.providerMetadata).toBeUndefined();
		});
	});

	describe('doStream', () => {
		it('passes the abort signal to the chat model stream', async () => {
			const model = createFakeChatModel();
			const adapter = new AiSdkLanguageModelAdapter(model);
			const caller = new AbortController();

			const { stream } = await adapter.doStream(callOptions({ abortSignal: caller.signal }));
			await readAll(stream);
			caller.abort();

			expect(model.calls[0].config?.abortSignal?.aborted).toBe(true);
		});

		it('aborts a chat model call that waits for a chunk when the consumer cancels', async () => {
			const model = createFakeChatModel();
			model.stream = async function* (_messages, config) {
				yield { type: 'text-delta', delta: 'a' };
				await new Promise((_resolve, reject) => {
					config?.abortSignal?.addEventListener('abort', () => reject(new Error('aborted')));
				});
			};
			const adapter = new AiSdkLanguageModelAdapter(model);

			const { stream } = await adapter.doStream(callOptions());
			const reader = stream.getReader();
			for (let i = 0; i < 4; i++) await reader.read();
			// This read waits for the chunk that never arrives.
			void reader.read();

			await expect(reader.cancel()).resolves.toBeUndefined();
		});

		it('opens with stream-start and response-metadata', async () => {
			const adapter = new AiSdkLanguageModelAdapter(createFakeChatModel());

			const { stream } = await adapter.doStream(callOptions({ toolChoice: { type: 'none' } }));
			const parts = await readAll(stream);

			expect(parts.slice(0, 2)).toEqual([
				{ type: 'stream-start', warnings: [{ type: 'unsupported', feature: 'toolChoice none' }] },
				{ type: 'response-metadata', modelId: 'fake-model' },
			]);
		});

		it('brackets text and reasoning deltas and ends with finish', async () => {
			const adapter = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					chunks: [
						{ type: 'reasoning-delta', delta: 'think' },
						{ type: 'text-delta', delta: 'Hel' },
						{ type: 'text-delta', delta: 'lo' },
						{
							type: 'finish',
							finishReason: 'stop',
							usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
						},
					],
				}),
			);

			const { stream } = await adapter.doStream(callOptions());
			const parts = (await readAll(stream)).slice(2);

			expect(parts).toEqual([
				{ type: 'reasoning-start', id: 'reasoning' },
				{ type: 'reasoning-delta', id: 'reasoning', delta: 'think' },
				{ type: 'text-start', id: 'text' },
				{ type: 'text-delta', id: 'text', delta: 'Hel' },
				{ type: 'text-delta', id: 'text', delta: 'lo' },
				{ type: 'text-end', id: 'text' },
				{ type: 'reasoning-end', id: 'reasoning' },
				{
					type: 'finish',
					finishReason: { unified: 'stop', raw: undefined },
					usage: {
						inputTokens: {
							total: 1,
							noCache: undefined,
							cacheRead: undefined,
							cacheWrite: undefined,
						},
						outputTokens: { total: 2, text: 2, reasoning: undefined },
						raw: undefined,
					},
				},
			]);
		});

		it('brackets a reasoning-only stream', async () => {
			const adapter = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					chunks: [
						{ type: 'reasoning-delta', id: 'r1', delta: 'thi' },
						{ type: 'reasoning-delta', id: 'r1', delta: 'nk' },
						{ type: 'finish', finishReason: 'stop' },
					],
				}),
			);

			const { stream } = await adapter.doStream(callOptions());
			const parts = (await readAll(stream)).slice(2);

			expect(parts).toEqual([
				{ type: 'reasoning-start', id: 'r1' },
				{ type: 'reasoning-delta', id: 'r1', delta: 'thi' },
				{ type: 'reasoning-delta', id: 'r1', delta: 'nk' },
				{ type: 'reasoning-end', id: 'r1' },
				expect.objectContaining({ type: 'finish' }),
			]);
		});

		it('assembles tool call deltas into tool input parts and a tool call', async () => {
			const adapter = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					chunks: [
						{ type: 'tool-call-delta', id: 'call-1', argumentsDelta: '{"q":' },
						{ type: 'tool-call-delta', id: 'call-1', name: 'lookup' },
						{ type: 'tool-call-delta', id: 'call-1', argumentsDelta: '1}' },
						{ type: 'finish', finishReason: 'tool-calls' },
					],
				}),
			);

			const { stream } = await adapter.doStream(callOptions());
			const parts = (await readAll(stream)).slice(2, -1);

			expect(parts).toEqual([
				{ type: 'tool-input-start', id: 'call-1', toolName: 'lookup' },
				{ type: 'tool-input-delta', id: 'call-1', delta: '{"q":' },
				{ type: 'tool-input-delta', id: 'call-1', delta: '1}' },
				{ type: 'tool-input-end', id: 'call-1' },
				{ type: 'tool-call', toolCallId: 'call-1', toolName: 'lookup', input: '{"q":1}' },
			]);
		});

		it('reads on when several chunks in a row give no parts', async () => {
			const adapter = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					chunks: [
						{ type: 'tool-call-delta', id: 'call-1', argumentsDelta: '{"q":' },
						{ type: 'tool-call-delta', id: 'call-1', argumentsDelta: '1}' },
						{ type: 'content', content: { type: 'provider', value: { raw: true } } },
						{ type: 'tool-call-delta', id: 'call-1', name: 'lookup' },
						{ type: 'finish', finishReason: 'tool-calls' },
					],
				}),
			);

			const { stream } = await adapter.doStream(callOptions());
			const parts = (await readAll(stream)).slice(2);

			expect(parts.map((part) => part.type)).toEqual([
				'tool-input-start',
				'tool-input-delta',
				'tool-input-end',
				'tool-call',
				'finish',
			]);
		});

		it('keeps interleaved parallel tool calls apart by id', async () => {
			const adapter = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					chunks: [
						{ type: 'tool-call-delta', id: 'a', name: 'lookup', argumentsDelta: '{"q":' },
						{ type: 'tool-call-delta', id: 'b', name: 'weather', argumentsDelta: '{"city":' },
						{ type: 'tool-call-delta', id: 'a', name: 'lookup', argumentsDelta: '1}' },
						{ type: 'tool-call-delta', id: 'b', argumentsDelta: '"Berlin"' },
						{ type: 'tool-call-delta', id: 'b', argumentsDelta: '}' },
						{ type: 'finish', finishReason: 'tool-calls' },
					],
				}),
			);

			const { stream } = await adapter.doStream(callOptions());
			const parts = (await readAll(stream)).slice(2, -1);

			expect(parts).toEqual([
				{ type: 'tool-input-start', id: 'a', toolName: 'lookup' },
				{ type: 'tool-input-delta', id: 'a', delta: '{"q":' },
				{ type: 'tool-input-start', id: 'b', toolName: 'weather' },
				{ type: 'tool-input-delta', id: 'b', delta: '{"city":' },
				{ type: 'tool-input-delta', id: 'a', delta: '1}' },
				{ type: 'tool-input-delta', id: 'b', delta: '"Berlin"' },
				{ type: 'tool-input-delta', id: 'b', delta: '}' },
				{ type: 'tool-input-end', id: 'a' },
				{ type: 'tool-input-end', id: 'b' },
				{ type: 'tool-call', toolCallId: 'a', toolName: 'lookup', input: '{"q":1}' },
				{ type: 'tool-call', toolCallId: 'b', toolName: 'weather', input: '{"city":"Berlin"}' },
			]);
		});

		it('rejects a tool call delta without an id and stops the chat model stream', async () => {
			const model = createFakeChatModel({
				chunks: [
					{ type: 'tool-call-delta', id: 'a', name: 'lookup', argumentsDelta: '{"q":' },
					{ type: 'tool-call-delta', argumentsDelta: '1}' },
					{ type: 'finish', finishReason: 'tool-calls' },
				],
			});
			const adapter = new AiSdkLanguageModelAdapter(model);

			const { stream } = await adapter.doStream(callOptions());
			const parts = (await readAll(stream)).slice(2);
			const last = parts.at(-1);

			expect(parts.map((part) => part.type)).toEqual([
				'tool-input-start',
				'tool-input-delta',
				'error',
			]);
			expect(last?.type === 'error' && last.error).toBeInstanceOf(UserError);
			expect(last).toMatchObject({
				error: {
					message: 'The chat model "fake/fake-model" streamed a tool call without an id',
				},
			});
			expect(model.calls[0].config?.abortSignal?.aborted).toBe(true);
		});
		it('matches a complete tool call without an id to the only pending call', async () => {
			const adapter = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					chunks: [
						{ type: 'tool-call-delta', id: 'a', name: 'lookup', argumentsDelta: '{"q"' },
						{
							type: 'content',
							content: { type: 'tool-call', toolName: 'lookup', input: '{"q":1}' },
						},
						{ type: 'finish', finishReason: 'tool-calls' },
					],
				}),
			);

			const { stream } = await adapter.doStream(callOptions());
			const parts = (await readAll(stream)).slice(2, -1);

			expect(parts).toEqual([
				{ type: 'tool-input-start', id: 'a', toolName: 'lookup' },
				{ type: 'tool-input-delta', id: 'a', delta: '{"q"' },
				{ type: 'tool-input-delta', id: 'a', delta: ':1}' },
				{ type: 'tool-input-end', id: 'a' },
				{ type: 'tool-call', toolCallId: 'a', toolName: 'lookup', input: '{"q":1}' },
			]);
		});

		it('keeps a complete tool call without an id apart when the pending call is ambiguous', async () => {
			const adapter = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					chunks: [
						{ type: 'tool-call-delta', id: 'a', name: 'lookup', argumentsDelta: '{}' },
						{ type: 'tool-call-delta', id: 'b', name: 'lookup', argumentsDelta: '{}' },
						{
							type: 'content',
							content: { type: 'tool-call', toolName: 'lookup', input: '{"q":1}' },
						},
						{ type: 'finish', finishReason: 'tool-calls' },
					],
				}),
			);

			const { stream } = await adapter.doStream(callOptions());
			const calls = (await readAll(stream)).filter((part) => part.type === 'tool-call');

			expect(calls.map((call) => call.type === 'tool-call' && call.input)).toEqual([
				'{"q":1}',
				'{}',
				'{}',
			]);
		});

		it('sends no tool calls from a failed response', async () => {
			const error = new Error('bad');
			const afterErrorChunk = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					chunks: [
						{ type: 'tool-call-delta', id: 'a', name: 'lookup', argumentsDelta: '{}' },
						{ type: 'error', error },
					],
				}),
			);
			const afterErrorFinish = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					chunks: [
						{ type: 'tool-call-delta', id: 'a', name: 'lookup', argumentsDelta: '{}' },
						{ type: 'finish', finishReason: 'error' },
					],
				}),
			);

			const first = (await readAll((await afterErrorChunk.doStream(callOptions())).stream)).slice(
				2,
			);
			const second = (await readAll((await afterErrorFinish.doStream(callOptions())).stream)).slice(
				2,
			);

			expect(first.map((part) => part.type)).toEqual([
				'tool-input-start',
				'tool-input-delta',
				'error',
				'tool-input-end',
				'finish',
			]);
			expect(first.at(-1)).toMatchObject({ finishReason: { unified: 'error' } });
			expect(second.map((part) => part.type)).toEqual([
				'tool-input-start',
				'tool-input-delta',
				'tool-input-end',
				'finish',
			]);
		});

		it('marks a streamed tool call as provider-executed when its result follows', async () => {
			const adapter = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					chunks: [
						{ type: 'tool-call-delta', id: 'search-1', name: 'web_search', argumentsDelta: '{}' },
						{
							type: 'content',
							content: { type: 'tool-result', toolCallId: 'search-1', result: { hits: 2 } },
						},
						{ type: 'text-delta', delta: 'Found' },
						{ type: 'finish', finishReason: 'stop' },
					],
				}),
			);

			const { stream } = await adapter.doStream(callOptions());
			const parts = (await readAll(stream)).slice(2, -1);

			expect(parts).toEqual([
				{ type: 'tool-input-start', id: 'search-1', toolName: 'web_search' },
				{ type: 'tool-input-delta', id: 'search-1', delta: '{}' },
				{ type: 'tool-input-end', id: 'search-1' },
				{
					type: 'tool-call',
					toolCallId: 'search-1',
					toolName: 'web_search',
					input: '{}',
					providerExecuted: true,
				},
				{
					type: 'tool-result',
					toolCallId: 'search-1',
					toolName: 'web_search',
					result: { hits: 2 },
				},
				{ type: 'text-start', id: 'text' },
				{ type: 'text-delta', id: 'text', delta: 'Found' },
				{ type: 'text-end', id: 'text' },
			]);
		});

		it('keeps the provider metadata of stream chunks', async () => {
			const adapter = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					chunks: [
						{ type: 'reasoning-delta', delta: 'think' },
						{ type: 'reasoning-delta', delta: '', providerMetadata: { signature: 'sig' } },
						{ type: 'tool-call-delta', id: 'a', name: 'lookup', providerMetadata: { t: 1 } },
						{ type: 'tool-call-delta', id: 'a', argumentsDelta: '{}', providerMetadata: { u: 2 } },
						{ type: 'finish', finishReason: 'tool-calls', providerMetadata: { status: 'done' } },
					],
				}),
			);

			const { stream } = await adapter.doStream(callOptions());
			const parts = (await readAll(stream)).slice(2);

			expect(parts).toContainEqual({
				type: 'reasoning-delta',
				id: 'reasoning',
				delta: '',
				providerMetadata: { fake: { signature: 'sig' } },
			});
			expect(parts).toContainEqual({
				type: 'tool-call',
				toolCallId: 'a',
				toolName: 'lookup',
				input: '{}',
				providerMetadata: { fake: { t: 1, u: 2 } },
			});
			expect(parts.at(-1)).toMatchObject({ providerMetadata: { fake: { status: 'done' } } });
		});

		it('drops a streamed tool call that never got a name', async () => {
			const adapter = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					chunks: [
						{ type: 'tool-call-delta', id: 'call-1', argumentsDelta: '{}' },
						{ type: 'finish', finishReason: 'stop' },
					],
				}),
			);

			const { stream } = await adapter.doStream(callOptions());
			const parts = (await readAll(stream)).slice(2);

			expect(parts.map((part) => part.type)).toEqual(['finish']);
		});

		it('passes complete content chunks through as bracketed parts', async () => {
			const adapter = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					chunks: [
						{
							type: 'content',
							id: 't1',
							content: { type: 'text', text: 'Hello', providerMetadata: { n: 1 } },
						},
						{
							type: 'content',
							id: 'r1',
							content: { type: 'reasoning', text: 'hm', providerMetadata: { sig: 'x' } },
						},
						{
							type: 'content',
							content: { type: 'tool-call', toolCallId: 'call-1', toolName: 'lookup', input: '{}' },
						},
						{
							type: 'content',
							content: { type: 'citation', url: 'https://example.com', title: 'Example' },
						},
						{ type: 'finish', finishReason: 'stop' },
					],
				}),
			);

			const { stream } = await adapter.doStream(callOptions());
			const parts = (await readAll(stream)).slice(2, -1);

			expect(parts).toEqual([
				{ type: 'text-start', id: 't1' },
				{ type: 'text-delta', id: 't1', delta: 'Hello' },
				{ type: 'text-end', id: 't1', providerMetadata: { fake: { n: 1 } } },
				{ type: 'reasoning-start', id: 'r1' },
				{ type: 'reasoning-delta', id: 'r1', delta: 'hm' },
				{ type: 'reasoning-end', id: 'r1', providerMetadata: { fake: { sig: 'x' } } },
				{ type: 'tool-input-start', id: 'call-1', toolName: 'lookup' },
				{ type: 'tool-input-delta', id: 'call-1', delta: '{}' },
				{ type: 'tool-input-end', id: 'call-1' },
				{
					type: 'source',
					sourceType: 'url',
					id: expect.any(String),
					url: 'https://example.com',
					title: 'Example',
				},
				{ type: 'tool-call', toolCallId: 'call-1', toolName: 'lookup', input: '{}' },
			]);
		});

		it('closes streamed tool call deltas with a complete tool call content chunk', async () => {
			const adapter = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					chunks: [
						{ type: 'tool-call-delta', id: 'call-1', name: 'lookup', argumentsDelta: '{"q"' },
						{
							type: 'content',
							content: {
								type: 'tool-call',
								toolCallId: 'call-1',
								toolName: 'lookup',
								input: '{"q":1}',
							},
						},
						{ type: 'finish', finishReason: 'tool-calls' },
					],
				}),
			);

			const { stream } = await adapter.doStream(callOptions());
			const parts = (await readAll(stream)).slice(2, -1);

			expect(parts).toEqual([
				{ type: 'tool-input-start', id: 'call-1', toolName: 'lookup' },
				{ type: 'tool-input-delta', id: 'call-1', delta: '{"q"' },
				{ type: 'tool-input-delta', id: 'call-1', delta: ':1}' },
				{ type: 'tool-input-end', id: 'call-1' },
				{ type: 'tool-call', toolCallId: 'call-1', toolName: 'lookup', input: '{"q":1}' },
			]);
		});

		it('sends only the missing end of a complete block that follows its deltas', async () => {
			const adapter = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					chunks: [
						{ type: 'text-delta', id: 't1', delta: 'Hel' },
						{ type: 'content', id: 't1', content: { type: 'text', text: 'Hello' } },
						{ type: 'reasoning-delta', delta: 'thi' },
						{ type: 'content', content: { type: 'reasoning', text: 'think' } },
						{ type: 'finish', finishReason: 'stop' },
					],
				}),
			);

			const { stream } = await adapter.doStream(callOptions());
			const parts = (await readAll(stream)).slice(2, -1);

			expect(parts).toEqual([
				{ type: 'text-start', id: 't1' },
				{ type: 'text-delta', id: 't1', delta: 'Hel' },
				{ type: 'text-delta', id: 't1', delta: 'lo' },
				{ type: 'text-end', id: 't1' },
				{ type: 'reasoning-start', id: 'reasoning' },
				{ type: 'reasoning-delta', id: 'reasoning', delta: 'thi' },
				{ type: 'reasoning-delta', id: 'reasoning', delta: 'nk' },
				{ type: 'reasoning-end', id: 'reasoning' },
			]);
		});

		it('sends a complete block that does not continue its deltas as a part of its own', async () => {
			const adapter = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					chunks: [
						{ type: 'text-delta', id: 't1', delta: 'Hel' },
						{ type: 'content', id: 't1', content: { type: 'text', text: 'World' } },
						{ type: 'finish', finishReason: 'stop' },
					],
				}),
			);

			const { stream } = await adapter.doStream(callOptions());
			const parts = (await readAll(stream)).slice(2, -1);
			const newId = parts[3]?.type === 'text-start' ? parts[3].id : undefined;

			expect(newId).not.toBe('t1');
			expect(parts).toEqual([
				{ type: 'text-start', id: 't1' },
				{ type: 'text-delta', id: 't1', delta: 'Hel' },
				{ type: 'text-end', id: 't1' },
				{ type: 'text-start', id: newId },
				{ type: 'text-delta', id: newId, delta: 'World' },
				{ type: 'text-end', id: newId },
			]);
		});

		it('forwards error chunks', async () => {
			const error = new Error('bad');
			const adapter = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					chunks: [
						{ type: 'error', error },
						{ type: 'finish', finishReason: 'error' },
					],
				}),
			);

			const { stream } = await adapter.doStream(callOptions());
			const parts = (await readAll(stream)).slice(2);

			expect(parts[0]).toEqual({ type: 'error', error });
			expect(parts[1]).toMatchObject({ type: 'finish', finishReason: { unified: 'error' } });
		});

		it('turns a thrown stream error into an error part and ends the stream', async () => {
			const error = new Error('network');
			const model = createFakeChatModel();
			model.stream = async function* () {
				yield { type: 'text-delta', delta: 'Hel' };
				throw error;
			};
			const adapter = new AiSdkLanguageModelAdapter(model);

			const { stream } = await adapter.doStream(callOptions());
			const parts = (await readAll(stream)).slice(2);

			expect(parts).toEqual([
				{ type: 'text-start', id: 'text' },
				{ type: 'text-delta', id: 'text', delta: 'Hel' },
				{ type: 'error', error },
			]);
		});

		it('closes open parts and adds a finish when the chat model ends without one', async () => {
			const adapter = new AiSdkLanguageModelAdapter(
				createFakeChatModel({ chunks: [{ type: 'text-delta', delta: 'Hello' }] }),
			);

			const { stream } = await adapter.doStream(callOptions());
			const parts = (await readAll(stream)).slice(2);

			expect(parts.map((part) => part.type)).toEqual([
				'text-start',
				'text-delta',
				'text-end',
				'finish',
			]);
			expect(parts.at(-1)).toMatchObject({ finishReason: { unified: 'other' } });
		});

		it('returns from cancel while a chat model that ignores the signal waits for a chunk', async () => {
			const model = createFakeChatModel();
			model.stream = async function* () {
				yield { type: 'text-delta', delta: 'a' };
				await new Promise(() => {});
			};
			const adapter = new AiSdkLanguageModelAdapter(model);

			const { stream } = await adapter.doStream(callOptions());
			const reader = stream.getReader();
			for (let i = 0; i < 4; i++) await reader.read();
			void reader.read();

			await expect(reader.cancel()).resolves.toBeUndefined();
		});

		it('ends the stream on abort while a chat model that ignores the signal waits for a chunk', async () => {
			const model = createFakeChatModel();
			model.stream = async function* () {
				yield { type: 'text-delta', delta: 'a' };
				await new Promise(() => {});
			};
			const adapter = new AiSdkLanguageModelAdapter(model);
			const caller = new AbortController();

			const { stream } = await adapter.doStream(callOptions({ abortSignal: caller.signal }));
			const reader = stream.getReader();
			for (let i = 0; i < 4; i++) await reader.read();
			const pending = reader.read();
			caller.abort(new Error('stop'));

			await expect(pending).resolves.toEqual({
				done: false,
				value: { type: 'error', error: new Error('stop') },
			});
			await expect(reader.read()).resolves.toEqual({ done: true, value: undefined });
		});

		it('stops the chat model stream when the consumer cancels', async () => {
			const onStreamClose = vi.fn();
			const adapter = new AiSdkLanguageModelAdapter(
				createFakeChatModel({
					chunks: [
						{ type: 'text-delta', delta: 'a' },
						{ type: 'text-delta', delta: 'b' },
						{ type: 'text-delta', delta: 'c' },
					],
					onStreamClose,
				}),
			);

			const { stream } = await adapter.doStream(callOptions());
			const reader = stream.getReader();
			// Read past the two opening parts so the chat model stream has started.
			await reader.read();
			await reader.read();
			await reader.read();
			await reader.cancel();

			expect(onStreamClose).toHaveBeenCalled();
		});
	});
});
