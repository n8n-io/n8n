import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import { z } from 'zod';

import type { ExecutionOptions, StreamChunk } from '../../../types/sdk/agent';
import { InMemoryMemory } from '../../memory/memory-store';
import { AgentEventBus } from '../../state/event-bus';
import { AgentRuntime } from '../agent-runtime';

vi.mock('../../../sdk/catalog', () => ({
	getModelCost: vi.fn().mockResolvedValue(undefined),
	computeCost: vi.fn().mockReturnValue(undefined),
}));

type MockStreamResult = Awaited<ReturnType<MockLanguageModelV3['doStream']>>;
type MockStreamPart = MockStreamResult['stream'] extends ReadableStream<infer P> ? P : never;

const USAGE: Extract<MockStreamPart, { type: 'finish' }>['usage'] = {
	inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 5, text: 5, reasoning: 0 },
};
const PERSISTENCE = { threadId: 'thread-1', resourceId: 'user-1' };
const NOTE = 'Use the updated requirements.';
const USER_NOTE = { role: 'user', content: [{ type: 'text', text: NOTE }] };

async function runWithSteering(options: ExecutionOptions = {}) {
	const model = new MockLanguageModelV3({
		provider: 'mock',
		modelId: 'scripted',
		doStream: [
			{
				stream: convertArrayToReadableStream<MockStreamPart>([
					{ type: 'stream-start', warnings: [] },
					{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'lookup', input: '{}' },
					{
						type: 'finish',
						finishReason: { unified: 'tool-calls', raw: 'tool_calls' },
						usage: USAGE,
					},
				]),
			},
			{
				stream: convertArrayToReadableStream<MockStreamPart>([
					{ type: 'stream-start', warnings: [] },
					{ type: 'text-start', id: 'txt-1' },
					{ type: 'text-delta', id: 'txt-1', delta: 'Done.' },
					{ type: 'text-end', id: 'txt-1' },
					{ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: USAGE },
				]),
			},
		],
	});
	const memory = new InMemoryMemory();
	const handler = vi.fn().mockResolvedValue({ found: true });
	const runtime = new AgentRuntime({
		name: 'steering-test',
		model,
		instructions: 'Use the lookup tool.',
		tools: [{ name: 'lookup', description: 'Look up data', inputSchema: z.object({}), handler }],
		eventBus: new AgentEventBus(),
		memory,
	});
	const result = await runtime.stream('Look up the data.', {
		...options,
		persistence: PERSISTENCE,
		smoothStream: false,
	});
	const chunks: StreamChunk[] = [];
	const reader = result.stream.getReader();
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	expect(chunks.filter((chunk) => chunk.type === 'error')).toEqual([]);
	expect(chunks.at(-1)).toMatchObject({ type: 'finish', finishReason: 'stop' });
	expect(model.doStreamCalls).toHaveLength(2);
	expect(handler).toHaveBeenCalledOnce();
	const persisted = await memory.getMessages(PERSISTENCE.threadId, {
		resourceId: PERSISTENCE.resourceId,
	});
	return { model, persisted, result };
}

describe('steering input', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('keeps the original user input when no drain is supplied', async () => {
		const { model, persisted } = await runWithSteering();
		for (const call of model.doStreamCalls) {
			expect(call.prompt.filter((message) => message.role === 'user')).toEqual([
				{ role: 'user', content: [{ type: 'text', text: 'Look up the data.' }] },
			]);
		}
		expect(
			persisted.filter((message) => 'role' in message && message.role === 'user'),
		).toHaveLength(1);
	});

	it('includes an async drain note in the next model call and saved turn', async () => {
		const steeringInput = vi.fn().mockResolvedValue([{ text: NOTE }]);
		const { model, persisted } = await runWithSteering({ steeringInput });
		expect(steeringInput).toHaveBeenCalledExactlyOnceWith({ step: 1, force: false });
		expect(model.doStreamCalls[0].prompt).not.toContainEqual(USER_NOTE);
		expect(model.doStreamCalls[1].prompt).toContainEqual(USER_NOTE);
		expect(persisted).toContainEqual(expect.objectContaining(USER_NOTE));
	});

	it('logs a drain failure and completes the run', async () => {
		const error = new Error('Drain unavailable');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const steeringInput = vi.fn(() => {
			throw error;
		});
		const { persisted, result } = await runWithSteering({ steeringInput });
		expect(warn).toHaveBeenCalledExactlyOnceWith('Failed to drain steering input', {
			runId: result.runId,
			error,
		});
		expect(
			persisted.filter((message) => 'role' in message && message.role === 'user'),
		).toHaveLength(1);
	});

	it('drops blank text and keeps nonblank text unchanged', async () => {
		const text = `  ${NOTE}  `;
		const { model, persisted } = await runWithSteering({
			steeringInput: () => [{ text: '' }, { text: ' \n\t ' }, { text }],
		});
		const users = persisted.filter((message) => 'role' in message && message.role === 'user');
		expect(users).toHaveLength(2);
		expect(users[1]).toMatchObject({ content: [{ type: 'text', text }] });
		expect(model.doStreamCalls[1].prompt.filter((message) => message.role === 'user')).toHaveLength(
			2,
		);
	});

	it('preserves the host id on the injected message', async () => {
		const { persisted } = await runWithSteering({
			steeringInput: () => [{ id: 'queued-message-1', text: NOTE }],
		});
		expect(persisted.filter((message) => message.id === 'queued-message-1')).toEqual([
			expect.objectContaining({ id: 'queued-message-1', ...USER_NOTE }),
		]);
	});
});

