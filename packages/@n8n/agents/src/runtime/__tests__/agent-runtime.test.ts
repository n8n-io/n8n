import * as aiModule from 'ai';
import type { JSONSchema7 } from 'json-schema';
import type { Mock, MockedFunction } from 'vitest';
import { z } from 'zod';

import { createCancellation } from '../../sdk/cancellation';
import { isLlmMessage } from '../../sdk/message';
import { Tool, Tool as ToolBuilder } from '../../sdk/tool';
import { AgentEvent } from '../../types/runtime/event';
import type { AgentEventData } from '../../types/runtime/event';
import type { StreamChunk } from '../../types/sdk/agent';
import type { ContentToolCall, Message } from '../../types/sdk/message';
import type { BuiltTool, InterruptibleToolContext, ToolContext } from '../../types/sdk/tool';
import type { BuiltTelemetry } from '../../types/telemetry';
import { AgentRuntime } from '../agent-runtime';
import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	INLINE_DELEGATE_SUB_AGENT_TOOL_METADATA_KEY,
	createDelegateSubAgentTool,
	type DelegateSubAgentRunner,
} from '../delegate-sub-agent-tool';
import { AgentEventBus } from '../event-bus';
import { InMemoryMemory } from '../memory-store';
import { toAiSdkTools } from '../tool-adapter';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Mock provider packages so createModel() doesn't fail when no API key is set
vi.mock('@ai-sdk/openai', () => ({
	createOpenAI: () =>
		Object.assign(() => ({ provider: 'openai', modelId: 'mock', specificationVersion: 'v3' }), {
			embeddingModel: () => ({ provider: 'openai', modelId: 'mock', specificationVersion: 'v2' }),
		}),
}));

vi.mock('@ai-sdk/anthropic', () => ({
	createAnthropic: () => () => ({
		provider: 'anthropic',
		modelId: 'mock',
		specificationVersion: 'v3',
	}),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type AiImport = typeof import('ai');

// Mock generateText and streamText from the 'ai' package
vi.mock('ai', async () => {
	const actual = await vi.importActual<AiImport>('ai');
	return {
		...actual,
		embed: vi.fn(),
		embedMany: vi.fn(),
		generateText: vi.fn(),
		streamText: vi.fn(),
		tool: vi.fn((config: unknown) => config),
		jsonSchema: vi.fn((schema: unknown) => ({ _type: 'jsonSchema', schema })),
		Output: {
			object: vi.fn(({ schema }: { schema: unknown }) => ({ _type: 'object', schema })),
		},
	};
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const { embed, embedMany, generateText, streamText, jsonSchema } = aiModule as unknown as {
	embed: Mock;
	embedMany: Mock;
	generateText: Mock;
	streamText: Mock;
	jsonSchema: Mock;
};

/** Minimal successful generateText response. */
function makeGenerateSuccess(text = 'OK') {
	return {
		finishReason: 'stop',
		usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
		response: {
			messages: [
				{
					role: 'assistant',
					content: [{ type: 'text', text }],
				},
			],
		},
		toolCalls: [],
	};
}

/** Generator that yields the given chunks then ends cleanly. */
function* makeChunkStream(
	chunks: Array<Record<string, unknown>>,
): Generator<Record<string, unknown>> {
	for (const c of chunks) {
		yield c;
	}
}

/**
 * Create a pre-rejected promise whose rejection is already handled, so it
 * never causes an unhandled-rejection crash even if nobody awaits it.
 */
// eslint-disable-next-line @typescript-eslint/promise-function-async
function silentReject<T = never>(error: Error): Promise<T> {
	const p = Promise.reject<T>(error);
	p.catch(() => {}); // suppress unhandled-rejection warning
	return p;
}

function makeErrorStream(error: Error) {
	return new ReadableStream({
		start(controller) {
			controller.error(error);
		},
	});
}

function makeExecutionCounter() {
	return {
		incrementMessageCount: vi.fn(),
		incrementToolCallCount: vi.fn(),
		incrementTokenCount: vi.fn(),
	};
}

/** Collect all chunks from a ReadableStream. */
async function collectChunks(stream: ReadableStream<unknown>): Promise<StreamChunk[]> {
	const chunks: StreamChunk[] = [];
	const reader = stream.getReader();
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value as StreamChunk);
	}
	return chunks;
}

/** Minimal successful streamText response. */
function makeStreamSuccess(text = 'Hello') {
	return {
		fullStream: makeChunkStream([{ type: 'text-delta', textDelta: text }]),
		finishReason: Promise.resolve('stop'),
		usage: Promise.resolve({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
		response: Promise.resolve({
			messages: [{ role: 'assistant', content: [{ type: 'text', text }] }],
		}),
		toolCalls: Promise.resolve([]),
	};
}

/**
 * streamText response where the model invokes a provider-executed tool (e.g.
 * native web search): the SDK streams a `tool-call` and its terminal part
 * (`tool-result` on success, `tool-error` on failure) with `providerExecuted`,
 * then finishes with `stop` (the provider runs the tool server-side mid-step).
 */
function makeStreamWithProviderTool(opts: {
	toolCallId: string;
	toolName: string;
	input: unknown;
	output?: unknown;
	error?: unknown;
	text?: string;
}) {
	const terminal =
		opts.error !== undefined
			? {
					type: 'tool-error',
					toolCallId: opts.toolCallId,
					toolName: opts.toolName,
					input: opts.input,
					error: opts.error,
					providerExecuted: true,
				}
			: {
					type: 'tool-result',
					toolCallId: opts.toolCallId,
					toolName: opts.toolName,
					input: opts.input,
					output: opts.output,
					providerExecuted: true,
				};
	const text = opts.text ?? 'done';
	return {
		fullStream: makeChunkStream([
			{
				type: 'tool-call',
				toolCallId: opts.toolCallId,
				toolName: opts.toolName,
				input: opts.input,
				providerExecuted: true,
			},
			terminal,
			{ type: 'text-delta', textDelta: text },
		]),
		finishReason: Promise.resolve('stop'),
		usage: Promise.resolve({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
		response: Promise.resolve({
			messages: [{ role: 'assistant', content: [{ type: 'text', text }] }],
		}),
		toolCalls: Promise.resolve([]),
	};
}

/** Build a default runtime wired to the shared eventBus for inspection. */
function createRuntime(eventBus?: AgentEventBus) {
	const bus = eventBus ?? new AgentEventBus();
	const runtime = new AgentRuntime({
		name: 'test',
		model: 'openai/gpt-4o-mini',
		instructions: 'You are a test assistant.',
		eventBus: bus,
	});
	return { runtime, bus };
}

const testSchema = z.object({ answer: z.string(), score: z.number() });

const testJsonSchema: JSONSchema7 = {
	type: 'object',
	properties: { answer: { type: 'string' }, score: { type: 'number' } },
	required: ['answer', 'score'],
};

/** Build a runtime configured with structuredOutput. */
function createStructuredRuntime(options?: { tools?: BuiltTool[]; eventBus?: AgentEventBus }) {
	const bus = options?.eventBus ?? new AgentEventBus();
	const runtime = new AgentRuntime({
		name: 'test-structured',
		model: 'openai/gpt-4o-mini',
		instructions: 'You are a test assistant.',
		structuredOutput: testSchema,
		eventBus: bus,
		...(options?.tools ? { tools: options.tools } : {}),
	});
	return { runtime, bus };
}

/** Build a runtime configured with a raw JSON Schema structuredOutput. */
function createJsonSchemaStructuredRuntime() {
	const bus = new AgentEventBus();
	const runtime = new AgentRuntime({
		name: 'test-structured-json',
		model: 'openai/gpt-4o-mini',
		instructions: 'You are a test assistant.',
		structuredOutput: testJsonSchema,
		eventBus: bus,
	});
	return { runtime, bus };
}

/** Minimal successful generateText response with structured output. */
function makeGenerateSuccessWithOutput(output: unknown, text = 'OK') {
	return { ...makeGenerateSuccess(text), output };
}

/** Minimal successful streamText response with structured output. */
function makeStreamSuccessWithOutput(output: unknown, text = 'Hello') {
	return { ...makeStreamSuccess(text), output: Promise.resolve(output) };
}

/** Mock generateText response that triggers a tool call. */
function makeGenerateWithToolCall(toolCallId: string, toolName: string, input: unknown) {
	return {
		finishReason: 'tool-calls',
		usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
		response: {
			messages: [
				{
					role: 'assistant',
					content: [{ type: 'tool-call', toolCallId, toolName, args: input }],
				},
			],
		},
		toolCalls: [{ toolCallId, toolName, input }],
	};
}

/** Build an interruptible tool that suspends on first call and returns on resume. */
function makeInterruptibleTool(): BuiltTool {
	return {
		name: 'approve',
		description: 'Requires approval',
		inputSchema: z.object({ question: z.string() }),
		suspendSchema: z.object({ question: z.string() }),
		resumeSchema: z.object({ approved: z.boolean() }),
		handler: async (_input: unknown, ctx: unknown) => {
			const { suspend, resumeData } = ctx as InterruptibleToolContext;
			if (!resumeData) {
				return await suspend({ question: 'approve?' });
			}
			return { approved: true };
		},
	};
}

// ---------------------------------------------------------------------------
// execution counters
// ---------------------------------------------------------------------------

describe('AgentRuntime — execution counters', () => {
	beforeEach(() => {
		generateText.mockReset();
		streamText.mockReset();
	});

	it('counts one fresh generate turn and token usage', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());
		const counter = makeExecutionCounter();

		const { runtime } = createRuntime();
		await runtime.generate('hi', { executionCounter: counter });

		expect(counter.incrementMessageCount).toHaveBeenCalledTimes(1);
		expect(counter.incrementToolCallCount).not.toHaveBeenCalled();
		expect(counter.incrementTokenCount).toHaveBeenCalledWith(15);
	});

	it('counts one fresh stream turn and streamed token usage', async () => {
		streamText.mockReturnValue(makeStreamSuccess());
		const counter = makeExecutionCounter();

		const { runtime } = createRuntime();
		const result = await runtime.stream('hi', { executionCounter: counter });
		await collectChunks(result.stream);

		expect(counter.incrementMessageCount).toHaveBeenCalledTimes(1);
		expect(counter.incrementToolCallCount).not.toHaveBeenCalled();
		expect(counter.incrementTokenCount).toHaveBeenCalledWith(15);
	});

	it('counts provider-executed tool calls when surfaced by the model', async () => {
		generateText
			.mockResolvedValueOnce({
				...makeGenerateWithToolCall('tc-provider', 'openai.web_search', { query: 'n8n' }),
				toolCalls: [
					{
						toolCallId: 'tc-provider',
						toolName: 'openai.web_search',
						input: { query: 'n8n' },
						providerExecuted: true,
					},
				],
			})
			.mockResolvedValueOnce(makeGenerateSuccess('Done'));
		const counter = makeExecutionCounter();

		const { runtime } = createRuntime();
		await runtime.generate('search', { executionCounter: counter });

		expect(counter.incrementToolCallCount).toHaveBeenCalledTimes(1);
	});

	it('does not count a resumed suspended tool call as a new tool invocation', async () => {
		const suspendTool = makeInterruptibleTool();
		const counter = makeExecutionCounter();
		const { runtime } = createRuntimeWithTools([suspendTool], 1);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'approve', args: { question: 'continue?' } },
			]),
		);

		const first = await runtime.generate('needs approval', { executionCounter: counter });
		const { runId, toolCallId } = first.pendingSuspend![0];

		generateText.mockResolvedValueOnce(makeGenerateSuccess('approved'));
		await runtime.resume(
			'generate',
			{ approved: true },
			{ runId, toolCallId, executionCounter: counter },
		);

		expect(counter.incrementMessageCount).toHaveBeenCalledTimes(1);
		expect(counter.incrementToolCallCount).toHaveBeenCalledTimes(1);
		expect(counter.incrementTokenCount).toHaveBeenCalledTimes(2);
	});

	it('keeps delegate_subagent output usage per tool call without adding it to generate result usage', async () => {
		const delegateTool: BuiltTool = {
			name: DELEGATE_SUB_AGENT_TOOL_NAME,
			description: 'Delegate work',
			inputSchema: z.object({ value: z.string().optional() }),
			handler: async () =>
				await Promise.resolve({
					status: 'completed',
					answer: 'child answer',
					usage: { promptTokens: 3, completionTokens: 4, totalTokens: 7, cost: 0.01 },
				}),
		};
		const counter = makeExecutionCounter();
		const { runtime } = createRuntimeWithTools([delegateTool], 1);

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{
						toolCallId: 'tc-delegate',
						toolName: DELEGATE_SUB_AGENT_TOOL_NAME,
						args: { value: 'research' },
					},
				]),
			)
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const result = await runtime.generate('delegate', { executionCounter: counter });

		expect(result.usage).toMatchObject({
			promptTokens: 20,
			completionTokens: 10,
			totalTokens: 30,
		});
		expect(result.toolCalls?.[0]?.output).toEqual(
			expect.objectContaining({
				usage: { promptTokens: 3, completionTokens: 4, totalTokens: 7, cost: 0.01 },
			}),
		);
		expect(counter.incrementTokenCount).toHaveBeenCalledTimes(2);
		expect(counter.incrementTokenCount).toHaveBeenNthCalledWith(1, 15);
		expect(counter.incrementTokenCount).toHaveBeenNthCalledWith(2, 15);
	});

	it('does not roll normal tool output usage-like fields into generate result usage', async () => {
		const normalTool: BuiltTool = {
			name: 'normal_tool',
			description: 'Normal tool',
			inputSchema: z.object({ value: z.string().optional() }),
			handler: async () =>
				await Promise.resolve({
					usage: { promptTokens: 3, completionTokens: 4, totalTokens: 7 },
				}),
		};
		const { runtime } = createRuntimeWithTools([normalTool], 1);

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{ toolCallId: 'tc-normal', toolName: 'normal_tool', args: { value: 'run' } },
				]),
			)
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const result = await runtime.generate('use normal tool');

		expect(result.usage).toMatchObject({
			promptTokens: 20,
			completionTokens: 10,
			totalTokens: 30,
		});
	});

	it('keeps delegate_subagent output usage per stream tool result without adding it to finish usage', async () => {
		const delegateTool: BuiltTool = {
			name: DELEGATE_SUB_AGENT_TOOL_NAME,
			description: 'Delegate work',
			inputSchema: z.object({ value: z.string().optional() }),
			handler: async () =>
				await Promise.resolve({
					status: 'completed',
					answer: 'child answer',
					usage: { promptTokens: 3, completionTokens: 4, totalTokens: 7, cost: 0.01 },
				}),
		};
		const { runtime } = createRuntimeWithTools([delegateTool], 1);

		streamText
			.mockReturnValueOnce({
				fullStream: makeChunkStream([{ type: 'text-delta', textDelta: 'thinking...' }]),
				finishReason: Promise.resolve('tool-calls'),
				usage: Promise.resolve({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
				response: Promise.resolve({
					messages: [
						{
							role: 'assistant',
							content: [
								{
									type: 'tool-call',
									toolCallId: 'tc-delegate',
									toolName: DELEGATE_SUB_AGENT_TOOL_NAME,
									args: { value: 'research' },
								},
							],
						},
					],
				}),
				toolCalls: Promise.resolve([
					{
						toolCallId: 'tc-delegate',
						toolName: DELEGATE_SUB_AGENT_TOOL_NAME,
						input: { value: 'research' },
					},
				]),
			})
			.mockReturnValueOnce(makeStreamSuccess('done'));

		const result = await runtime.stream('delegate');
		const chunks = await collectChunks(result.stream);
		const finishChunks = chunks.filter((chunk) => chunk.type === 'finish');
		const finish = finishChunks[finishChunks.length - 1] as
			| (StreamChunk & { type: 'finish' })
			| undefined;
		const toolResult = chunks.find(
			(chunk) => chunk.type === 'tool-result' && chunk.toolName === DELEGATE_SUB_AGENT_TOOL_NAME,
		) as (StreamChunk & { type: 'tool-result' }) | undefined;

		expect(finish?.usage).toMatchObject({
			promptTokens: 20,
			completionTokens: 10,
			totalTokens: 30,
		});
		expect(toolResult?.output).toEqual(
			expect.objectContaining({
				usage: { promptTokens: 3, completionTokens: 4, totalTokens: 7, cost: 0.01 },
			}),
		);
	});
});

// ---------------------------------------------------------------------------
// generate() — graceful error contract
// ---------------------------------------------------------------------------

