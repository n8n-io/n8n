/**
 * Durable-log RFC (resilience phase) harness: per-step checkpoints and
 * crash-resume at the SDK level, with a mocked model. Proves:
 * - stepCheckpoints persists a `running` checkpoint at every step boundary,
 * - a fresh runtime resumes from that checkpoint via crashResume() and
 *   continues to completion under the SAME runId,
 * - contextNotes (interrupted-tool and correction notes recovered by the
 *   host from its durable log) reach the resumed model context,
 * - crashResume rejects suspended checkpoints (those belong to resume()).
 */
import * as aiModule from 'ai';
import type { Mock } from 'vitest';
import { z } from 'zod';

import type { CheckpointStore, SerializableAgentState } from '../../types';
import type { StreamChunk } from '../../types/sdk/agent';
import type { BuiltTool, InterruptibleToolContext } from '../../types/sdk/tool';
import { AgentRuntime } from '../loop/agent-runtime';
import { AgentEventBus } from '../state/event-bus';

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

const { streamText } = aiModule as unknown as { streamText: Mock };

function* makeChunkStream(
	chunks: Array<Record<string, unknown>>,
): Generator<Record<string, unknown>> {
	for (const c of chunks) {
		yield c;
	}
}

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

function makeStreamWithToolCall(toolCallId: string, args: Record<string, unknown>) {
	return {
		fullStream: makeChunkStream([{ type: 'text-delta', textDelta: 'working...' }]),
		finishReason: Promise.resolve('tool-calls'),
		usage: Promise.resolve({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
		response: Promise.resolve({
			messages: [
				{
					role: 'assistant',
					content: [{ type: 'tool-call', toolCallId, toolName: 'lookup', args }],
				},
			],
		}),
		toolCalls: Promise.resolve([{ toolCallId, toolName: 'lookup', input: args }]),
	};
}

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

/** In-memory CheckpointStore that also records every save for inspection. */
class RecordingCheckpointStore implements CheckpointStore {
	map = new Map<string, SerializableAgentState>();

	saves: Array<{ key: string; state: SerializableAgentState }> = [];

	deletes: string[] = [];

	async save(key: string, state: SerializableAgentState): Promise<void> {
		this.saves.push({ key, state: structuredClone(state) });
		this.map.set(key, state);
		await Promise.resolve();
	}

	async load(key: string): Promise<SerializableAgentState | undefined> {
		return await Promise.resolve(this.map.get(key));
	}

	async delete(key: string): Promise<void> {
		this.deletes.push(key);
		this.map.delete(key);
		await Promise.resolve();
	}
}

/** Interruptible tool: suspends on first call (HITL), returns on resume. */
const approveTool: BuiltTool = {
	name: 'approve',
	description: 'Requires approval',
	inputSchema: z.object({ question: z.string().optional() }),
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

const lookupTool: BuiltTool = {
	name: 'lookup',
	description: 'Mock lookup tool',
	inputSchema: z.object({ value: z.string().optional() }),
	handler: async (input) =>
		await Promise.resolve({ found: (input as { value?: string }).value ?? 'nothing' }),
};

function createRuntime(store: CheckpointStore, tools: BuiltTool[] = [lookupTool]) {
	const bus = new AgentEventBus();
	const runtime = new AgentRuntime({
		name: 'crash-test',
		model: 'openai/gpt-4o-mini',
		instructions: 'You are a test assistant.',
		tools,
		eventBus: bus,
		checkpointStorage: store,
	});
	return runtime;
}

describe('step checkpoints + crash resume (durable-log RFC)', () => {
	beforeEach(() => {
		streamText.mockReset();
	});

	it('persists a running checkpoint at every step boundary and resumes after a crash', async () => {
		const store = new RecordingCheckpointStore();
		const runtime = createRuntime(store);

		streamText
			.mockReturnValueOnce(makeStreamWithToolCall('tc-1', { value: 'first' }))
			.mockReturnValueOnce(makeStreamWithToolCall('tc-2', { value: 'second' }))
			.mockReturnValueOnce(makeStreamSuccess('all done'));

		const result = await runtime.stream('find things', { stepCheckpoints: true });
		const chunks = await collectChunks(result.stream);
		const finish = chunks.filter((c) => c.type === 'finish').at(-1) as
			| (StreamChunk & { type: 'finish'; finishReason: string })
			| undefined;
		expect(finish?.finishReason).toBe('stop');

		// One checkpoint per completed tool step, all with status 'running' and
		// no pending tool calls (step boundary), under the run's id.
		const stepSaves = store.saves.filter((s) => s.state.status === 'running');
		expect(stepSaves).toHaveLength(2);
		for (const save of stepSaves) {
			expect(save.key).toBe(result.runId);
			expect(save.state.pendingToolCalls).toEqual({});
			expect(save.state.messageList).toBeDefined();
		}
		// The second checkpoint contains both settled tool calls.
		const secondJson = JSON.stringify(stepSaves[1].state.messageList);
		expect(secondJson).toContain('tc-1');
		expect(secondJson).toContain('tc-2');
		// The completed run deleted its checkpoint (no leak).
		expect(store.deletes).toContain(result.runId);

		// CRASH SIMULATION: the process died after step 2's checkpoint and
		// before the run finished, so the store still holds that checkpoint.
		store.map.set(result.runId, stepSaves[1].state);

		const runtime2 = createRuntime(store);
		streamText.mockReset();
		streamText.mockReturnValueOnce(makeStreamSuccess('resumed and done'));

		const resumed = await runtime2.crashResume({
			runId: result.runId,
			contextNotes: [
				'Your previous "lookup" tool call was interrupted by a restart. Verify before retrying.',
			],
		});
		expect(resumed.runId).toBe(result.runId);
		const resumedChunks = await collectChunks(resumed.stream);
		const resumedFinish = resumedChunks.filter((c) => c.type === 'finish').at(-1) as
			| (StreamChunk & { type: 'finish'; finishReason: string })
			| undefined;
		expect(resumedFinish?.finishReason).toBe('stop');

		// The resumed model call saw the checkpointed history AND the note.
		expect(streamText).toHaveBeenCalledTimes(1);
		const callArgs = streamText.mock.calls[0][0] as { messages: unknown };
		const contextJson = JSON.stringify(callArgs.messages);
		expect(contextJson).toContain('tc-1');
		expect(contextJson).toContain('tc-2');
		expect(contextJson).toContain('interrupted by a restart');
	});

	it('a crash-resumed run that suspends at HITL persists a resumable suspended checkpoint', async () => {
		const store = new RecordingCheckpointStore();

		// Original run: one completed tool step (writes the step checkpoint),
		// then the crash.
		const runtime = createRuntime(store, [lookupTool, approveTool]);
		streamText
			.mockReturnValueOnce(makeStreamWithToolCall('tc-1', { value: 'first' }))
			.mockReturnValueOnce(makeStreamSuccess('done'));
		const result = await runtime.stream('find things', { stepCheckpoints: true });
		await collectChunks(result.stream);
		const stepCheckpoint = store.saves.find((s) => s.state.status === 'running');
		expect(stepCheckpoint).toBeDefined();
		store.map.set(result.runId, stepCheckpoint!.state); // crash before completion

		// Crash-resume: the next model turn calls the HITL tool, which suspends.
		const runtime2 = createRuntime(store, [lookupTool, approveTool]);
		streamText.mockReset();
		streamText.mockReturnValueOnce({
			fullStream: makeChunkStream([{ type: 'text-delta', textDelta: 'asking...' }]),
			finishReason: Promise.resolve('tool-calls'),
			usage: Promise.resolve({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
			response: Promise.resolve({
				messages: [
					{
						role: 'assistant',
						content: [
							{
								type: 'tool-call',
								toolCallId: 'tc-hitl',
								toolName: 'approve',
								args: { question: 'ok?' },
							},
						],
					},
				],
			}),
			toolCalls: Promise.resolve([
				{ toolCallId: 'tc-hitl', toolName: 'approve', input: { question: 'ok?' } },
			]),
		});

		const resumed = await runtime2.crashResume({ runId: result.runId, stepCheckpoints: true });
		const chunks = await collectChunks(resumed.stream);
		expect(chunks.some((c) => c.type === 'tool-call-suspended')).toBe(true);

		// The suspension checkpoint is persisted under the same runId with the
		// pending HITL call, so the normal resume() path can pick it up.
		const suspended = store.map.get(result.runId);
		expect(suspended?.status).toBe('suspended');
		expect(Object.keys(suspended?.pendingToolCalls ?? {})).toEqual(['tc-hitl']);
	});

	it('rejects crashResume on a suspended checkpoint (resume() owns those)', async () => {
		const store = new RecordingCheckpointStore();
		store.map.set('run_suspended', {
			status: 'suspended',
			messageList: { messages: [] } as never,
			pendingToolCalls: {},
		});
		const runtime = createRuntime(store);
		await expect(runtime.crashResume({ runId: 'run_suspended' })).rejects.toThrow(
			/crashResume only accepts step checkpoints/,
		);
	});

	it('throws when no checkpoint exists for the runId', async () => {
		const runtime = createRuntime(new RecordingCheckpointStore());
		await expect(runtime.crashResume({ runId: 'run_missing' })).rejects.toThrow(
			/No checkpoint found/,
		);
	});

	it('rejects a running checkpoint that still has pending tool calls (claimed HITL resume)', async () => {
		const store = new RecordingCheckpointStore();
		// The state claimResume() leaves behind if the process dies mid-resume:
		// status flipped to 'running', pending HITL calls not yet settled.
		store.map.set('run_claimed', {
			status: 'running',
			messageList: { messages: [] } as never,
			pendingToolCalls: {
				'tc-hitl': {
					suspended: true,
					toolCallId: 'tc-hitl',
					toolName: 'approve',
					input: {},
					suspendPayload: { question: 'approve?' },
					resumeSchema: {},
					runId: 'run_claimed',
				},
			},
		});
		const runtime = createRuntime(store);
		await expect(runtime.crashResume({ runId: 'run_claimed' })).rejects.toThrow(
			/pending tool calls/,
		);
	});

	it('surfaces an error when maxIterations is decreased on crashResume (parity with resume)', async () => {
		const store = new RecordingCheckpointStore();
		store.map.set('run_max', {
			status: 'running',
			messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
			pendingToolCalls: {},
			executionOptions: { maxIterations: 5 },
		});
		const runtime = createRuntime(store);
		const result = await runtime.crashResume({ runId: 'run_max', maxIterations: 2 });
		const chunks = await collectChunks(result.stream);
		const errorChunk = chunks.find((c) => c.type === 'error') as
			| (StreamChunk & { type: 'error'; error: unknown })
			| undefined;
		expect(String(errorChunk?.error)).toContain('Cannot decrease maxIterations');
	});
});