/**
 * A run whose first step never reaches a tool boundary on its own: the model returns
 * one tool call whose handler blocks until the interrupt fires. This is the Send-now
 * shape — the host stops a step in flight.
 */
async function runWithInterrupt() {
	let releaseHandler: () => void = () => {};
	const handlerGate = new Promise<void>((resolve) => {
		releaseHandler = resolve;
	});
	const model = new MockLanguageModelV3({
		provider: 'mock',
		modelId: 'scripted-interrupt',
		doStream: [
			{
				stream: convertArrayToReadableStream<MockStreamPart>([
					{ type: 'stream-start', warnings: [] },
					{ type: 'text-start', id: 'txt-1' },
					{ type: 'text-delta', id: 'txt-1', delta: 'Working on it.' },
					{ type: 'text-end', id: 'txt-1' },
					{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'slow', input: '{}' },
					{
						type: 'finish',
						finishReason: { unified: 'tool-calls', raw: 'tool_calls' },
						usage: USAGE,
					},
				]),
			},
			{
				stream: convertArrayToReadableStream<MockStreamPart>([
					{ type: 'stream-start', warnings: [] },
					{ type: 'text-start', id: 'txt-2' },
					{ type: 'text-delta', id: 'txt-2', delta: 'Switched direction.' },
					{ type: 'text-end', id: 'txt-2' },
					{ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: USAGE },
				]),
			},
		],
	});
	const memory = new InMemoryMemory();
	const interrupt = new AbortController();
	const drainForces: Array<boolean | undefined> = [];
	let secondStepReached = false;
	const runtime = new AgentRuntime({
		name: 'interrupt-test',
		model,
		instructions: 'Work.',
		tools: [
			{
				name: 'slow',
				description: 'Blocks until released',
				inputSchema: z.object({}),
				handler: async () => {
					// The host interrupts while this call is in flight.
					interrupt.abort();
					await handlerGate;
					return { done: true };
				},
			},
		],
		eventBus: new AgentEventBus(),
		memory,
	});
	const result = await runtime.stream('Do the thing.', {
		persistence: PERSISTENCE,
		smoothStream: false,
		interruptSignal: interrupt.signal,
		steeringInput: ({ force }) => {
			drainForces.push(force);
			if (force) {
				releaseHandler();
				return [{ id: 'qm-1', text: 'Stop and do this instead.' }];
			}
			secondStepReached = true;
			return [];
		},
	});
	const chunks: StreamChunk[] = [];
	const reader = result.stream.getReader();
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	return { model, chunks, drainForces, secondStepReached, result };
}

describe('steering input — interrupt', () => {
	it('stops the step in flight and starts the next one with the steered message', async () => {
		const { model, chunks, drainForces, result } = await runWithInterrupt();

		// The interrupted step's drain is the forced one, and the loop reached the
		// next step rather than ending the run.
		expect(drainForces[0]).toBe(true);
		expect(model.doStreamCalls).toHaveLength(2);
		expect(chunks.filter((chunk) => chunk.type === 'error')).toEqual([]);
		expect(chunks.at(-1)).toMatchObject({ type: 'finish' });

		// The steered text reached the second model call.
		expect(model.doStreamCalls[1].prompt).toContainEqual({
			role: 'user',
			content: [{ type: 'text', text: 'Stop and do this instead.' }],
		});
		expect(result.runId).toBeTruthy();
	});

	it('leaves the run alive, not cancelled', async () => {
		const { result } = await runWithInterrupt();

		expect(result.getState().status).not.toBe('cancelled');
	});
});