describe('AgentRuntime.generate() — graceful error contract', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('resolves (never rejects) when the LLM call throws', async () => {
		generateText.mockRejectedValue(new Error('API failure'));

		const { runtime } = createRuntime();
		await expect(runtime.generate('hello')).resolves.toBeDefined();
	});

	it('returns finishReason "error" when the LLM call throws', async () => {
		generateText.mockRejectedValue(new Error('API failure'));

		const { runtime } = createRuntime();
		const result = await runtime.generate('hello');

		expect(result.finishReason).toBe('error');
	});

	it('surfaces the original error in result.error when the LLM call throws', async () => {
		const cause = new Error('API failure');
		generateText.mockRejectedValue(cause);

		const { runtime } = createRuntime();
		const result = await runtime.generate('hello');

		expect(result.error).toBe(cause);
	});

	it('sets state to "failed" when the LLM call throws', async () => {
		generateText.mockRejectedValue(new Error('API failure'));

		const { runtime } = createRuntime();
		await runtime.generate('hello');

		expect(runtime.getState().status).toBe('failed');
	});

	it('emits AgentEvent.Error (not AgentEnd) when the LLM call throws', async () => {
		generateText.mockRejectedValue(new Error('API failure'));

		const { runtime, bus } = createRuntime();
		const errorEvents: unknown[] = [];
		const endEvents: unknown[] = [];
		bus.on(AgentEvent.Error, (d) => errorEvents.push(d));
		bus.on(AgentEvent.AgentEnd, (d) => endEvents.push(d));

		await runtime.generate('hello');

		expect(errorEvents.length).toBe(1);
		expect(endEvents.length).toBe(0);
	});

	it('does NOT emit AgentEvent.Error for abort — only sets cancelled state', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const { runtime, bus } = createRuntime();
		const errorEvents: unknown[] = [];
		bus.on(AgentEvent.Error, (d) => errorEvents.push(d));

		// Abort during AgentStart so the loop's first abort-check fires before generateText is called
		bus.on(AgentEvent.AgentStart, () => bus.abort());

		await runtime.generate('hello');

		expect(errorEvents.length).toBe(0);
		expect(runtime.getState().status).toBe('cancelled');
	});

	it('returns finishReason "error" and sets cancelled status on abort', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const { runtime, bus } = createRuntime();
		// Abort during AgentStart so the loop's first abort-check fires before generateText is called
		bus.on(AgentEvent.AgentStart, () => bus.abort());

		const result = await runtime.generate('hello');

		expect(result.finishReason).toBe('error');
		expect(runtime.getState().status).toBe('cancelled');
	});

	it('is reusable after an error — subsequent call with a good LLM response succeeds', async () => {
		generateText
			.mockRejectedValueOnce(new Error('transient error'))
			.mockResolvedValue(makeGenerateSuccess());

		const { runtime } = createRuntime();

		const first = await runtime.generate('hello');
		expect(first.finishReason).toBe('error');

		const second = await runtime.generate('hello');
		expect(second.finishReason).toBe('stop');
		expect(second.error).toBeUndefined();
	});

	it('returns an empty messages array (no partial data) when abort fires before the first LLM call', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess('first turn response'));

		const { runtime, bus } = createRuntime();
		bus.on(AgentEvent.AgentStart, () => bus.abort());

		const result = await runtime.generate('hello');
		// Abort fired before any LLM response was accumulated
		expect(result.finishReason).toBe('error');
		expect(result.messages).toEqual([]);
	});

	it('succeeds normally when there is no error', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess('Great answer'));

		const { runtime } = createRuntime();
		const result = await runtime.generate('hello');

		expect(result.finishReason).toBe('stop');
		expect(result.error).toBeUndefined();
		expect(result.messages.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// stream() — graceful error contract
// ---------------------------------------------------------------------------

describe('AgentRuntime.stream() — graceful error contract', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('resolves (never rejects) when the LLM stream throws', async () => {
		const streamError = new Error('stream broke');
		streamText.mockReturnValue({
			fullStream: makeErrorStream(streamError),
			finishReason: silentReject(streamError),
			usage: Promise.resolve(undefined),
			response: silentReject(streamError),
			toolCalls: Promise.resolve([]),
		});

		const { runtime } = createRuntime();
		await expect(runtime.stream('hello')).resolves.toBeDefined();
	});

	it('yields an error chunk when the LLM stream throws', async () => {
		const streamError = new Error('stream broke');
		streamText.mockReturnValue({
			fullStream: makeErrorStream(streamError),
			finishReason: silentReject(streamError),
			usage: Promise.resolve(undefined),
			response: silentReject(streamError),
			toolCalls: Promise.resolve([]),
		});

		const { runtime } = createRuntime();
		const { stream: readableStream } = await runtime.stream('hello');
		const chunks = await collectChunks(readableStream);

		const errorChunks = chunks.filter((c) => c.type === 'error');
		expect(errorChunks.length).toBeGreaterThan(0);
	});

	it('closes the stream cleanly (with a finish chunk) after an error', async () => {
		const streamError = new Error('stream broke');
		streamText.mockReturnValue({
			fullStream: makeErrorStream(streamError),
			finishReason: silentReject(streamError),
			usage: Promise.resolve(undefined),
			response: silentReject(streamError),
			toolCalls: Promise.resolve([]),
		});

		const { runtime } = createRuntime();
		const { stream: readableStream } = await runtime.stream('hello');
		const chunks = await collectChunks(readableStream);

		const finishChunks = chunks.filter((c) => c.type === 'finish');
		expect(finishChunks.length).toBeGreaterThan(0);

		const finish = finishChunks[finishChunks.length - 1] as StreamChunk & {
			type: 'finish';
			finishReason: string;
		};
		expect(finish.finishReason).toBe('error');
	});

	it('sets state to "failed" after a stream error', async () => {
		const streamError = new Error('stream broke');
		streamText.mockReturnValue({
			fullStream: makeErrorStream(streamError),
			finishReason: silentReject(streamError),
			usage: Promise.resolve(undefined),
			response: silentReject(streamError),
			toolCalls: Promise.resolve([]),
		});

		const { runtime } = createRuntime();
		const { stream: readableStream } = await runtime.stream('hello');
		await collectChunks(readableStream);

		expect(runtime.getState().status).toBe('failed');
	});

	it('yields error chunk and finishes cleanly on abort', async () => {
		streamText.mockReturnValue(makeStreamSuccess());

		const { runtime, bus } = createRuntime();
		bus.on(AgentEvent.TurnStart, () => bus.abort());

		const { stream: readableStream } = await runtime.stream('hello');
		const chunks = await collectChunks(readableStream);

		const errorChunks = chunks.filter((c) => c.type === 'error');
		expect(errorChunks.length).toBeGreaterThan(0);

		expect(runtime.getState().status).toBe('cancelled');
	});

	it('stream is reusable after an error', async () => {
		const streamError = new Error('transient');
		streamText
			.mockReturnValueOnce({
				fullStream: makeErrorStream(streamError),
				finishReason: silentReject(streamError),
				usage: Promise.resolve(undefined),
				response: silentReject(streamError),
				toolCalls: Promise.resolve([]),
			})
			.mockReturnValue(makeStreamSuccess('OK'));

		const { runtime } = createRuntime();

		const { stream: firstStream } = await runtime.stream('hello');
		const firstChunks = await collectChunks(firstStream);
		expect(firstChunks.some((c) => c.type === 'error')).toBe(true);

		const { stream: secondStream } = await runtime.stream('hello');
		const secondChunks = await collectChunks(secondStream);
		expect(secondChunks.some((c) => c.type === 'finish')).toBe(true);
		const finish = secondChunks.find((c) => c.type === 'finish') as StreamChunk & {
			type: 'finish';
			finishReason: string;
		};
		expect(finish.finishReason).toBe('stop');
	});

	it('never throws when consuming the stream after an error', async () => {
		const streamError = new Error('stream broke');
		streamText.mockReturnValue({
			fullStream: makeErrorStream(streamError),
			finishReason: silentReject(streamError),
			usage: Promise.resolve(undefined),
			response: silentReject(streamError),
			toolCalls: Promise.resolve([]),
		});

		const { runtime } = createRuntime();
		const { stream: readableStream } = await runtime.stream('hello');

		await expect(collectChunks(readableStream)).resolves.toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// resume() — graceful error contract
// ---------------------------------------------------------------------------

describe('AgentRuntime.resume() — graceful error contract', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects with an error when the runId is not found', async () => {
		const { runtime } = createRuntime();
		const streamPromise = runtime.resume(
			'stream',
			{ approved: true },
			{ runId: 'nonexistent-run-id', toolCallId: 'tc-1' },
		);
		await expect(streamPromise).rejects.toThrow(
			'No suspended run found for runId: nonexistent-run-id',
		);
	});
});

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

describe('AgentRuntime — state transitions on error', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('starts idle, then reflects running→failed after a generate error', async () => {
		const { runtime } = createRuntime();

		expect(runtime.getState().status).toBe('idle');

		generateText.mockRejectedValue(new Error('oops'));
		const runDone = runtime.generate('hi');

		await runDone;
		expect(runtime.getState().status).toBe('failed');
	});

	it('starts idle, then reflects running→cancelled on abort', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const { runtime, bus } = createRuntime();
		bus.on(AgentEvent.AgentStart, () => bus.abort());

		await runtime.generate('hi');
		expect(runtime.getState().status).toBe('cancelled');
	});

	it('transitions to success on a clean run', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const { runtime } = createRuntime();
		await runtime.generate('hi');

		expect(runtime.getState().status).toBe('success');
	});
});

// ---------------------------------------------------------------------------
// Concurrent tool execution
// ---------------------------------------------------------------------------

/** Create a simple non-interruptible mock tool. */
function makeMockTool(name: string, handler: (input: unknown) => Promise<unknown>): BuiltTool {
	return {
		name,
		description: `Mock tool ${name}`,
		inputSchema: z.object({ value: z.string().optional() }),
		handler: async (input) => await handler(input),
	};
}

/** Create an interruptible mock tool that suspends. */
function makeSuspendingTool(
	name: string,
	handler: (input: unknown, ctx: InterruptibleToolContext) => Promise<unknown>,
): BuiltTool {
	return {
		name,
		description: `Suspending tool ${name}`,
		inputSchema: z.object({ value: z.string().optional() }),
		suspendSchema: z.object({ reason: z.string() }),
		resumeSchema: z.object({ approved: z.boolean() }),
		handler: async (input, ctx) => await handler(input, ctx as InterruptibleToolContext),
	};
}

/** Build a runtime with tools and concurrency config. */
function createRuntimeWithTools(tools: BuiltTool[], concurrency: number, eventBus?: AgentEventBus) {
	const bus = eventBus ?? new AgentEventBus();
	const runtime = new AgentRuntime({
		name: 'test',
		model: 'openai/gpt-4o-mini',
		instructions: 'You are a test assistant.',
		tools,
		eventBus: bus,
		toolCallConcurrency: concurrency,
		checkpointStorage: 'memory',
	});
	return { runtime, bus };
}

/** Create a generateText response that triggers tool calls, then a follow-up stop. */
function makeGenerateWithToolCalls(
	toolCalls: Array<{ toolCallId: string; toolName: string; args: Record<string, unknown> }>,
) {
	return {
		finishReason: 'tool-calls',
		usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
		response: {
			messages: [
				{
					role: 'assistant',
					content: toolCalls.map((tc) => ({
						type: 'tool-call',
						toolCallId: tc.toolCallId,
						toolName: tc.toolName,
						args: tc.args,
					})),
				},
			],
		},
		toolCalls: toolCalls.map((tc) => ({
			toolCallId: tc.toolCallId,
			toolName: tc.toolName,
			input: tc.args,
		})),
	};
}

describe('AgentRuntime — deferred tool loading', () => {
	beforeEach(() => {
		generateText.mockReset();
		streamText.mockReset();
	});

	it('searches and loads deferred tools into the next generate iteration', async () => {
		const coreTool = makeMockTool('core_tool', async () => await Promise.resolve({ ok: true }));
		const deferredTool = makeMockTool(
			'deferred_capability',
			async () => await Promise.resolve({ ok: true }),
		);
		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
			tools: [coreTool],
			deferredTools: [deferredTool],
		});
		const counter = makeExecutionCounter();

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{
						toolCallId: 'tc-search',
						toolName: 'search_tools',
						args: { query: 'deferred capability' },
					},
				]),
			)
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{
						toolCallId: 'tc-load',
						toolName: 'load_tool',
						args: { toolName: 'deferred_capability' },
					},
				]),
			)
			.mockResolvedValueOnce(makeGenerateSuccess('ready'));

		const result = await runtime.generate('need the deferred capability', {
			executionCounter: counter,
		});

		expect(generateText).toHaveBeenCalledTimes(3);
		expect(counter.incrementMessageCount).toHaveBeenCalledTimes(1);
		expect(counter.incrementToolCallCount).toHaveBeenCalledTimes(2);
		expect(counter.incrementTokenCount).toHaveBeenCalledTimes(3);

		const searchCall = result.toolCalls?.find((toolCall) => toolCall.tool === 'search_tools');
		expect(searchCall?.output).toEqual({
			results: [
				{
					name: 'deferred_capability',
					description: 'Mock tool deferred_capability',
					loaded: false,
				},
			],
		});

		const loadCall = result.toolCalls?.find((toolCall) => toolCall.tool === 'load_tool');
		expect(loadCall?.output).toEqual({
			status: 'loaded',
			toolName: 'deferred_capability',
			tool: {
				name: 'deferred_capability',
				description: 'Mock tool deferred_capability',
				loaded: true,
			},
			message: 'Tool "deferred_capability" is loaded and will be available on the next model turn.',
		});

		const generateTextCalls = generateText.mock.calls as Array<
			[{ tools: Record<string, unknown> }]
		>;
		const firstCall = generateTextCalls[0][0];
		const firstTools = Object.keys(firstCall.tools);
		expect(firstTools).toEqual(expect.arrayContaining(['core_tool', 'search_tools', 'load_tool']));
		expect(firstTools).not.toContain('deferred_capability');

		const secondTools = Object.keys(generateTextCalls[1][0].tools);
		expect(secondTools).toEqual(expect.arrayContaining(['core_tool', 'search_tools', 'load_tool']));
		expect(secondTools).not.toContain('deferred_capability');

		const thirdTools = Object.keys(generateTextCalls[2][0].tools);
		expect(thirdTools).toEqual(
			expect.arrayContaining(['core_tool', 'search_tools', 'load_tool', 'deferred_capability']),
		);
	});

	it('does not leak loaded deferred tools into the next generate run', async () => {
		const coreTool = makeMockTool('core_tool', async () => await Promise.resolve({ ok: true }));
		const deferredTool = makeMockTool(
			'deferred_capability',
			async () => await Promise.resolve({ ok: true }),
		);
		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
			tools: [coreTool],
			deferredTools: [deferredTool],
		});

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{
						toolCallId: 'tc-load',
						toolName: 'load_tool',
						args: { toolName: 'deferred_capability' },
					},
				]),
			)
			.mockResolvedValueOnce(makeGenerateSuccess('first done'));

		await runtime.generate('load the deferred capability');

		generateText.mockClear();
		generateText.mockResolvedValueOnce(makeGenerateSuccess('second done'));

		await runtime.generate('start a fresh run');

		const generateTextCalls = generateText.mock.calls as Array<
			[{ tools: Record<string, unknown> }]
		>;
		const freshRunTools = Object.keys(generateTextCalls[0][0].tools);
		expect(freshRunTools).toEqual(
			expect.arrayContaining(['core_tool', 'search_tools', 'load_tool']),
		);
		expect(freshRunTools).not.toContain('deferred_capability');
	});

	it('resumes a suspended deferred tool after it has been loaded', async () => {
		const deferredTool = makeSuspendingTool('deferred_approval', async (input, ctx) => {
			if (!ctx.resumeData) {
				return await ctx.suspend({ reason: 'approve deferred action?' });
			}

			const resumeData = ctx.resumeData as { approved: boolean };
			return {
				approved: resumeData.approved,
				value: (input as { value?: string }).value,
			};
		});

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
			deferredTools: [deferredTool],
			checkpointStorage: 'memory',
		});

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{
						toolCallId: 'tc-load',
						toolName: 'load_tool',
						args: { toolName: 'deferred_approval' },
					},
				]),
			)
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{
						toolCallId: 'tc-deferred',
						toolName: 'deferred_approval',
						args: { value: 'needs approval' },
					},
				]),
			);

		const firstResult = await runtime.generate('load and run the deferred approval tool');

		expect(firstResult.finishReason).toBe('tool-calls');
		expect(firstResult.pendingSuspend).toHaveLength(1);
		expect(firstResult.pendingSuspend![0].toolName).toBe('deferred_approval');

		generateText.mockResolvedValueOnce(makeGenerateSuccess('approved'));

		const resumeResult = await runtime.resume(
			'generate',
			{ approved: true },
			{
				runId: firstResult.pendingSuspend![0].runId,
				toolCallId: firstResult.pendingSuspend![0].toolCallId,
			},
		);

		expect(resumeResult.finishReason).toBe('stop');
		expect(resumeResult.toolCalls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					tool: 'deferred_approval',
					output: { approved: true, value: 'needs approval' },
				}),
			]),
		);
	});
});

describe('AgentRuntime — concurrent tool execution', () => {
	beforeEach(() => {
		generateText.mockReset();
		streamText.mockReset();
	});

	it('keeps abort signals scoped to overlapping generate runs', async () => {
		let firstModelSignal: AbortSignal | undefined;
		let secondModelSignal: AbortSignal | undefined;
		let firstToolSignal: AbortSignal | undefined;
		let resolveFirstModel!: (value: unknown) => void;
		const firstModel = new Promise((resolve) => {
			resolveFirstModel = resolve;
		});
		let firstModelCalled!: () => void;
		const waitForFirstModelCall = new Promise<void>((resolve) => {
			firstModelCalled = resolve;
		});

		const signalTool: BuiltTool = {
			name: 'signal_tool',
			description: 'Captures the run signal',
			inputSchema: z.object({ value: z.string().optional() }),
			handler: async (_input, ctx) => {
				firstToolSignal = (ctx as ToolContext).abortSignal;
				return await Promise.resolve({ done: true });
			},
		};
		const { runtime } = createRuntimeWithTools([signalTool], 1);

		generateText
			.mockImplementationOnce(async (options: { abortSignal?: AbortSignal }) => {
				firstModelSignal = options.abortSignal;
				firstModelCalled();
				return await firstModel;
			})
			.mockImplementationOnce(async (options: { abortSignal?: AbortSignal }) => {
				secondModelSignal = options.abortSignal;
				return await Promise.resolve(makeGenerateSuccess('second done'));
			})
			.mockResolvedValueOnce(makeGenerateSuccess('first done'));

		const firstRun = runtime.generate('first');
		await waitForFirstModelCall;

		const secondRun = runtime.generate('second');
		await secondRun;

		resolveFirstModel(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'signal_tool', args: { value: 'first' } },
			]),
		);
		await firstRun;

		expect(firstToolSignal).toBe(firstModelSignal);
		expect(firstToolSignal).not.toBe(secondModelSignal);
	});

	it('runs tools concurrently when concurrency > 1', async () => {
		let peakConcurrency = 0;
		let activeConcurrency = 0;

		const slowTool = makeMockTool('slow_tool', async () => {
			activeConcurrency++;
			peakConcurrency = Math.max(peakConcurrency, activeConcurrency);
			await new Promise((r) => setTimeout(r, 50));
			activeConcurrency--;
			return { done: true };
		});

		const { runtime } = createRuntimeWithTools([slowTool], Infinity);

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{ toolCallId: 'tc-1', toolName: 'slow_tool', args: { value: 'a' } },
					{ toolCallId: 'tc-2', toolName: 'slow_tool', args: { value: 'b' } },
					{ toolCallId: 'tc-3', toolName: 'slow_tool', args: { value: 'c' } },
				]),
			)
			.mockResolvedValueOnce(makeGenerateSuccess('Done'));

		const result = await runtime.generate('run tools');

		expect(result.finishReason).toBe('stop');
		expect(peakConcurrency).toBe(3);
	});

	it('suspensions stop later batches and save unexecuted tools as pending', async () => {
		const executedTools: string[] = [];

		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			executedTools.push('suspend_tool');
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const normalTool = makeMockTool('normal_tool', async () => {
			executedTools.push('normal_tool');
			return await Promise.resolve({ done: true });
		});

		const { runtime } = createRuntimeWithTools([suspendTool, normalTool], 2);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'x' } },
				{ toolCallId: 'tc-2', toolName: 'normal_tool', args: { value: 'y' } },
				{ toolCallId: 'tc-3', toolName: 'normal_tool', args: { value: 'z' } },
			]),
		);

		const result = await runtime.generate('run tools');

		// Batch 1 (tc-1 + tc-2) runs, but batch 2 (tc-3) is skipped because batch 1 had a suspension
		expect(executedTools).toContain('suspend_tool');
		expect(executedTools.filter((t) => t === 'normal_tool').length).toBe(1);
		expect(result.finishReason).toBe('tool-calls');

		// tc-1 is suspended, tc-3 is saved as unexecuted pending
		expect(result.pendingSuspend).toBeDefined();
		expect(result.pendingSuspend!.length).toBe(1);
		expect(result.pendingSuspend![0].toolCallId).toBe('tc-1');

		// Verify tc-3 is in the persisted state as a pending tool call (without suspendPayload)
		const state = runtime.getState();
		expect(state.pendingToolCalls['tc-3']).toBeDefined();
		expect(state.pendingToolCalls['tc-3'].suspended).toBe(false);
	});

	it('pendingSuspend is an array of all suspended tools with preserved payloads', async () => {
		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const { runtime } = createRuntimeWithTools([suspendTool], Infinity);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'a' } },
				{ toolCallId: 'tc-2', toolName: 'suspend_tool', args: { value: 'b' } },
			]),
		);

		const result = await runtime.generate('run tools');

		expect(result.pendingSuspend).toBeDefined();
		expect(result.pendingSuspend!.length).toBe(2);

		const ids = result.pendingSuspend!.map((s) => s.toolCallId);
		expect(ids).toContain('tc-1');
		expect(ids).toContain('tc-2');

		for (const s of result.pendingSuspend!) {
			expect(s.suspendPayload).toEqual({ reason: 'needs approval' });
			expect(s.runId).toBeTruthy();
			expect(s.toolName).toBe('suspend_tool');
		}
	});

	it('resume returns leftover suspends after resolving one', async () => {
		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			if (ctx.resumeData) return { approved: true };
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const { runtime } = createRuntimeWithTools([suspendTool], Infinity);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'a' } },
				{ toolCallId: 'tc-2', toolName: 'suspend_tool', args: { value: 'b' } },
			]),
		);

		const first = await runtime.generate('run tools');
		expect(first.pendingSuspend!.length).toBe(2);

		const { runId } = first.pendingSuspend![0];

		// Resume tc-1 — concurrent resume doesn't call generateText when pending tools remain
		const resumed = await runtime.resume(
			'generate',
			{ approved: true },
			{ runId, toolCallId: 'tc-1' },
		);

		// tc-2 should still be pending
		expect(resumed.pendingSuspend).toBeDefined();
		expect(resumed.pendingSuspend!.length).toBe(1);
		expect(resumed.pendingSuspend![0].toolCallId).toBe('tc-2');
		// runId must not change across suspend/resume cycles
		expect(resumed.pendingSuspend![0].runId).toBe(runId);
	});

	it('already-suspended tools are NOT re-executed on resume', async () => {
		let executionCount = 0;

		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			executionCount++;
			if (ctx.resumeData) return { approved: true };
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const { runtime } = createRuntimeWithTools([suspendTool], Infinity);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'a' } },
				{ toolCallId: 'tc-2', toolName: 'suspend_tool', args: { value: 'b' } },
			]),
		);

		const first = await runtime.generate('run tools');
		expect(executionCount).toBe(2); // both executed initially

		const { runId } = first.pendingSuspend![0];

		// Resume tc-1 — only tc-1 should re-execute, not tc-2
		generateText.mockResolvedValueOnce(makeGenerateSuccess('After resume'));
		await runtime.resume('generate', { approved: true }, { runId, toolCallId: 'tc-1' });

		expect(executionCount).toBe(3); // only tc-1 re-executed (2 initial + 1 resume)
	});

	it('after all suspends resolved, LLM loop continues', async () => {
		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			if (ctx.resumeData) return { approved: true };
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const { runtime } = createRuntimeWithTools([suspendTool], Infinity);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'a' } },
				{ toolCallId: 'tc-2', toolName: 'suspend_tool', args: { value: 'b' } },
			]),
		);

		const first = await runtime.generate('run tools');
		const { runId } = first.pendingSuspend![0];

		// Resume tc-1 — tc-2 still pending, so no LLM call
		const second = await runtime.resume(
			'generate',
			{ approved: true },
			{ runId, toolCallId: 'tc-1' },
		);
		expect(second.pendingSuspend!.length).toBe(1);

		// runId must stay the same across suspend/resume cycles
		const runId2 = second.pendingSuspend![0].runId;
		expect(runId2).toBe(runId);

		// Resume tc-2 — no more pending, LLM loop should continue
		generateText.mockResolvedValueOnce(makeGenerateSuccess('all done'));
		const third = await runtime.resume(
			'generate',
			{ approved: true },
			{ runId: runId2, toolCallId: 'tc-2' },
		);

		expect(third.pendingSuspend).toBeUndefined();
		expect(third.finishReason).toBe('stop');
	});

	it('cancels a suspended tool before resume validation and adds the user message', async () => {
		const handler = vi.fn(async (_input, ctx: InterruptibleToolContext) => {
			if (ctx.resumeData) return { approved: true };
			return await ctx.suspend({ reason: 'needs approval' });
		});
		const suspendTool = makeSuspendingTool('suspend_tool', handler);
		const receivedMessages: unknown[] = [];

		const { runtime } = createRuntimeWithTools([suspendTool], Infinity);
		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'a' } },
			]),
		);

		const first = await runtime.generate('run tools');
		const { runId, toolCallId } = first.pendingSuspend![0];
		generateText.mockImplementationOnce(async ({ messages }: { messages: unknown[] }) => {
			receivedMessages.push(...messages);
			return await Promise.resolve(makeGenerateSuccess('Cancelled'));
		});

		const result = await runtime.resume('generate', createCancellation('Do not run this tool'), {
			runId,
			toolCallId,
		});

		expect(result.finishReason).toBe('stop');
		expect(handler).toHaveBeenCalledTimes(1);
		expect(result.toolCalls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					tool: 'suspend_tool',
					output: '[Tool call cancelled. User said: "Do not run this tool"]',
					canceled: true,
				}),
			]),
		);
		expect(receivedMessages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					role: 'user',
					content: expect.arrayContaining([
						expect.objectContaining({ type: 'text', text: 'Do not run this tool' }),
					]),
				}),
			]),
		);
	});

	it('streams cancellation as a normal tool result on resume', async () => {
		const handler = vi.fn(async (_input, ctx: InterruptibleToolContext) => {
			if (ctx.resumeData) return { approved: true };
			return await ctx.suspend({ reason: 'needs approval' });
		});
		const suspendTool = makeSuspendingTool('suspend_tool', handler);

		const { runtime } = createRuntimeWithTools([suspendTool], Infinity);
		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'a' } },
			]),
		);

		const first = await runtime.generate('run tools');
		const { runId, toolCallId } = first.pendingSuspend![0];
		streamText.mockReturnValueOnce(makeStreamSuccess('Cancelled'));

		const resumed = await runtime.resume('stream', createCancellation('Stop this action'), {
			runId,
			toolCallId,
		});
		const chunks = await collectChunks(resumed.stream as ReadableStream<unknown>);

		expect(handler).toHaveBeenCalledTimes(1);
		expect(chunks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'tool-result',
					toolCallId,
					toolName: 'suspend_tool',
					output: '[Tool call cancelled. User said: "Stop this action"]',
					canceled: true,
				}),
			]),
		);
	});

	it('streams skipped sibling tool results when cancelling one of multiple suspensions', async () => {
		const handler = vi.fn(async (_input, ctx: InterruptibleToolContext) => {
			if (ctx.resumeData) return { approved: true };
			return await ctx.suspend({ reason: 'needs approval' });
		});
		const suspendTool = makeSuspendingTool('suspend_tool', handler);

		const { runtime } = createRuntimeWithTools([suspendTool], Infinity);
		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'a' } },
				{ toolCallId: 'tc-2', toolName: 'suspend_tool', args: { value: 'b' } },
			]),
		);

		const first = await runtime.generate('run tools');
		const { runId } = first.pendingSuspend![0];
		streamText.mockReturnValueOnce(makeStreamSuccess('Cancelled'));

		const resumed = await runtime.resume('stream', createCancellation('Stop this action'), {
			runId,
			toolCallId: 'tc-1',
		});
		const chunks = await collectChunks(resumed.stream as ReadableStream<unknown>);

		expect(handler).toHaveBeenCalledTimes(2);
		expect(chunks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'tool-result',
					toolCallId: 'tc-1',
					toolName: 'suspend_tool',
					output: '[Tool call cancelled. User said: "Stop this action"]',
					canceled: true,
				}),
				expect.objectContaining({
					type: 'tool-result',
					toolCallId: 'tc-2',
					toolName: 'suspend_tool',
					output: '[Skipped: a sibling tool call was cancelled]',
					canceled: true,
				}),
			]),
		);
	});

	it('bounded concurrency (2) batches respects the limit', async () => {
		const batchSizes: number[] = [];
		let activeConcurrency = 0;

		const slowTool = makeMockTool('slow_tool', async () => {
			activeConcurrency++;
			batchSizes.push(activeConcurrency);
			await new Promise((r) => setTimeout(r, 30));
			activeConcurrency--;
			return { done: true };
		});

		const { runtime } = createRuntimeWithTools([slowTool], 2);

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{ toolCallId: 'tc-1', toolName: 'slow_tool', args: { value: 'a' } },
					{ toolCallId: 'tc-2', toolName: 'slow_tool', args: { value: 'b' } },
					{ toolCallId: 'tc-3', toolName: 'slow_tool', args: { value: 'c' } },
				]),
			)
			.mockResolvedValueOnce(makeGenerateSuccess('Done'));

		const result = await runtime.generate('run tools');

		expect(result.finishReason).toBe('stop');
		// Peak concurrency within any batch should never exceed 2
		expect(Math.max(...batchSizes)).toBeLessThanOrEqual(2);
	});

	it('runs consecutive delegate_subagent calls in parallel up to maxChildren when toolCallConcurrency is 1', async () => {
		let activeDelegations = 0;
		let peakDelegations = 0;

		const runSubAgent: DelegateSubAgentRunner = async (request) => {
			activeDelegations++;
			peakDelegations = Math.max(peakDelegations, activeDelegations);
			await new Promise((resolve) => setTimeout(resolve, 30));
			activeDelegations--;
			return {
				status: 'completed',
				taskPath: request.taskPath,
				answer: `done:${request.taskName}`,
			};
		};

		const delegateTool = createDelegateSubAgentTool({
			policy: { maxChildren: 5 },
			runSubAgent,
		});
		const { runtime } = createRuntimeWithTools([delegateTool], 1);

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls(
					Array.from({ length: 5 }, (_, index) => ({
						toolCallId: `tc-${index + 1}`,
						toolName: DELEGATE_SUB_AGENT_TOOL_NAME,
						args: {
							subAgentId: 'inline',
							taskName: `ping_${index + 1}`,
							goal: 'Reply with ping.',
						},
					})),
				),
			)
			.mockResolvedValueOnce(makeGenerateSuccess('Done'));

		const result = await runtime.generate('spawn 5 sub agents');

		expect(result.finishReason).toBe('stop');
		expect(peakDelegations).toBe(5);
	});

	it('batches delegate_subagent parallelism by maxChildren when more calls are issued than the parallel limit', async () => {
		let activeDelegations = 0;
		let peakDelegations = 0;

		const runSubAgent: DelegateSubAgentRunner = async (request) => {
			activeDelegations++;
			peakDelegations = Math.max(peakDelegations, activeDelegations);
			await new Promise((resolve) => setTimeout(resolve, 30));
			activeDelegations--;
			return {
				status: 'completed',
				taskPath: request.taskPath,
				answer: `done:${request.taskName}`,
			};
		};

		const delegateTool = createDelegateSubAgentTool({
			policy: { maxChildren: 2 },
			runSubAgent,
		});
		const { runtime } = createRuntimeWithTools([delegateTool], 1);

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls(
					Array.from({ length: 4 }, (_, index) => ({
						toolCallId: `tc-${index + 1}`,
						toolName: DELEGATE_SUB_AGENT_TOOL_NAME,
						args: {
							subAgentId: 'inline',
							taskName: `ping_${index + 1}`,
							goal: 'Reply with ping.',
						},
					})),
				),
			)
			.mockResolvedValueOnce(makeGenerateSuccess('Done'));

		const result = await runtime.generate('spawn 4 sub agents');

		expect(result.finishReason).toBe('stop');
		expect(peakDelegations).toBe(2);
		expect(result.toolCalls).toHaveLength(4);
		for (const entry of result.toolCalls ?? []) {
			expect(JSON.stringify(entry.output)).toContain('"status":"completed"');
		}
	});

	it('fails fast when delegate metadata has an invalid maxChildren batch size', async () => {
		const malformedDelegateTool: BuiltTool = {
			name: DELEGATE_SUB_AGENT_TOOL_NAME,
			description: 'Malformed delegate tool',
			inputSchema: z.object({}),
			handler: async () => await Promise.resolve({ done: true }),
			metadata: {
				[INLINE_DELEGATE_SUB_AGENT_TOOL_METADATA_KEY]: {
					policy: { maxChildren: 0 },
				},
			},
		};
		const { runtime } = createRuntimeWithTools([malformedDelegateTool], 1);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{
					toolCallId: 'tc-1',
					toolName: DELEGATE_SUB_AGENT_TOOL_NAME,
					args: {
						subAgentId: 'inline',
						taskName: 'ping',
						goal: 'Reply with ping.',
					},
				},
			]),
		);

		const result = await runtime.generate('spawn sub agent');

		expect(result.finishReason).toBe('error');
		expect(result.error).toBeInstanceOf(Error);
		if (result.error instanceof Error) {
			expect(result.error.message).toBe('Invalid tool-call batch size for delegate_subagent: 0');
		}
	});

	it('keeps non-delegate tools sequential when toolCallConcurrency is 1', async () => {
		let active = 0;
		let peak = 0;

		const slowTool = makeMockTool('slow_tool', async () => {
			active++;
			peak = Math.max(peak, active);
			await new Promise((resolve) => setTimeout(resolve, 30));
			active--;
			return { done: true };
		});

		const { runtime } = createRuntimeWithTools([slowTool], 1);

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{ toolCallId: 'tc-1', toolName: 'slow_tool', args: { value: 'a' } },
					{ toolCallId: 'tc-2', toolName: 'slow_tool', args: { value: 'b' } },
				]),
			)
			.mockResolvedValueOnce(makeGenerateSuccess('Done'));

		const result = await runtime.generate('run tools');

		expect(result.finishReason).toBe('stop');
		expect(peak).toBe(1);
	});

	it('tool error becomes LLM-visible message — loop continues and slow tool completes', async () => {
		const completedTools: string[] = [];

		const errorTool = makeMockTool('error_tool', async () => {
			return await Promise.reject(new Error('tool failed'));
		});

		const slowTool = makeMockTool('slow_tool', async () => {
			await new Promise((r) => setTimeout(r, 50));
			completedTools.push('slow_tool');
			return { done: true };
		});

		const { runtime } = createRuntimeWithTools([errorTool, slowTool], Infinity);

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{ toolCallId: 'tc-1', toolName: 'error_tool', args: {} },
					{ toolCallId: 'tc-2', toolName: 'slow_tool', args: {} },
				]),
			)
			// The LLM is called again after seeing the error tool result
			.mockResolvedValueOnce(makeGenerateSuccess('Handled the error'));

		const result = await runtime.generate('run tools');

		// Loop continues after tool error — LLM sees the error and responds
		expect(result.finishReason).toBe('stop');
		// allSettled waits for all in-flight tools before returning
		expect(completedTools).toContain('slow_tool');
	});

	it('sequential mode (concurrency=1) wraps single suspension in an array', async () => {
		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const { runtime } = createRuntimeWithTools([suspendTool], 1);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'a' } },
			]),
		);

		const result = await runtime.generate('run tools');

		expect(result.pendingSuspend).toBeDefined();
		expect(Array.isArray(result.pendingSuspend)).toBe(true);
		expect(result.pendingSuspend!.length).toBe(1);
		expect(result.pendingSuspend![0].toolCallId).toBe('tc-1');
	});

	it('tool error produces an error tool-result in the message list and loop continues', async () => {
		type ToolOutputContent = {
			type: string;
			output?: { type: string; value?: unknown };
		};
		type ToolMessage = { role: string; content: ToolOutputContent[] };
		const receivedMessages: unknown[] = [];

		const errorTool = makeMockTool('error_tool', async () => {
			return await Promise.reject(new Error('intentional failure'));
		});

		const { runtime } = createRuntimeWithTools([errorTool], 1);

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{ toolCallId: 'tc-1', toolName: 'error_tool', args: { value: 'x' } },
				]),
			)
			.mockImplementationOnce(async ({ messages }: { messages: unknown[] }) => {
				receivedMessages.push(...messages);
				return await Promise.resolve(makeGenerateSuccess('I saw the error'));
			});

		const result = await runtime.generate('run tools');

		expect(result.finishReason).toBe('stop');
		// LLM was called a second time — it saw the error tool result and continued
		expect(generateText).toHaveBeenCalledTimes(2);
		// The second LLM call received a tool message whose output carries the error description.
		const toolMsg = receivedMessages.find(
			(m): m is ToolMessage =>
				typeof m === 'object' && m !== null && (m as ToolMessage).role === 'tool',
		);
		expect(toolMsg).toBeDefined();
		const hasErrorOutput = toolMsg!.content.some(
			(c) => c.output?.type === 'error-text' || c.output?.type === 'error-json',
		);
		expect(hasErrorOutput).toBe(true);
	});

	it('mixed success+error batch — successful results are preserved', async () => {
		const successTool = makeMockTool('success_tool', async () => {
			return await Promise.resolve({ value: 42 });
		});
		const errorTool = makeMockTool('error_tool', async () => {
			return await Promise.reject(new Error('tool failed'));
		});

		const { runtime } = createRuntimeWithTools([successTool, errorTool], Infinity);

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{ toolCallId: 'tc-1', toolName: 'success_tool', args: {} },
					{ toolCallId: 'tc-2', toolName: 'error_tool', args: {} },
				]),
			)
			.mockResolvedValueOnce(makeGenerateSuccess('Done'));

		const result = await runtime.generate('run tools');

		expect(result.finishReason).toBe('stop');
		// Successful tool call is recorded in toolCalls summary
		expect(result.toolCalls).toBeDefined();
		expect(result.toolCalls!.some((tc) => tc.tool === 'success_tool')).toBe(true);
	});

	it('toolName is stored in pendingToolCalls and accessible without findToolName', async () => {
		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const { runtime } = createRuntimeWithTools([suspendTool], 1);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'a' } },
			]),
		);

		await runtime.generate('run tools');

		const state = runtime.getState();
		expect(state.pendingToolCalls['tc-1']).toBeDefined();
		expect(state.pendingToolCalls['tc-1'].toolName).toBe('suspend_tool');
	});

	it('unexecuted pending tools also carry toolName', async () => {
		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			return await ctx.suspend({ reason: 'needs approval' });
		});
		const normalTool = makeMockTool('normal_tool', async () => {
			return await Promise.resolve({ done: true });
		});

		// concurrency=1 so tc-1 runs first (suspends), tc-2 is left unexecuted
		const { runtime } = createRuntimeWithTools([suspendTool, normalTool], 1);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'x' } },
				{ toolCallId: 'tc-2', toolName: 'normal_tool', args: { value: 'y' } },
			]),
		);

		await runtime.generate('run tools');

		const state = runtime.getState();
		expect(state.pendingToolCalls['tc-2']).toBeDefined();
		expect(state.pendingToolCalls['tc-2'].toolName).toBe('normal_tool');
		expect(state.pendingToolCalls['tc-2'].suspended).toBe(false);
	});

	it('tool-call-suspended chunks include resumeSchema when tool defines one', async () => {
		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const { runtime } = createRuntimeWithTools([suspendTool], 1);

		streamText.mockReturnValue({
			fullStream: makeChunkStream([{ type: 'text-delta', textDelta: 'thinking...' }]),
			finishReason: Promise.resolve('tool-calls'),
			usage: Promise.resolve({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
			response: Promise.resolve({
				messages: [
					{
						role: 'assistant',
						content: [
							{
								type: 'tool-call',
								toolCallId: 'tc-1',
								toolName: 'suspend_tool',
								args: { value: 'a' },
							},
						],
					},
				],
			}),
			toolCalls: Promise.resolve([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', input: { value: 'a' } },
			]),
		});

		const { stream: readableStream } = await runtime.stream('run tools');
		const chunks = await collectChunks(readableStream);

		const suspendedChunks = chunks.filter((c) => c.type === 'tool-call-suspended') as Array<
			StreamChunk & { type: 'tool-call-suspended'; resumeSchema?: unknown }
		>;
		expect(suspendedChunks.length).toBe(1);
		// resumeSchema should be a JSON Schema object (from zod-to-json-schema conversion)
		expect(suspendedChunks[0].resumeSchema).toBeDefined();
		expect(typeof suspendedChunks[0].resumeSchema).toBe('object');
	});

	it('pendingSuspend entries include resumeSchema when tool defines one', async () => {
		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const { runtime } = createRuntimeWithTools([suspendTool], 1);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'a' } },
			]),
		);

		const result = await runtime.generate('run tools');

		expect(result.pendingSuspend).toBeDefined();
		expect(result.pendingSuspend![0].resumeSchema).toBeDefined();
		expect(typeof result.pendingSuspend![0].resumeSchema).toBe('object');
	});

	it('stream mode emits multiple tool-call-suspended chunks for concurrent suspensions', async () => {
		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const { runtime } = createRuntimeWithTools([suspendTool], Infinity);

		streamText.mockReturnValue({
			fullStream: makeChunkStream([{ type: 'text-delta', textDelta: 'thinking...' }]),
			finishReason: Promise.resolve('tool-calls'),
			usage: Promise.resolve({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
			response: Promise.resolve({
				messages: [
					{
						role: 'assistant',
						content: [
							{
								type: 'tool-call',
								toolCallId: 'tc-1',
								toolName: 'suspend_tool',
								args: { value: 'a' },
							},
							{
								type: 'tool-call',
								toolCallId: 'tc-2',
								toolName: 'suspend_tool',
								args: { value: 'b' },
							},
						],
					},
				],
			}),
			toolCalls: Promise.resolve([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', input: { value: 'a' } },
				{ toolCallId: 'tc-2', toolName: 'suspend_tool', input: { value: 'b' } },
			]),
		});

		const { stream: readableStream } = await runtime.stream('run tools');
		const chunks = await collectChunks(readableStream);

		const suspendedChunks = chunks.filter((c) => c.type === 'tool-call-suspended');
		expect(suspendedChunks.length).toBe(2);

		const finishChunks = chunks.filter((c) => c.type === 'finish');
		expect(finishChunks.length).toBe(1);
		expect((finishChunks[0] as StreamChunk & { type: 'finish' }).finishReason).toBe('tool-calls');
	});

	it('bridges subagent lifecycle events from tool context into stream chunks', async () => {
		const lifecycleTool: BuiltTool = {
			name: 'delegate_subagent',
			description: 'Delegate work',
			inputSchema: z.object({ value: z.string().optional() }),
			handler: async (_input, ctx) => {
				const toolCtx = ctx as ToolContext;
				const base = {
					taskName: 'Research API',
					taskPath: '/root/research_api',
					...(toolCtx.runId !== undefined ? { parentRunId: toolCtx.runId } : {}),
					...(toolCtx.toolCallId !== undefined ? { parentToolCallId: toolCtx.toolCallId } : {}),
				};
				toolCtx.emitEvent?.({
					type: AgentEvent.SubAgentStarted,
					...base,
					startedAt: 100,
				});
				toolCtx.emitEvent?.({
					type: AgentEvent.SubAgentCompleted,
					...base,
					status: 'completed',
					startedAt: 100,
					finishedAt: 200,
					durationMs: 100,
					runId: 'child-run-1',
					finishReason: 'stop',
				});
				return await Promise.resolve({ ok: true });
			},
		};
		const { runtime } = createRuntimeWithTools([lifecycleTool], 1);

		streamText
			.mockReturnValueOnce({
				fullStream: makeChunkStream([{ type: 'text-delta', textDelta: 'thinking...' }]),
				finishReason: Promise.resolve('tool-calls'),
				usage: Promise.resolve({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
				response: Promise.resolve({
					messages: [
						{
							role: 'assistant',
							content: [
								{
									type: 'tool-call',
									toolCallId: 'tc-1',
									toolName: 'delegate_subagent',
									args: { value: 'a' },
								},
							],
						},
					],
				}),
				toolCalls: Promise.resolve([
					{ toolCallId: 'tc-1', toolName: 'delegate_subagent', input: { value: 'a' } },
				]),
			})
			.mockReturnValueOnce(makeStreamSuccess('done'));

		const { stream: readableStream } = await runtime.stream('run tools');
		const chunks = await collectChunks(readableStream);

		expect(chunks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: 'subagent-started', taskPath: '/root/research_api' }),
				expect.objectContaining({
					type: 'subagent-completed',
					status: 'completed',
					runId: 'child-run-1',
				}),
			]),
		);
	});
});

// Structured output — generate()
// ---------------------------------------------------------------------------

describe('AgentRuntime.generate() — structured output', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns structuredOutput when schema is configured', async () => {
		const expected = { answer: 'Paris', score: 0.95 };
		generateText.mockResolvedValue(makeGenerateSuccessWithOutput(expected));

		const { runtime } = createStructuredRuntime();
		const result = await runtime.generate('What is the capital of France?');

		expect(result.structuredOutput).toEqual(expected);
		expect(result.finishReason).toBe('stop');
	});

	it('does not include structuredOutput when no schema is configured', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess('Just text'));

		const { runtime } = createRuntime();
		const result = await runtime.generate('hello');

		expect(result.structuredOutput).toBeUndefined();
	});

	it('passes the output spec to generateText when schema is configured', async () => {
		generateText.mockResolvedValue(makeGenerateSuccessWithOutput({ answer: 'test', score: 1 }));

		const { runtime } = createStructuredRuntime();
		await runtime.generate('hello');

		const callArgs = (generateText.mock.calls[0] as [unknown, unknown])[0] as Record<
			string,
			unknown
		>;
		expect(callArgs.output).toBeDefined();
		expect(callArgs.output).toEqual(
			expect.objectContaining({ _type: 'object', schema: testSchema }),
		);
	});

	it('does not pass the output spec to generateText when no schema is configured', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const { runtime } = createRuntime();
		await runtime.generate('hello');

		const callArgs = (generateText.mock.calls[0] as [unknown, unknown])[0] as Record<
			string,
			unknown
		>;
		expect(callArgs.output).toBeUndefined();
	});

	it('returns structuredOutput when a raw JSON Schema is configured', async () => {
		const expected = { answer: 'Paris', score: 0.95 };
		generateText.mockResolvedValue(makeGenerateSuccessWithOutput(expected));

		const { runtime } = createJsonSchemaStructuredRuntime();
		const result = await runtime.generate('What is the capital of France?');

		expect(result.structuredOutput).toEqual(expected);
		expect(result.finishReason).toBe('stop');
	});

	it('wraps a provider-strict JSON Schema output spec via jsonSchema() before passing to generateText', async () => {
		generateText.mockResolvedValue(makeGenerateSuccessWithOutput({ answer: 'x', score: 1 }));

		const { runtime } = createJsonSchemaStructuredRuntime();
		await runtime.generate('hello');

		// Raw JSON Schema is made provider-strict (additionalProperties: false) and
		// wrapped with the AI SDK's jsonSchema() helper, rather than passed through
		// directly (which is what Zod schemas do).
		const strictTestJsonSchema = { ...testJsonSchema, additionalProperties: false };
		expect(jsonSchema).toHaveBeenCalledWith(strictTestJsonSchema);

		const callArgs = (generateText.mock.calls[0] as [unknown, unknown])[0] as Record<
			string,
			unknown
		>;
		expect(callArgs.output).toEqual(
			expect.objectContaining({
				_type: 'object',
				schema: { _type: 'jsonSchema', schema: strictTestJsonSchema },
			}),
		);
	});

	it('disables strict JSON Schema validation for OpenAI/Groq when a raw JSON Schema is configured', async () => {
		generateText.mockResolvedValue(makeGenerateSuccessWithOutput({ answer: 'x', score: 1 }));

		const { runtime } = createJsonSchemaStructuredRuntime();
		await runtime.generate('hello');

		const callArgs = (generateText.mock.calls[0] as [unknown, unknown])[0] as Record<
			string,
			unknown
		>;
		expect(callArgs.providerOptions).toEqual(
			expect.objectContaining({
				openai: { strictJsonSchema: false },
				groq: { strictJsonSchema: false },
			}),
		);
	});

	it('keeps strict JSON Schema validation (no relaxation) for a Zod schema', async () => {
		generateText.mockResolvedValue(makeGenerateSuccessWithOutput({ answer: 'x', score: 1 }));

		const { runtime } = createStructuredRuntime();
		await runtime.generate('hello');

		const callArgs = (generateText.mock.calls[0] as [unknown, unknown])[0] as Record<
			string,
			unknown
		>;
		// No thinking/provider options configured and Zod output → no strict override.
		expect(callArgs.providerOptions).toBeUndefined();
	});

	it('preserves structuredOutput through tool-call iterations', async () => {
		const tool: BuiltTool = {
			name: 'add',
			description: 'Add numbers',
			inputSchema: z.object({ a: z.number(), b: z.number() }),
			handler: async (input: unknown) => {
				const { a, b } = input as { a: number; b: number };
				return await Promise.resolve({ sum: a + b });
			},
		};

		const expected = { answer: '5', score: 1 };
		generateText
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'add', { a: 2, b: 3 }))
			.mockResolvedValueOnce(makeGenerateSuccessWithOutput(expected, 'The sum is 5'));

		const { runtime } = createStructuredRuntime({ tools: [tool] });
		const result = await runtime.generate('What is 2 + 3?');

		expect(result.structuredOutput).toEqual(expected);
		expect(result.finishReason).toBe('stop');
	});
});

// ---------------------------------------------------------------------------
// Provider-executed tool timing — stream()
// ---------------------------------------------------------------------------

describe('AgentRuntime.stream() — provider-executed tool timing', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('emits tool-execution-start/end for a provider-executed tool result', async () => {
		streamText.mockReturnValue(
			makeStreamWithProviderTool({
				toolCallId: 'tc-ws',
				toolName: 'web_search',
				input: { query: 'n8n' },
				output: [{ url: 'https://n8n.io' }],
			}),
		);
		const { runtime } = createRuntime();

		const { stream } = await runtime.stream('search please');
		const chunks = await collectChunks(stream);

		const start = chunks.find(
			(c): c is Extract<StreamChunk, { type: 'tool-execution-start' }> =>
				c.type === 'tool-execution-start' && c.toolCallId === 'tc-ws',
		);
		const end = chunks.find(
			(c): c is Extract<StreamChunk, { type: 'tool-execution-end' }> =>
				c.type === 'tool-execution-end' && c.toolCallId === 'tc-ws',
		);

		expect(start).toBeDefined();
		expect(start?.toolName).toBe('web_search');
		expect(typeof start?.startTime).toBe('number');

		expect(end).toBeDefined();
		expect(end?.isError).toBe(false);
		expect(typeof end?.endTime).toBe('number');
	});

	it('emits tool-execution-end with isError on a provider-executed tool error', async () => {
		streamText.mockReturnValue(
			makeStreamWithProviderTool({
				toolCallId: 'tc-ws-err',
				toolName: 'web_search',
				input: { query: 'n8n' },
				error: new Error('search failed'),
			}),
		);
		const { runtime } = createRuntime();

		const { stream } = await runtime.stream('search please');
		const chunks = await collectChunks(stream);

		const end = chunks.find(
			(c): c is Extract<StreamChunk, { type: 'tool-execution-end' }> =>
				c.type === 'tool-execution-end' && c.toolCallId === 'tc-ws-err',
		);

		expect(end).toBeDefined();
		expect(end?.isError).toBe(true);
		expect(typeof end?.endTime).toBe('number');

		const toolResult = chunks.find(
			(c): c is Extract<StreamChunk, { type: 'tool-result' }> =>
				c.type === 'tool-result' && c.toolCallId === 'tc-ws-err',
		);
		expect(toolResult).toBeDefined();
		expect(toolResult?.isError).toBe(true);
		expect(toolResult?.output).toEqual(new Error('search failed'));
	});
});

// ---------------------------------------------------------------------------
// Structured output — stream()
// ---------------------------------------------------------------------------

describe('AgentRuntime.stream() — structured output', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('includes structuredOutput in the finish chunk when schema is configured', async () => {
		const expected = { answer: 'Paris', score: 0.95 };
		streamText.mockReturnValue(makeStreamSuccessWithOutput(expected));

		const { runtime } = createStructuredRuntime();
		const { stream } = await runtime.stream('What is the capital of France?');
		const chunks = await collectChunks(stream);

		const finish = chunks.find((c) => c.type === 'finish') as StreamChunk & {
			type: 'finish';
		};
		expect(finish).toBeDefined();
		expect(finish.structuredOutput).toEqual(expected);
	});

	it('does not include structuredOutput in the finish chunk when no schema is configured', async () => {
		streamText.mockReturnValue(makeStreamSuccess());

		const { runtime } = createRuntime();
		const { stream } = await runtime.stream('hello');
		const chunks = await collectChunks(stream);

		const finish = chunks.find((c) => c.type === 'finish') as StreamChunk & {
			type: 'finish';
		};
		expect(finish).toBeDefined();
		expect(finish.structuredOutput).toBeUndefined();
	});

	it('passes the output spec to streamText when schema is configured', async () => {
		streamText.mockReturnValue(makeStreamSuccessWithOutput({ answer: 'test', score: 1 }));

		const { runtime } = createStructuredRuntime();
		const { stream } = await runtime.stream('hello');
		await collectChunks(stream);

		const callArgs = (streamText.mock.calls[0] as [unknown, unknown])[0] as Record<string, unknown>;
		expect(callArgs.output).toBeDefined();
		expect(callArgs.output).toEqual(
			expect.objectContaining({ _type: 'object', schema: testSchema }),
		);
	});

	it('does not pass the output spec to streamText when no schema is configured', async () => {
		streamText.mockReturnValue(makeStreamSuccess());

		const { runtime } = createRuntime();
		const { stream } = await runtime.stream('hello');
		await collectChunks(stream);
		const callArgs = (streamText.mock.calls[0] as [unknown, unknown])[0] as Record<string, unknown>;
		expect(callArgs.output).toBeUndefined();
	});

	it('preserves structuredOutput through tool-call iterations', async () => {
		const tool: BuiltTool = {
			name: 'add',
			description: 'Add numbers',
			inputSchema: z.object({ a: z.number(), b: z.number() }),
			handler: async (input: unknown) => {
				const { a, b } = input as { a: number; b: number };
				return await Promise.resolve({ sum: a + b });
			},
		};

		const expected = { answer: '5', score: 1 };
		streamText
			.mockReturnValueOnce({
				fullStream: makeChunkStream([
					{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'add', args: { a: 2, b: 3 } },
				]),
				finishReason: Promise.resolve('tool-calls'),
				usage: Promise.resolve({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
				response: Promise.resolve({
					messages: [
						{
							role: 'assistant',
							content: [
								{
									type: 'tool-call',
									toolCallId: 'tc-1',
									toolName: 'add',
									args: { a: 2, b: 3 },
								},
							],
						},
					],
				}),
				toolCalls: Promise.resolve([
					{ toolCallId: 'tc-1', toolName: 'add', input: { a: 2, b: 3 } },
				]),
			})
			.mockReturnValueOnce(makeStreamSuccessWithOutput(expected, 'The sum is 5'));

		const { runtime } = createStructuredRuntime({ tools: [tool] });
		const { stream } = await runtime.stream('What is 2 + 3?');
		const chunks = await collectChunks(stream);

		const finish = chunks.find((c) => c.type === 'finish') as StreamChunk & {
			type: 'finish';
		};
		expect(finish).toBeDefined();
		expect(finish.structuredOutput).toEqual(expected);
	});
});

// ---------------------------------------------------------------------------
// Structured output — resume()
// ---------------------------------------------------------------------------

describe('AgentRuntime.resume() — structured output', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns structuredOutput after resume in generate mode', async () => {
		const interruptibleTool = makeInterruptibleTool();
		const { runtime } = createStructuredRuntime({ tools: [interruptibleTool] });

		// First call: LLM triggers the interruptible tool
		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCall('tc-1', 'approve', { question: 'proceed?' }),
		);

		const firstResult = await runtime.generate('Should I proceed?');
		expect(firstResult.finishReason).toBe('tool-calls');
		expect(firstResult.pendingSuspend).toBeDefined();

		const { runId, toolCallId } = firstResult.pendingSuspend![0];

		// Second call (after resume): LLM returns final answer with structured output
		const expected = { answer: 'Approved', score: 1 };
		generateText.mockResolvedValueOnce(makeGenerateSuccessWithOutput(expected, 'Approved'));

		const resumeResult = await runtime.resume(
			'generate',
			{ approved: true },
			{ runId, toolCallId },
		);

		expect(resumeResult.structuredOutput).toEqual(expected);
		expect(resumeResult.finishReason).toBe('stop');
	});

	it('returns structuredOutput after resume in stream mode', async () => {
		const interruptibleTool = makeInterruptibleTool();
		const { runtime } = createStructuredRuntime({ tools: [interruptibleTool] });

		// First call: LLM triggers the interruptible tool (via generate to get the runId)
		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCall('tc-1', 'approve', { question: 'proceed?' }),
		);

		const firstResult = await runtime.generate('Should I proceed?');
		expect(firstResult.pendingSuspend).toBeDefined();

		const { runId, toolCallId } = firstResult.pendingSuspend![0];

		// Second call (after resume): LLM streams final answer with structured output
		const expected = { answer: 'Approved', score: 1 };
		streamText.mockReturnValueOnce(makeStreamSuccessWithOutput(expected, 'Approved'));

		const resumed = await runtime.resume('stream', { approved: true }, { runId, toolCallId });

		const chunks = await collectChunks(resumed.stream as ReadableStream<unknown>);
		const finish = chunks.find((c) => c.type === 'finish') as StreamChunk & {
			type: 'finish';
		};
		expect(finish).toBeDefined();
		expect(finish.structuredOutput).toEqual(expected);
	});
});

// ---------------------------------------------------------------------------
// Eager input streaming
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/require-await */
describe('providerOptions — tool adapter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('forwards providerOptions to the AI SDK tool when set', () => {
		const ai = aiModule as unknown as { tool: Mock };
		const adapter = { toAiSdkTools };

		const builtTool: BuiltTool = {
			name: 'set_code',
			description: 'Set code in editor',
			inputSchema: z.object({ code: z.string() }),
			providerOptions: { anthropic: { eagerInputStreaming: true } },
			handler: async () => ({ ok: true }),
		};

		const result = adapter.toAiSdkTools([builtTool]);

		expect(ai.tool).toHaveBeenCalledWith(
			expect.objectContaining({
				providerOptions: {
					anthropic: { eagerInputStreaming: true },
				},
			}),
		);
		expect(result).toHaveProperty('set_code');
	});

	it('forwards arbitrary provider options (not just Anthropic)', () => {
		const ai = aiModule as unknown as { tool: Mock };
		const adapter = { toAiSdkTools };

		const builtTool: BuiltTool = {
			name: 'draw',
			description: 'Draw an image',
			inputSchema: z.object({ prompt: z.string() }),
			providerOptions: { openai: { strict: true } },
			handler: async () => ({ ok: true }),
		};

		adapter.toAiSdkTools([builtTool]);

		expect(ai.tool).toHaveBeenCalledWith(
			expect.objectContaining({
				providerOptions: { openai: { strict: true } },
			}),
		);
	});

	it('does not pass providerOptions when not set', () => {
		const ai = aiModule as unknown as { tool: Mock };
		const adapter = { toAiSdkTools };

		const builtTool: BuiltTool = {
			name: 'search',
			description: 'Search',
			inputSchema: z.object({ query: z.string() }),
			handler: async () => ({ results: [] }),
		};

		adapter.toAiSdkTools([builtTool]);

		expect(ai.tool).toHaveBeenCalledWith(
			expect.not.objectContaining({
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				providerOptions: expect.anything(),
			}),
		);
	});
});

describe('Tool builder — providerOptions', () => {
	it('sets providerOptions via .providerOptions()', () => {
		const built = new Tool('set_code')
			.description('Set code')
			.input(z.object({ code: z.string() }))
			.providerOptions({ anthropic: { eagerInputStreaming: true } })
			.handler(async () => ({ ok: true }))
			.build();

		expect(built.providerOptions).toEqual({ anthropic: { eagerInputStreaming: true } });
	});

	it('merges multiple .providerOptions() calls', () => {
		const built = new Tool('multi')
			.description('Multi-provider tool')
			.input(z.object({ text: z.string() }))
			.providerOptions({ anthropic: { eagerInputStreaming: true } })
			.providerOptions({ openai: { strict: true } })
			.handler(async () => ({ ok: true }))
			.build();

		expect(built.providerOptions).toEqual({
			anthropic: { eagerInputStreaming: true },
			openai: { strict: true },
		});
	});

	it('defaults to undefined when .providerOptions() is not called', () => {
		const built = new Tool('search')
			.description('Search')
			.input(z.object({ query: z.string() }))
			.handler(async () => ({ results: [] }))
			.build();

		expect(built.providerOptions).toBeUndefined();
	});
});
/* eslint-enable @typescript-eslint/require-await */

// ---------------------------------------------------------------------------
// Runtime validation — input schema
// ---------------------------------------------------------------------------

describe('AgentRuntime — runtime input schema validation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('surfaces a ZodError as a tool error outcome when LLM provides invalid input', async () => {
		// Tool expects { id: z.string() } but LLM will provide { id: 123 } (wrong type)
		const strictTool: BuiltTool = {
			name: 'strict',
			description: 'strict',
			inputSchema: z.object({ id: z.string() }),
			handler: async () => {
				return await Promise.resolve({ ok: true });
			},
		};

		generateText
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'strict', { id: 123 }))
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const runtimeWithTool = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [strictTool],
		});

		const result = await runtimeWithTool.generate('go');
		// The ZodError is caught by Promise.allSettled; the loop continues and
		// the LLM responds with 'done' on the next turn.
		expect(result.finishReason).toBe('stop');

		const assistantMsg = result.messages.find(
			(m) =>
				isLlmMessage(m) && m.role === 'assistant' && m.content.some((c) => c.type === 'tool-call'),
		) as Message;
		expect(assistantMsg).toBeDefined();
		const call = assistantMsg.content.find((c) => c.type === 'tool-call') as ContentToolCall;
		expect(call.state).toBe('rejected');
		expect(call.state === 'rejected' && call.error).toContain('Expected string, received number');
	});
});

// ---------------------------------------------------------------------------
// Runtime validation — JSON Schema input validation
// ---------------------------------------------------------------------------

describe('AgentRuntime — runtime JSON Schema input validation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('passes valid input through without error', async () => {
		const tool: BuiltTool = {
			name: 'json_tool',
			description: 'json tool',
			inputSchema: {
				type: 'object',
				properties: { id: { type: 'string' } },
				required: ['id'],
			},
			handler: async () => await Promise.resolve({ ok: true }),
		};

		generateText
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'json_tool', { id: 'abc' }))
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [tool],
		});

		const result = await runtime.generate('go');
		expect(result.finishReason).toBe('stop');

		// No error — the tool ran successfully
		const assistantMsg = result.messages.find(
			(m) =>
				isLlmMessage(m) && m.role === 'assistant' && m.content.some((c) => c.type === 'tool-call'),
		) as Message;
		expect(assistantMsg).toBeDefined();
		const call = assistantMsg.content.find((c) => c.type === 'tool-call') as ContentToolCall;
		expect(call.state).toBe('resolved');
	});

	it('surfaces a validation error as a tool error outcome when LLM provides the wrong type', async () => {
		const tool: BuiltTool = {
			name: 'json_tool',
			description: 'json tool',
			inputSchema: {
				type: 'object',
				properties: { id: { type: 'string' } },
				required: ['id'],
			},
			handler: async () => await Promise.resolve({ ok: true }),
		};

		generateText
			// LLM sends { id: 123 } — a number where a string is required
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'json_tool', { id: 123 }))
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [tool],
		});

		const result = await runtime.generate('go');
		expect(result.finishReason).toBe('stop');

		const assistantMsg = result.messages.find(
			(m) =>
				isLlmMessage(m) && m.role === 'assistant' && m.content.some((c) => c.type === 'tool-call'),
		) as Message;
		expect(assistantMsg).toBeDefined();
		const call = assistantMsg.content.find((c) => c.type === 'tool-call') as ContentToolCall;
		expect(call.state).toBe('rejected');
		expect(call.state === 'rejected' && call.error).toContain('Invalid tool input');
	});

	it('surfaces a validation error when a required property is missing', async () => {
		const tool: BuiltTool = {
			name: 'json_tool',
			description: 'json tool',
			inputSchema: {
				type: 'object',
				properties: {
					name: { type: 'string' },
					age: { type: 'integer' },
				},
				required: ['name', 'age'],
			},
			handler: async () => await Promise.resolve({ ok: true }),
		};

		generateText
			// LLM omits the required 'age' field
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'json_tool', { name: 'Alice' }))
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [tool],
		});

		const result = await runtime.generate('go');
		expect(result.finishReason).toBe('stop');

		const assistantMsg = result.messages.find(
			(m) =>
				isLlmMessage(m) && m.role === 'assistant' && m.content.some((c) => c.type === 'tool-call'),
		) as Message;
		const call = assistantMsg.content.find((c) => c.type === 'tool-call') as ContentToolCall;
		expect(call.state).toBe('rejected');
		expect(call.state === 'rejected' && call.error).toContain('Invalid tool input');
	});

	it('does not invoke the handler when JSON Schema validation fails', async () => {
		const handlerFn = vi.fn().mockResolvedValue({ ok: true });
		const tool: BuiltTool = {
			name: 'json_tool',
			description: 'json tool',
			inputSchema: {
				type: 'object',
				properties: { count: { type: 'integer', minimum: 1 } },
				required: ['count'],
			},
			handler: handlerFn,
		};

		generateText
			// LLM sends count: 0, which fails the minimum: 1 constraint
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'json_tool', { count: 0 }))
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [tool],
		});

		await runtime.generate('go');
		expect(handlerFn).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Tool builder — JSON Schema input integration
//
// Mirrors the resolveNodeTool() code path in node-tool-factory.ts where the
// input schema is a raw JSON Schema object (converted from Zod by ToolFromNode).
// ---------------------------------------------------------------------------

describe('AgentRuntime — Tool builder with JSON Schema input', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('passes valid input to the handler when built via Tool builder', async () => {
		const handlerFn = vi.fn().mockResolvedValue({ found: true });

		const tool = new Tool('lookup')
			.description('Look up a record by id')
			.input({
				type: 'object',
				properties: { id: { type: 'string' } },
				required: ['id'],
			})
			.handler(handlerFn)
			.build();

		generateText
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'lookup', { id: 'abc-123' }))
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [tool],
		});

		const result = await runtime.generate('go');

		expect(result.finishReason).toBe('stop');
		expect(handlerFn).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'abc-123' }),
			expect.anything(),
		);

		const assistantMsg = result.messages.find(
			(m) =>
				isLlmMessage(m) && m.role === 'assistant' && m.content.some((c) => c.type === 'tool-call'),
		) as Message;
		const call = assistantMsg.content.find((c) => c.type === 'tool-call') as ContentToolCall;
		expect(call.state).toBe('resolved');
	});

	it('produces a tool error when the LLM sends input that fails JSON Schema validation', async () => {
		const handlerFn = vi.fn().mockResolvedValue({ found: true });

		const tool = new Tool('lookup')
			.description('Look up a record by id')
			.input({
				type: 'object',
				properties: {
					id: { type: 'string' },
					count: { type: 'integer', minimum: 1 },
				},
				required: ['id', 'count'],
			})
			.handler(handlerFn)
			.build();

		generateText
			// LLM sends count: 0 (violates minimum: 1) and id as a number (wrong type)
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'lookup', { id: 42, count: 0 }))
			.mockResolvedValueOnce(makeGenerateSuccess('corrected'));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [tool],
		});

		const result = await runtime.generate('go');

		expect(result.finishReason).toBe('stop');
		// Handler must not be called — validation should block execution
		expect(handlerFn).not.toHaveBeenCalled();

		const assistantMsg = result.messages.find(
			(m) =>
				isLlmMessage(m) && m.role === 'assistant' && m.content.some((c) => c.type === 'tool-call'),
		) as Message;
		const call = assistantMsg.content.find((c) => c.type === 'tool-call') as ContentToolCall;
		expect(call.state).toBe('rejected');
		expect(call.state === 'rejected' && call.error).toContain('Invalid tool input');
	});

	it('validates enum and pattern constraints defined in JSON Schema', async () => {
		const handlerFn = vi.fn().mockResolvedValue({ ok: true });

		const tool = new Tool('set_status')
			.description('Set the status of a record')
			.input({
				type: 'object',
				properties: {
					status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
				},
				required: ['status'],
			})
			.handler(handlerFn)
			.build();

		// First call: invalid enum value
		generateText
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'set_status', { status: 'deleted' }))
			// Second call: valid enum value after self-correction
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-2', 'set_status', { status: 'inactive' }))
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [tool],
		});

		const result = await runtime.generate('go');

		expect(result.finishReason).toBe('stop');
		// Handler called exactly once — only for the valid input
		expect(handlerFn).toHaveBeenCalledTimes(1);
		expect(handlerFn).toHaveBeenCalledWith(
			expect.objectContaining({ status: 'inactive' }),
			expect.anything(),
		);
	});
});

// ---------------------------------------------------------------------------
// Runtime validation — resume data schema
// ---------------------------------------------------------------------------

describe('AgentRuntime — runtime resume data schema validation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('surfaces a ZodError as a top-level error when consumer provides invalid resume data', async () => {
		const tool = makeInterruptibleTool(); // has resumeSchema: z.object({ approved: z.boolean() })

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCall('tc-1', 'approve', { question: 'ok?' }),
		);

		const runtimeWithTool = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [tool],
			checkpointStorage: 'memory',
		});

		const firstResult = await runtimeWithTool.generate('go');
		expect(firstResult.pendingSuspend).toBeDefined();
		const { runId, toolCallId } = firstResult.pendingSuspend![0];

		// Resume with invalid data — missing required 'approved' field
		const resumeResultPromise = runtimeWithTool.resume(
			'generate',
			{ notApproved: 'wrong' },
			{ runId, toolCallId },
		);
		await expect(resumeResultPromise).rejects.toThrow(/"message": "Required"/);
	});
});

// ---------------------------------------------------------------------------
// AgentRuntime — tool approval (HITL wrapper)
// ---------------------------------------------------------------------------

describe('AgentRuntime — tool approval (HITL wrapper)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('suspends when a tool has .requireApproval() set', async () => {
		const builtApprovalTool = new ToolBuilder('delete')
			.description('Delete a record')
			.input(z.object({ id: z.string() }))
			.requireApproval()
			.handler(async ({ id }: { id: string }) => {
				return await Promise.resolve({ deleted: id });
			})
			.build();
		const approvalTool = {
			...builtApprovalTool,
			metadata: { displayName: 'Delete record' },
		};

		generateText.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'delete', { id: 'rec-1' }));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [approvalTool],
			checkpointStorage: 'memory',
		});

		const result = await runtime.generate('Delete record rec-1');
		expect(result.finishReason).toBe('tool-calls');
		expect(result.pendingSuspend).toHaveLength(1);
		expect(result.pendingSuspend![0].toolName).toBe('delete');
		expect(result.pendingSuspend![0].suspendPayload).toMatchObject({
			type: 'approval',
			toolName: 'delete',
			displayName: 'Delete record',
			args: { id: 'rec-1' },
		});
	});

	it('executes the original handler after approval', async () => {
		const approvalTool = new ToolBuilder('delete')
			.description('Delete a record')
			.input(z.object({ id: z.string() }))
			.requireApproval()
			.handler(async ({ id }: { id: string }) => {
				return await Promise.resolve({ deleted: id });
			})
			.build();

		generateText
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'delete', { id: 'rec-1' }))
			.mockResolvedValueOnce(makeGenerateSuccess('Done'));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [approvalTool],
			checkpointStorage: 'memory',
		});

		const firstResult = await runtime.generate('Delete record rec-1');
		const { runId, toolCallId } = firstResult.pendingSuspend![0];

		const resumeResult = await runtime.resume(
			'generate',
			{ approved: true },
			{ runId, toolCallId },
		);
		expect(resumeResult.finishReason).toBe('stop');
		expect(resumeResult.toolCalls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ tool: 'delete', output: { deleted: 'rec-1' } }),
			]),
		);
	});

	it('returns declined message to LLM when approval is rejected', async () => {
		const approvalTool = new ToolBuilder('delete')
			.description('Delete a record')
			.input(z.object({ id: z.string() }))
			.requireApproval()
			.handler(async ({ id }: { id: string }) => {
				return await Promise.resolve({ deleted: id });
			})
			.build();

		generateText
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'delete', { id: 'rec-1' }))
			.mockResolvedValueOnce(makeGenerateSuccess('Declined'));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [approvalTool],
			checkpointStorage: 'memory',
		});

		const firstResult = await runtime.generate('Delete record rec-1');
		expect(firstResult.finishReason).toBe('tool-calls');
		const { runId, toolCallId } = firstResult.pendingSuspend![0];

		const resumeResult = await runtime.resume(
			'generate',
			{ approved: false },
			{ runId, toolCallId },
		);
		expect(resumeResult.finishReason).toBe('stop');
	});

	it('does not start tool execution before approval is granted', async () => {
		const handler = vi.fn(async ({ id }: { id: string }) => {
			return await Promise.resolve({ deleted: id });
		});
		const approvalTool = new ToolBuilder('delete')
			.description('Delete a record')
			.input(z.object({ id: z.string() }))
			.requireApproval()
			.handler(handler)
			.build();

		streamText.mockReturnValue({
			fullStream: makeChunkStream([{ type: 'text-delta', textDelta: 'checking...' }]),
			finishReason: Promise.resolve('tool-calls'),
			usage: Promise.resolve({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
			response: Promise.resolve({
				messages: [
					{
						role: 'assistant',
						content: [
							{
								type: 'tool-call',
								toolCallId: 'tc-1',
								toolName: 'delete',
								args: { id: 'rec-1' },
							},
						],
					},
				],
			}),
			toolCalls: Promise.resolve([
				{ toolCallId: 'tc-1', toolName: 'delete', input: { id: 'rec-1' } },
			]),
		});

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [approvalTool],
			checkpointStorage: 'memory',
		});

		const { stream: readableStream } = await runtime.stream('Delete record rec-1');
		const chunks = await collectChunks(readableStream);

		expect(handler).not.toHaveBeenCalled();
		expect(chunks.map((c) => c.type)).toContain('tool-call-suspended');
		expect(chunks.map((c) => c.type)).not.toContain('tool-execution-start');
	});

	it('starts tool execution when conditional approval allows the call immediately', async () => {
		const handler = vi.fn(async ({ id }: { id: string }) => {
			return await Promise.resolve({ found: id });
		});
		const conditionalApprovalTool = new ToolBuilder('lookup')
			.description('Look up a record')
			.input(
				z.object({
					id: z.string(),
					password: z.string(),
					nested: z.object({ apiKey: z.string() }),
				}),
			)
			.needsApprovalFn(async ({ id }: { id: string }) => {
				return await Promise.resolve(id === 'secret');
			})
			.handler(handler)
			.build();
		const startEvents: Array<AgentEventData & { type: AgentEvent.ToolExecutionStart }> = [];
		const eventBus = new AgentEventBus();
		eventBus.on(AgentEvent.ToolExecutionStart, (event) => {
			startEvents.push(event as AgentEventData & { type: AgentEvent.ToolExecutionStart });
		});
		const toolInput = {
			id: 'public',
			password: 'plain-secret-password',
			nested: { apiKey: 'secret-api-key' },
		};

		streamText
			.mockReturnValueOnce({
				fullStream: makeChunkStream([{ type: 'text-delta', textDelta: 'checking...' }]),
				finishReason: Promise.resolve('tool-calls'),
				usage: Promise.resolve({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
				response: Promise.resolve({
					messages: [
						{
							role: 'assistant',
							content: [
								{
									type: 'tool-call',
									toolCallId: 'tc-1',
									toolName: 'lookup',
									args: toolInput,
								},
							],
						},
					],
				}),
				toolCalls: Promise.resolve([{ toolCallId: 'tc-1', toolName: 'lookup', input: toolInput }]),
			})
			.mockReturnValueOnce(makeStreamSuccess('Done'));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [conditionalApprovalTool],
			eventBus,
			checkpointStorage: 'memory',
		});

		const { stream: readableStream } = await runtime.stream('Look up public');
		const chunks = await collectChunks(readableStream);

		expect(handler).toHaveBeenCalledWith(
			toolInput,
			expect.objectContaining({ toolCallId: 'tc-1' }),
		);
		expect(startEvents[0]?.args).toEqual({
			id: 'public',
			password: 'plain-secret-password',
			nested: { apiKey: 'secret-api-key' },
		});
		expect(chunks.map((c) => c.type)).toContain('tool-execution-start');
		expect(chunks.map((c) => c.type)).toContain('tool-execution-end');
		expect(chunks.map((c) => c.type)).not.toContain('tool-call-suspended');
	});
});

// ---------------------------------------------------------------------------
// External abort signal
// ---------------------------------------------------------------------------

describe('external abort signal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should cancel run when external signal fires', async () => {
		const external = new AbortController();

		generateText.mockImplementation(
			async (opts: { abortSignal?: AbortSignal }) =>
				await new Promise((_, reject) => {
					const signal = opts.abortSignal;
					if (signal?.aborted) {
						reject(new Error('aborted'));
						return;
					}
					signal?.addEventListener('abort', () => {
						reject(new Error('aborted'));
					});
				}),
		);

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
		});

		const resultPromise = runtime.generate('hello', {
			persistence: { resourceId: 'user1', threadId: 'thread1' },
			abortSignal: external.signal,
		});

		external.abort();
		const result = await resultPromise;
		expect(result.finishReason).toBe('error');
	});

	it('removes external abort listener after a stream completes', async () => {
		const external = new AbortController();
		const removeListener = vi.spyOn(external.signal, 'removeEventListener');
		streamText.mockReturnValue(makeStreamSuccess('done'));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
		});

		const result = await runtime.stream('hello', {
			persistence: { resourceId: 'user1', threadId: 'thread1' },
			abortSignal: external.signal,
		});
		await collectChunks(result.stream);
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(removeListener).toHaveBeenCalledTimes(1);
		external.abort();
		expect(runtime.getState().status).toBe('success');
	});
});

// ---------------------------------------------------------------------------
// Provider options merging
// ---------------------------------------------------------------------------

describe('provider options merging', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should deep-merge thinking config with call-level providerOptions', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'You are a test assistant.',
			thinking: { budgetTokens: 10000 },
		});

		await runtime.generate('hello', {
			persistence: { resourceId: 'user1', threadId: 'thread1' },
			providerOptions: {
				anthropic: { cacheControl: { type: 'ephemeral' } },
			},
		});

		const callArgs = generateText.mock.calls[0][0] as Record<string, unknown>;
		expect((callArgs.providerOptions as Record<string, Record<string, unknown>>).anthropic).toEqual(
			{
				thinking: { type: 'enabled', budgetTokens: 10000 },
				cacheControl: { type: 'ephemeral' },
			},
		);
	});
});

// ---------------------------------------------------------------------------
// Instruction providerOptions
// ---------------------------------------------------------------------------

describe('tool systemInstruction merging', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function getSystemMessageText(): string {
		const callArgs = generateText.mock.calls[0][0] as Record<string, unknown>;
		const systemMsg = callArgs.system as Record<string, unknown>;
		expect(systemMsg.role).toBe('system');
		return String(systemMsg.content);
	}

	it("wraps a tool's systemInstruction in a built_in_rules block above user instructions", async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const toolWithDirective: BuiltTool = {
			name: 'show_card',
			description: 'show a card',
			systemInstruction: 'Prefer this tool over plain text when posting images.',
			inputSchema: z.object({ value: z.string().optional() }),
			handler: async () => await Promise.resolve('ok'),
		};

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a helpful assistant.',
			tools: [toolWithDirective],
		});

		await runtime.generate('hello');

		const text = getSystemMessageText();
		expect(text).toContain('<built_in_rules>');
		expect(text).toContain('- Prefer this tool over plain text when posting images.');
		expect(text).toContain('</built_in_rules>');
		expect(text).toContain('You are a helpful assistant.');
		expect(text.indexOf('<built_in_rules>')).toBeLessThan(text.indexOf('You are a helpful'));
	});

	it('joins multiple tools systemInstructions into a single block', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const toolA: BuiltTool = {
			name: 'a',
			description: 'a',
			systemInstruction: 'Rule A.',
			inputSchema: z.object({}),
			handler: async () => await Promise.resolve('ok'),
		};
		const toolB: BuiltTool = {
			name: 'b',
			description: 'b',
			systemInstruction: 'Rule B.',
			inputSchema: z.object({}),
			handler: async () => await Promise.resolve('ok'),
		};
		const toolC: BuiltTool = {
			name: 'c',
			description: 'c',
			inputSchema: z.object({}),
			handler: async () => await Promise.resolve('ok'),
		};

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'base',
			tools: [toolA, toolB, toolC],
		});

		await runtime.generate('hello');

		const text = getSystemMessageText();
		const block = text.match(/<built_in_rules>([\s\S]*?)<\/built_in_rules>/);
		expect(block).not.toBeNull();
		expect(block![1]).toContain('- Rule A.');
		expect(block![1]).toContain('- Rule B.');
		expect(block![1]).not.toContain('Rule C');
	});

	it('does not add a built_in_rules block when no tool sets a systemInstruction', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const plainTool: BuiltTool = {
			name: 'plain',
			description: 'plain',
			inputSchema: z.object({}),
			handler: async () => await Promise.resolve('ok'),
		};

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a helpful assistant.',
			tools: [plainTool],
		});

		await runtime.generate('hello');

		const text = getSystemMessageText();
		expect(text).not.toContain('<built_in_rules>');
		expect(text).toContain('You are a helpful assistant.');
	});
});

describe('instruction providerOptions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should attach providerOptions to system message', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
			instructionProviderOptions: {
				anthropic: { cacheControl: { type: 'ephemeral' } },
			},
		});

		await runtime.generate('hello', {
			persistence: { resourceId: 'user1', threadId: 'thread1' },
		});

		const callArgs = generateText.mock.calls[0][0] as Record<string, unknown>;
		const systemMsg = callArgs.system as Record<string, unknown>;
		expect(systemMsg.role).toBe('system');
		expect(systemMsg.providerOptions).toEqual({
			anthropic: { cacheControl: { type: 'ephemeral' } },
		});
	});
});

// ---------------------------------------------------------------------------
// Observation log background jobs
// ---------------------------------------------------------------------------

describe('AgentRuntime — observation log jobs', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('schedules observation after a persisted stream turn', async () => {
		streamText.mockReturnValue(makeStreamSuccess('Remembered response'));
		const memory = new InMemoryMemory();
		await memory.saveThread({ id: 'thread-1', resourceId: 'resource-1' });

		const runtime = new AgentRuntime({
			name: 'observing-agent',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
			memory,
			observationalMemory: {
				observerThresholdTokens: 1,
				reflectorThresholdTokens: 10_000,
				observationLogTailLimit: 20,
				observe: async () =>
					await Promise.resolve('* CRITICAL (14:30) User needs observation memory wired.'),
				reflect: async () => await Promise.resolve('{"drop":[],"merge":[]}'),
			},
		});

		const result = await runtime.stream('Please remember this.', {
			persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
		});
		await collectChunks(result.stream);
		await runtime.dispose();

		const observations = await memory.getActiveObservationLog({
			observationScopeId: 'thread-1',
		});
		expect(observations).toMatchObject([
			{
				marker: 'critical',
				text: 'User needs observation memory wired.',
				parentId: null,
			},
		]);
		const cursor = await memory.getCursor('thread-1');
		expect(typeof cursor?.lastObservedMessageId).toBe('string');
	});

	it('schedules observation after a persisted generate turn', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess('Remembered response'));
		const memory = new InMemoryMemory();
		await memory.saveThread({ id: 'thread-1', resourceId: 'resource-1' });

		const runtime = new AgentRuntime({
			name: 'observing-agent',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
			memory,
			observationalMemory: {
				observerThresholdTokens: 1,
				reflectorThresholdTokens: 10_000,
				observationLogTailLimit: 20,
				observe: async () =>
					await Promise.resolve('* IMPORTANT (14:30) User asked for generate observation memory.'),
				reflect: async () => await Promise.resolve('{"drop":[],"merge":[]}'),
			},
		});

		await runtime.generate('Please remember this.', {
			persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
		});
		await runtime.dispose();

		const observations = await memory.getActiveObservationLog({
			observationScopeId: 'thread-1',
		});
		expect(observations).toMatchObject([
			{
				marker: 'important',
				text: 'User asked for generate observation memory.',
			},
		]);
	});

	it('indexes episodic memory after observation jobs complete', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess('Remembered response'));
		embed.mockResolvedValue({ embedding: [1, 0], usage: { tokens: 1 } });
		embedMany.mockResolvedValue({ embeddings: [[1, 0]], usage: { tokens: 1 } });
		const memory = new InMemoryMemory();
		const fakeEmbedder = { specificationVersion: 'v2' } as never;
		const observationLockSpy = vi.spyOn(memory, 'acquireObservationLogTaskLock');
		const episodicLockSpy = vi.spyOn(memory.episodic.taskLock!, 'acquire');

		const runtime = new AgentRuntime({
			name: 'observing-agent',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
			memory,
			observationalMemory: {
				observerThresholdTokens: 1,
				observationLogTailLimit: 20,
				observe: async () =>
					await Promise.resolve('* CRITICAL (14:30) User chose Postgres for memory storage.'),
			},
			episodicMemory: {
				embedder: fakeEmbedder,
				extract: async ({ observations }) =>
					await Promise.resolve({
						entries: [
							{
								content: 'User chose Postgres for memory storage.',
								sources: [
									{
										observationId: observations[0].id,
										evidence: 'User chose Postgres',
									},
								],
							},
						],
					}),
			},
		});

		await runtime.generate('Please remember the Postgres decision.', {
			persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
		});
		await runtime.dispose();

		const entries = await memory.episodic.searchEntries(
			{ resourceId: 'resource-1' },
			'Postgres storage',
			{ queryEmbedding: [1, 0] },
		);
		expect(entries).toHaveLength(1);
		expect(entries[0].content).toBe('User chose Postgres for memory storage.');
		const cursor = await memory.episodic.getCursor({
			observationScopeId: 'thread-1',
		});
		expect(typeof cursor?.lastIndexedObservationId).toBe('string');
		const firstLockCall = episodicLockSpy.mock.calls.at(0);
		if (!firstLockCall) throw new Error('Expected episodic memory lock acquisition');
		const [lockedResourceId, lockOptions] = firstLockCall;
		expect(lockedResourceId).toBe('resource-1');
		expect(typeof lockOptions.holderId).toBe('string');
		expect(typeof lockOptions.ttlMs).toBe('number');
		const observationLockTaskKinds = observationLockSpy.mock.calls.map((call) => String(call[1]));
		expect(observationLockTaskKinds).not.toContain('episodic-indexer');
	});

	it('skips episodic indexing when the episodic task lock is held', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess('Plain response'));
		const memory = new InMemoryMemory();
		const observationScope = {
			observationScopeId: 'thread-1',
		};
		const [observation] = await memory.appendObservationLogEntries([
			{
				...observationScope,
				marker: 'critical',
				text: 'User chose Postgres for memory storage.',
				createdAt: new Date('2026-05-20T12:00:00Z'),
			},
		]);
		const extract = vi.fn(async () => {
			await Promise.resolve();

			return {
				entries: [
					{
						content: 'User chose Postgres for memory storage.',
						sources: [{ observationId: observation.id, evidence: 'User chose Postgres' }],
					},
				],
			};
		});
		vi.spyOn(memory.episodic.taskLock!, 'acquire').mockResolvedValue(null);

		const runtime = new AgentRuntime({
			name: 'observing-agent',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
			memory,
			episodicMemory: {
				embedder: { specificationVersion: 'v2' } as never,
				extract,
			},
		});

		await runtime.generate('Please remember this.', {
			persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
		});
		await runtime.dispose();

		expect(extract).not.toHaveBeenCalled();
		await expect(memory.episodic.getCursor(observationScope)).resolves.toBeNull();
	});

	it('does not inject episodic memory and exposes recall_memory for explicit recall', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess('Scoped response'));
		const memory = new InMemoryMemory();
		const fakeEmbedder = { specificationVersion: 'v2' } as never;
		await memory.episodic.saveEntryWithSources(
			{
				resourceId: 'resource-1',
				content: 'Earlier session: user chose Postgres for memory storage.',
				embedding: [1, 0],
			},
			[
				{
					observationId: 'obs-resource-1',
					threadId: 'thread-resource-1',
					evidenceText: 'user chose Postgres',
				},
			],
		);
		await memory.episodic.saveEntryWithSources(
			{
				resourceId: 'resource-2',
				content: 'Earlier session: user chose SQLite for memory storage.',
				embedding: [1, 0],
			},
			[
				{
					observationId: 'obs-resource-2',
					threadId: 'thread-resource-2',
					evidenceText: 'user chose SQLite',
				},
			],
		);

		const runtime = new AgentRuntime({
			name: 'observing-agent',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
			memory,
			episodicMemory: { embedder: fakeEmbedder },
		});

		await runtime.generate('What storage did we choose?', {
			persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
		});

		const callArgs = (generateText.mock.calls[0] as [unknown])[0] as {
			system: { content: string };
			tools: Record<string, unknown>;
		};
		const systemPrompt = callArgs.system?.content ?? '';
		expect(systemPrompt).not.toContain('<episodic_memory>');
		expect(systemPrompt).not.toContain('Postgres');
		expect(systemPrompt).not.toContain('SQLite');
		expect(callArgs.tools).toHaveProperty('recall_memory');
		expect(embed).not.toHaveBeenCalled();
	});

	it('counts recall_memory query embedding tokens', async () => {
		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCall('tc-recall', 'recall_memory', { query: 'storage' }),
			)
			.mockResolvedValueOnce(makeGenerateSuccess('Recalled response'));
		embed.mockResolvedValue({ embedding: [1, 0], usage: { tokens: 7 } });
		const counter = makeExecutionCounter();
		const memory = new InMemoryMemory();
		await memory.episodic.saveEntryWithSources(
			{
				resourceId: 'resource-1',
				content: 'Earlier session: user chose Postgres for memory storage.',
				embedding: [1, 0],
			},
			[
				{
					observationId: 'obs-resource-1',
					threadId: 'thread-resource-1',
					evidenceText: 'user chose Postgres',
				},
			],
		);

		const runtime = new AgentRuntime({
			name: 'observing-agent',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
			memory,
			episodicMemory: { embedder: { specificationVersion: 'v2' } as never },
		});

		await runtime.generate('What storage did we choose?', {
			persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
			executionCounter: counter,
		});

		expect(counter.incrementTokenCount).toHaveBeenCalledWith(7);
	});

	it('does not schedule observation jobs without policy callbacks', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess('Plain response'));
		const memory = new InMemoryMemory();
		await memory.saveThread({ id: 'thread-1', resourceId: 'resource-1' });

		const runtime = new AgentRuntime({
			name: 'plain-agent',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
			memory,
			observationalMemory: {
				observerThresholdTokens: 1,
				reflectorThresholdTokens: 10_000,
				observationLogTailLimit: 20,
			},
		});

		await runtime.generate('Please remember this.', {
			persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
		});
		await runtime.dispose();

		expect(
			await memory.getActiveObservationLog({
				observationScopeId: 'thread-1',
			}),
		).toEqual([]);
		expect(await memory.getCursor('thread-1')).toBeNull();
	});

	// TODO: Fix this test it's flaky
	// eslint-disable-next-line n8n-local-rules/no-skipped-tests
	it.skip('keeps history resource-filtered while observation-log memory is thread-local', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess('Remembered response'));
		const memory = new InMemoryMemory();
		const runtime = new AgentRuntime({
			name: 'observing-agent',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
			memory,
			observationalMemory: {
				observerThresholdTokens: 1,
				reflectorThresholdTokens: 10_000,
				observationLogTailLimit: 20,
				observe: async ({ transcript }) =>
					await Promise.resolve(
						transcript.includes('resource-one')
							? '* CRITICAL (14:30) Resource one memory.'
							: '* CRITICAL (14:30) Resource two memory.',
					),
				reflect: async () => await Promise.resolve('{"drop":[],"merge":[]}'),
			},
		});

		await runtime.generate('remember resource-one preference', {
			persistence: { threadId: 'shared-thread', resourceId: 'resource-1' },
		});
		await runtime.dispose();
		await runtime.generate('remember resource-two preference', {
			persistence: { threadId: 'shared-thread', resourceId: 'resource-2' },
		});
		await runtime.dispose();

		generateText.mockClear();
		generateText.mockResolvedValue(makeGenerateSuccess('Scoped response'));

		await runtime.generate('what is my memory?', {
			persistence: { threadId: 'shared-thread', resourceId: 'resource-2' },
		});

		const generateTextMock = generateText as MockedFunction<
			(input: {
				system: { content: string };
				messages: Array<{
					role: string;
					content: unknown;
				}>;
			}) => unknown
		>;
		const [{ system, messages }] = generateTextMock.mock.calls[0];
		expect(system.content).toContain('Resource one memory.');
		expect(system.content).toContain('Resource two memory.');
		expect(JSON.stringify(messages)).not.toContain('remember resource-one preference');

		await runtime.dispose();
	});

	it('loads only unobserved history when an observation cursor exists', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess('Scoped response'));
		const memory = new InMemoryMemory();
		await memory.saveThread({ id: 'thread-1', resourceId: 'resource-1' });

		const observedAt = new Date('2026-01-01T00:01:00.000Z');
		const unobservedAt = new Date('2026-01-01T00:02:00.000Z');
		await memory.saveMessages({
			threadId: 'thread-1',
			resourceId: 'resource-1',
			messages: [
				{
					id: 'm1',
					createdAt: new Date('2026-01-01T00:00:00.000Z'),
					role: 'user',
					content: [{ type: 'text', text: 'OBSERVED_OLD_MESSAGE' }],
				},
				{
					id: 'm2',
					createdAt: observedAt,
					role: 'assistant',
					content: [{ type: 'text', text: 'Old response' }],
				},
				{
					id: 'm3',
					createdAt: unobservedAt,
					role: 'user',
					content: [{ type: 'text', text: 'UNOBSERVED_RECENT_MESSAGE' }],
				},
			],
		});
		await memory.setCursor({
			observationScopeId: 'thread-1',
			lastObservedMessageId: 'm2',
			lastObservedAt: observedAt,
			updatedAt: observedAt,
		});

		const runtime = new AgentRuntime({
			name: 'observing-agent',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
			memory,
			observationalMemory: {
				observerThresholdTokens: 1,
				observe: async () => await Promise.resolve('* CRITICAL (14:30) Observed.'),
			},
		});

		await runtime.generate('Current turn question', {
			persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
		});

		const generateTextMock = generateText as MockedFunction<
			(input: { messages: unknown[] }) => unknown
		>;
		const [{ messages }] = generateTextMock.mock.calls[0];
		const serialized = JSON.stringify(messages);
		expect(serialized).not.toContain('OBSERVED_OLD_MESSAGE');
		expect(serialized).toContain('UNOBSERVED_RECENT_MESSAGE');

		await runtime.dispose();
	});

	it('emits an error event when an observer background task fails', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess('Plain response'));
		const memory = new InMemoryMemory();
		const bus = new AgentEventBus();
		const error = new Error('observer failed');
		const errorEvents: AgentEventData[] = [];
		bus.on(AgentEvent.Error, (event) => errorEvents.push(event));
		const runtime = new AgentRuntime({
			name: 'observing-agent',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
			eventBus: bus,
			memory,
			observationalMemory: {
				observerThresholdTokens: 1,
				reflectorThresholdTokens: 10_000,
				observationLogTailLimit: 20,
				observe: async () => await Promise.reject(error),
				reflect: async () => await Promise.resolve('{"drop":[],"merge":[]}'),
			},
		});

		await runtime.generate('please remember this', {
			persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
		});
		await runtime.dispose();

		expect(errorEvents).toEqual(
			expect.arrayContaining([expect.objectContaining({ error, source: 'observer' })]),
		);
	});

	it('emits an error event when a reflector background task fails', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess('Plain response'));
		const memory = new InMemoryMemory();
		const bus = new AgentEventBus();
		const error = new Error('reflector failed');
		const errorEvents: AgentEventData[] = [];
		bus.on(AgentEvent.Error, (event) => errorEvents.push(event));
		const runtime = new AgentRuntime({
			name: 'observing-agent',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
			eventBus: bus,
			memory,
			observationalMemory: {
				observerThresholdTokens: 1,
				reflectorThresholdTokens: 1,
				observationLogTailLimit: 20,
				observe: async () =>
					await Promise.resolve(`* CRITICAL (14:30) ${'Large observation. '.repeat(20)}`),
				reflect: async () => await Promise.reject(error),
			},
		});

		await runtime.generate('please remember this', {
			persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
		});
		await runtime.dispose();

		expect(errorEvents).toEqual(
			expect.arrayContaining([expect.objectContaining({ error, source: 'reflector' })]),
		);
	});

	it('emits one error event when an episodic indexer background task fails', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess('Plain response'));
		const memory = new InMemoryMemory();
		const bus = new AgentEventBus();
		const error = new Error('episodic extraction failed');
		const errorEvents: AgentEventData[] = [];
		bus.on(AgentEvent.Error, (event) => errorEvents.push(event));
		const runtime = new AgentRuntime({
			name: 'observing-agent',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
			eventBus: bus,
			memory,
			observationalMemory: {
				observerThresholdTokens: 1,
				observationLogTailLimit: 20,
				observe: async () =>
					await Promise.resolve('* CRITICAL (14:30) User chose Postgres for memory storage.'),
			},
			episodicMemory: {
				embedder: { specificationVersion: 'v2' } as never,
				extract: async () => await Promise.reject(error),
			},
		});

		await runtime.generate('please remember this', {
			persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
		});
		await runtime.dispose();

		expect(errorEvents).toEqual([
			expect.objectContaining({
				error,
				source: 'episodic-memory',
				message: 'Episodic memory indexing task failed',
			}),
		]);
	});
});

// ---------------------------------------------------------------------------
// Runtime telemetry — generate / stream / tool execution
// ---------------------------------------------------------------------------

describe('AgentRuntime — telemetry propagation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const baseTelemetry: BuiltTelemetry = {
		enabled: true,
		functionId: 'test-agent',
		metadata: { env: 'test' },
		recordInputs: true,
		recordOutputs: false,
		integrations: [],
		tracer: { startSpan: vi.fn() },
	};

	it('passes telemetry config into generateText as experimental_telemetry', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const runtime = new AgentRuntime({
			name: 'telemetry-test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
			telemetry: baseTelemetry,
		});

		await runtime.generate('hello');

		const callArgs = generateText.mock.calls[0][0] as Record<string, unknown>;
		const expTelemetry = callArgs.experimental_telemetry as Record<string, unknown>;
		expect(expTelemetry).toBeDefined();
		expect(expTelemetry.isEnabled).toBe(true);
		expect(expTelemetry.functionId).toBe('test-agent');
		expect(expTelemetry.tracer).toBe(baseTelemetry.tracer);
		expect(expTelemetry.recordInputs).toBe(true);
		expect(expTelemetry.recordOutputs).toBe(false);
	});

	it('uses updated telemetry config for later runs', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());
		const updatedTelemetry: BuiltTelemetry = {
			...baseTelemetry,
			functionId: 'updated-agent',
			metadata: { env: 'updated' },
		};

		const runtime = new AgentRuntime({
			name: 'telemetry-test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
			telemetry: baseTelemetry,
		});

		runtime.setTelemetry(updatedTelemetry);
		await runtime.generate('hello');

		const callArgs = generateText.mock.calls[0][0] as Record<string, unknown>;
		const expTelemetry = callArgs.experimental_telemetry as Record<string, unknown>;
		expect(expTelemetry.functionId).toBe('updated-agent');
		expect(expTelemetry.metadata).toEqual({ env: 'updated' });
	});

	it('wraps generate calls in a telemetry root span when the tracer supports active spans', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());
		const span = {
			end: vi.fn(),
			recordException: vi.fn(),
			setStatus: vi.fn(),
		};
		const tracer = {
			startActiveSpan: vi.fn(async (_name: string, _options: unknown, fn: unknown) => {
				if (typeof fn !== 'function') {
					throw new Error('Expected span callback');
				}
				const spanFn = fn as (spanValue: typeof span) => Promise<unknown>;
				return await spanFn(span);
			}),
		};
		const telemetry: BuiltTelemetry = { ...baseTelemetry, tracer };

		const runtime = new AgentRuntime({
			name: 'telemetry-root-test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
			telemetry,
		});

		await runtime.generate('hello');

		expect(tracer.startActiveSpan).toHaveBeenCalledWith(
			'test-agent.generate',
			{
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				attributes: expect.objectContaining<Record<string, string>>({
					'langsmith.traceable': 'true',
					'langsmith.trace.name': 'test-agent.generate',
					'langsmith.span.kind': 'chain',
					'langsmith.metadata.agent_name': 'telemetry-root-test',
					'langsmith.metadata.env': 'test',
				}),
			},
			expect.any(Function),
		);
		expect(span.end).toHaveBeenCalledTimes(1);
	});

	it('can suppress the generic runtime root span while keeping native telemetry enabled', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());
		const tracer = {
			startActiveSpan: vi.fn(),
		};
		const telemetry: BuiltTelemetry = {
			...baseTelemetry,
			runtimeRootSpanEnabled: false,
			tracer,
		};

		const runtime = new AgentRuntime({
			name: 'telemetry-root-test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
			telemetry,
		});

		await runtime.generate('hello');

		expect(tracer.startActiveSpan).not.toHaveBeenCalled();

		const callArgs = generateText.mock.calls[0][0] as Record<string, unknown>;
		expect(callArgs.experimental_telemetry).toEqual(
			expect.objectContaining({
				isEnabled: true,
				functionId: 'test-agent',
				tracer,
			}),
		);
	});

	it('adds a LangSmith tool catalog to telemetry root spans', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());
		const span = {
			end: vi.fn(),
			recordException: vi.fn(),
			setStatus: vi.fn(),
		};
		const tracer = {
			startActiveSpan: vi.fn(async (_name: string, _options: unknown, fn: unknown) => {
				if (typeof fn !== 'function') {
					throw new Error('Expected span callback');
				}
				const spanFn = fn as (spanValue: typeof span) => Promise<unknown>;
				return await spanFn(span);
			}),
		};
		const telemetry: BuiltTelemetry = {
			...baseTelemetry,
			metadata: {
				...baseTelemetry.metadata,
				langsmith_trace_id: 'trace-1',
				langsmith_actor_run_id: 'actor-run-1',
			},
			tracer,
		};
		const tool = new ToolBuilder('lookup')
			.description('Lookup records')
			.input(z.object({ query: z.string() }))
			.handler(async () => await Promise.resolve({ ok: true }))
			.build();

		const runtime = new AgentRuntime({
			name: 'telemetry-root-test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
			tools: [tool],
			telemetry,
		});

		await runtime.generate('hello');

		const rootSpanOptions = tracer.startActiveSpan.mock.calls[0][1] as {
			attributes: Record<string, unknown>;
		};
		const { attributes } = rootSpanOptions;
		expect(attributes).toEqual(
			expect.objectContaining({
				'langsmith.metadata.available_tools': ['lookup'],
			}),
		);
		expect(attributes).not.toHaveProperty('langsmith.trace.id');
		expect(attributes).not.toHaveProperty('langsmith.span.parent_id');
		expect(attributes['gen_ai.prompt']).toEqual(expect.stringContaining('"name":"lookup"'));
		expect(attributes['gen_ai.prompt']).toEqual(
			expect.stringContaining('"description":"Lookup records"'),
		);
		expect(attributes['gen_ai.prompt']).toEqual(expect.stringContaining('"input_schema"'));
	});

	it('passes telemetry config into streamText as experimental_telemetry', async () => {
		streamText.mockReturnValue(makeStreamSuccess());

		const runtime = new AgentRuntime({
			name: 'telemetry-stream-test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
			telemetry: baseTelemetry,
		});

		const { stream } = await runtime.stream('hello');
		await collectChunks(stream);

		const callArgs = streamText.mock.calls[0][0] as Record<string, unknown>;
		const expTelemetry = callArgs.experimental_telemetry as Record<string, unknown>;
		expect(expTelemetry).toBeDefined();
		expect(expTelemetry.isEnabled).toBe(true);
		expect(expTelemetry.functionId).toBe('test-agent');
		expect(expTelemetry.tracer).toBe(baseTelemetry.tracer);
	});

	it('enables smoothStream by default on streamText', async () => {
		streamText.mockReturnValue(makeStreamSuccess());
		const smoothStreamSpy = vi.spyOn(aiModule, 'smoothStream');

		const runtime = new AgentRuntime({
			name: 'smooth-stream-default-test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
		});

		const { stream } = await runtime.stream('hello');
		await collectChunks(stream);

		const callArgs = streamText.mock.calls[0][0] as Record<string, unknown>;
		expect(callArgs.experimental_transform).toEqual(expect.any(Function));
		expect(smoothStreamSpy).toHaveBeenCalledWith({});

		smoothStreamSpy.mockRestore();
	});

	it('omits smoothStream when explicitly disabled', async () => {
		streamText.mockReturnValue(makeStreamSuccess());

		const runtime = new AgentRuntime({
			name: 'smooth-stream-disabled-test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
		});

		const { stream } = await runtime.stream('hello', { smoothStream: false });
		await collectChunks(stream);

		const callArgs = streamText.mock.calls[0][0] as Record<string, unknown>;
		expect(callArgs.experimental_transform).toBeUndefined();
	});

	it('forwards non-default smoothStream options to the AI SDK', async () => {
		streamText.mockReturnValue(makeStreamSuccess());

		const smoothStreamSpy = vi.spyOn(aiModule, 'smoothStream');

		const runtime = new AgentRuntime({
			name: 'smooth-stream-options-test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
		});

		const smoothStreamOptions = { delayInMs: 25, chunking: 'line' as const };
		const { stream } = await runtime.stream('hello', { smoothStream: smoothStreamOptions });

		await collectChunks(stream);

		expect(smoothStreamSpy).toHaveBeenCalledWith(smoothStreamOptions);

		smoothStreamSpy.mockRestore();
	});

	it('inherits telemetry from ExecutionOptions when no own telemetry is set', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const runtime = new AgentRuntime({
			name: 'child-agent',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
			// No telemetry set on the runtime itself
		});

		await runtime.generate('hello', {
			persistence: { resourceId: 'r1', threadId: 't1' },
			telemetry: baseTelemetry,
		});

		const callArgs = generateText.mock.calls[0][0] as Record<string, unknown>;
		const expTelemetry = callArgs.experimental_telemetry as Record<string, unknown>;
		expect(expTelemetry).toBeDefined();
		expect(expTelemetry.isEnabled).toBe(true);
		// Inherited telemetry uses the child agent's name as functionId
		expect(expTelemetry.functionId).toBe('child-agent');
		expect(expTelemetry.tracer).toBe(baseTelemetry.tracer);
	});

	it('passes resolved telemetry to tool handlers via parentTelemetry', async () => {
		let capturedTelemetry: BuiltTelemetry | undefined;
		let capturedToolCallId: string | undefined;

		const spyTool: BuiltTool = new ToolBuilder('spy')
			.description('captures telemetry from context')
			.input(z.object({ x: z.string() }))
			.output(z.object({ ok: z.boolean() }))
			.handler(async (_input, ctx) => {
				capturedTelemetry = ctx.parentTelemetry;
				capturedToolCallId = ctx.toolCallId;
				return await Promise.resolve({ ok: true });
			})
			.build();

		generateText
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc1', 'spy', { x: 'test' }))
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const runtime = new AgentRuntime({
			name: 'tool-telemetry-test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
			tools: [spyTool],
			telemetry: baseTelemetry,
		});

		await runtime.generate('test');

		expect(capturedTelemetry).toBe(baseTelemetry);
		expect(capturedToolCallId).toBe('tc1');
	});

	it('emits AI SDK-compatible telemetry spans for local tool execution', async () => {
		const spans: Array<{
			name: string;
			span: {
				end: Mock;
				recordException: Mock;
				setAttributes: Mock;
				setStatus: Mock;
			};
		}> = [];
		const tracer = {
			startActiveSpan: vi.fn(async (name: string, _options: unknown, fn: unknown) => {
				if (typeof fn !== 'function') {
					throw new Error('Expected span callback');
				}
				const span = {
					end: vi.fn(),
					recordException: vi.fn(),
					setAttributes: vi.fn(),
					setStatus: vi.fn(),
				};
				spans.push({ name, span });
				const spanFn = fn as (spanValue: typeof span) => Promise<unknown>;
				return await spanFn(span);
			}),
		};
		const telemetry: BuiltTelemetry = {
			...baseTelemetry,
			recordOutputs: true,
			tracer,
		};
		const spyTool: BuiltTool = new ToolBuilder('spy')
			.description('captures telemetry from context')
			.input(z.object({ x: z.string() }))
			.output(z.object({ ok: z.boolean() }))
			.handler(async () => await Promise.resolve({ ok: true }))
			.build();

		generateText
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc1', 'spy', { x: 'test' }))
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const runtime = new AgentRuntime({
			name: 'tool-telemetry-test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
			tools: [spyTool],
			telemetry,
		});

		await runtime.generate('test');

		const toolCallSpan = tracer.startActiveSpan.mock.calls.find(([name]) => name === 'ai.toolCall');
		expect(toolCallSpan).toBeDefined();
		expect(toolCallSpan?.[1]).toEqual({
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			attributes: expect.objectContaining<Record<string, string>>({
				'operation.name': 'ai.toolCall test-agent',
				'resource.name': 'test-agent',
				'ai.operationId': 'ai.toolCall',
				'ai.telemetry.functionId': 'test-agent',
				'ai.telemetry.metadata.env': 'test',
				'ai.toolCall.name': 'spy',
				'ai.toolCall.id': 'tc1',
				'ai.toolCall.args': '{"x":"test"}',
			}),
		});
		const toolSpan = spans.find((span) => span.name === 'ai.toolCall')?.span;
		expect(toolSpan?.setAttributes).toHaveBeenCalledWith({
			'ai.toolCall.result': '{"ok":true}',
		});
		expect(toolSpan?.end).toHaveBeenCalledTimes(1);
	});

	it('passes inherited telemetry to tool handlers for sub-agent scenarios', async () => {
		let capturedTelemetry: BuiltTelemetry | undefined;

		const spyTool: BuiltTool = new ToolBuilder('spy')
			.description('captures telemetry from context')
			.input(z.object({ x: z.string() }))
			.output(z.object({ ok: z.boolean() }))
			.handler(async (_input, ctx) => {
				capturedTelemetry = ctx.parentTelemetry;
				return await Promise.resolve({ ok: true });
			})
			.build();

		generateText
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc1', 'spy', { x: 'test' }))
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const runtime = new AgentRuntime({
			name: 'sub-agent',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
			tools: [spyTool],
			// No own telemetry
		});

		await runtime.generate('test', {
			persistence: { resourceId: 'r1', threadId: 't1' },
			telemetry: baseTelemetry,
		});

		// Should receive inherited telemetry with the child agent's functionId
		expect(capturedTelemetry).toBeDefined();
		expect(capturedTelemetry!.functionId).toBe('sub-agent');
		expect(capturedTelemetry!.tracer).toBe(baseTelemetry.tracer);
	});

	it('does not include experimental_telemetry when telemetry is disabled', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const runtime = new AgentRuntime({
			name: 'disabled-telemetry',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
			telemetry: { ...baseTelemetry, enabled: false },
		});

		await runtime.generate('hello');

		const callArgs = generateText.mock.calls[0][0] as Record<string, unknown>;
		expect(callArgs.experimental_telemetry).toBeUndefined();
	});
});

// Cancellation (Feature 1: cancel suspended tool via user message)
// ---------------------------------------------------------------------------

describe('AgentRuntime.resume() with createCancellation() — auto-bypass', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	/** A tool that suspends on first call and returns on resume. */
	function makeSuspendToolForCancel(): BuiltTool {
		return {
			name: 'interactive_tool',
			description: 'A tool that suspends',
			inputSchema: z.object({ prompt: z.string() }),
			suspendSchema: z.object({ prompt: z.string() }),
			resumeSchema: z.object({ answer: z.string() }),
			handler: async (_input: unknown, ctx: unknown) => {
				const { suspend, resumeData } = ctx as InterruptibleToolContext;
				if (!resumeData) {
					return await suspend({ prompt: 'What should I do?' });
				}
				return { result: (resumeData as { answer: string }).answer };
			},
		};
	}

	it('auto-bypass: does NOT call the tool handler on cancellation', async () => {
		const handlerSpy = vi.fn().mockImplementation(async (_input: unknown, ctx: unknown) => {
			const { suspend, resumeData } = ctx as InterruptibleToolContext;
			if (!resumeData) {
				return await suspend({ prompt: 'What should I do?' });
			}
			return { result: (resumeData as { answer: string }).answer };
		});
		const tool: BuiltTool = {
			name: 'interactive_tool',
			description: 'A tool that suspends',
			inputSchema: z.object({ prompt: z.string() }),
			suspendSchema: z.object({ prompt: z.string() }),
			resumeSchema: z.object({ answer: z.string() }),
			handler: handlerSpy,
		};

		const { runtime } = createRuntimeWithTools([tool], 1);

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{ toolCallId: 'tc-1', toolName: 'interactive_tool', args: { prompt: 'continue?' } },
				]),
			)
			.mockResolvedValueOnce(makeGenerateSuccess('Done after cancel'));

		const first = await runtime.generate('start', {});
		const { runId, toolCallId } = first.pendingSuspend![0];

		// Reset call count to check the handler is NOT called on resume
		handlerSpy.mockClear();

		const resumed = await runtime.resume(
			'generate',
			createCancellation('do something else instead'),
			{ runId, toolCallId },
		);

		// Handler should NOT have been called for the resume
		expect(handlerSpy).not.toHaveBeenCalled();
		// The generation should have continued after cancellation
		expect(resumed.finishReason).toBe('stop');
	});

	it('auto-bypass: injects the steering message and the LLM sees it', async () => {
		const tool = makeSuspendToolForCancel();
		const { runtime } = createRuntimeWithTools([tool], 1);

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{ toolCallId: 'tc-1', toolName: 'interactive_tool', args: { prompt: 'continue?' } },
				]),
			)
			.mockResolvedValueOnce(makeGenerateSuccess('Understood, doing something else'));

		const first = await runtime.generate('start');
		const { runId, toolCallId } = first.pendingSuspend![0];

		await runtime.resume('generate', createCancellation('pivot to plan B'), { runId, toolCallId });

		// The second generateText call should include the user steering message
		const secondCallMessages = (
			generateText.mock.calls[1][0] as { messages: Array<{ role: string; content: unknown }> }
		).messages;
		const userMessages = secondCallMessages.filter((m) => m.role === 'user');
		const steeringMsg = userMessages.find((m) =>
			JSON.stringify(m.content).includes('pivot to plan B'),
		);
		expect(steeringMsg).toBeDefined();
	});

	it('stream: emits a cancellation tool result then continues', async () => {
		const tool = makeSuspendToolForCancel();
		const { runtime } = createRuntimeWithTools([tool], 1);

		streamText
			.mockReturnValueOnce({
				fullStream: makeChunkStream([{ type: 'text-delta', textDelta: 'thinking...' }]),
				finishReason: Promise.resolve('tool-calls'),
				usage: Promise.resolve({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
				response: Promise.resolve({
					messages: [
						{
							role: 'assistant',
							content: [
								{
									type: 'tool-call',
									toolCallId: 'tc-1',
									toolName: 'interactive_tool',
									args: { prompt: 'continue?' },
								},
							],
						},
					],
				}),
				toolCalls: Promise.resolve([
					{ toolCallId: 'tc-1', toolName: 'interactive_tool', input: { prompt: 'continue?' } },
				]),
			})
			.mockReturnValueOnce(makeStreamSuccess('Redirected'));

		const firstResult = await runtime.stream('start');
		const firstChunks = await collectChunks(firstResult.stream);

		const suspendChunk = firstChunks.find((c) => c.type === 'tool-call-suspended');
		expect(suspendChunk).toBeDefined();
		const { runId, toolCallId } = suspendChunk as Extract<
			StreamChunk,
			{ type: 'tool-call-suspended' }
		>;

		const resumed = await runtime.resume('stream', createCancellation('go another direction'), {
			runId,
			toolCallId,
		});
		const resumedChunks = await collectChunks(resumed.stream);

		const cancellationResult = resumedChunks.find(
			(c) => c.type === 'tool-result' && c.toolCallId === 'tc-1',
		);
		expect(cancellationResult).toEqual(
			expect.objectContaining({
				type: 'tool-result',
				toolCallId: 'tc-1',
				toolName: 'interactive_tool',
				output: '[Tool call cancelled. User said: "go another direction"]',
				canceled: true,
			}),
		);

		// Generation should continue after the cancellation result
		const textChunks = resumedChunks.filter((c) => c.type === 'text-delta');
		expect(textChunks.length).toBeGreaterThan(0);
	});

	it('rejects with an error if the checkpoint is not found', async () => {
		const { runtime } = createRuntimeWithTools([makeSuspendToolForCancel()], 1);
		await expect(
			runtime.resume('generate', createCancellation('no checkpoint'), {
				runId: 'nonexistent',
				toolCallId: 'tc-1',
			}),
		).rejects.toThrow('No suspended run found for runId: nonexistent');
	});
});

describe('AgentRuntime.resume() with createCancellation() — manual handling (handleCancellation)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calls the tool handler with ctx.cancellation set', async () => {
		const handlerSpy = vi.fn().mockImplementation(async (_input: unknown, ctx: unknown) => {
			const { suspend, resumeData, cancellation } = ctx as InterruptibleToolContext;
			if (cancellation) {
				// Manual cleanup path — return a note for the LLM
				return `Cancelled: ${cancellation.message}`;
			}
			if (!resumeData) {
				return await suspend({ prompt: 'Confirm?' });
			}
			return 'done';
		});
		const tool: BuiltTool = {
			name: 'manual_cancel_tool',
			description: 'A tool with manual cancellation',
			inputSchema: z.object({ value: z.string() }),
			suspendSchema: z.object({ prompt: z.string() }),
			resumeSchema: z.object({ confirmed: z.boolean() }),
			handleCancellation: true,
			handler: handlerSpy,
		};

		const { runtime } = createRuntimeWithTools([tool], 1);

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{ toolCallId: 'tc-1', toolName: 'manual_cancel_tool', args: { value: 'x' } },
				]),
			)
			.mockResolvedValueOnce(makeGenerateSuccess('Done after manual cancel'));

		const first = await runtime.generate('test');
		const { runId, toolCallId } = first.pendingSuspend![0];

		handlerSpy.mockClear();

		await runtime.resume('generate', createCancellation('user said stop'), { runId, toolCallId });

		// Handler SHOULD have been called for the resume
		expect(handlerSpy).toHaveBeenCalledTimes(1);
		const callCtx = handlerSpy.mock.calls[0][1] as InterruptibleToolContext;
		expect(callCtx.cancellation).toEqual({ message: 'user said stop' });
		expect(callCtx.resumeData).toBeUndefined();
	});
});
