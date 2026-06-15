import * as aiModule from 'ai';
import type { Mock } from 'vitest';

import type { AgentRuntimeConfig } from '../../runtime/agent-runtime';
import type { AgentEventBus } from '../../runtime/event-bus';
import { AgentEvent } from '../../runtime/event-bus';
import type { StreamChunk } from '../../types';
import { Agent } from '../agent';

vi.mock('@ai-sdk/openai', () => ({
	createOpenAI: () => () => ({ provider: 'openai', modelId: 'mock', specificationVersion: 'v3' }),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type AiImport = typeof import('ai');

vi.mock('ai', async () => {
	const actual = await vi.importActual<AiImport>('ai');
	return {
		...actual,
		generateText: vi.fn(),
	};
});

const { generateText } = aiModule as unknown as {
	generateText: Mock;
};

type ActiveRuntime = {
	bus: AgentEventBus;
};

type AgentInternals = {
	ensureBuilt(): Promise<AgentRuntimeConfig>;
	createRuntime(config: AgentRuntimeConfig, runId?: string): ActiveRuntime;
	trackStreamRuntime(
		stream: ReadableStream<StreamChunk>,
		active: ActiveRuntime,
	): ReadableStream<StreamChunk>;
	cleanupRuntime(active: ActiveRuntime): Promise<void>;
	activeRuntimes: Set<ActiveRuntime>;
};

function makeGenerateSuccess(text: string) {
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

describe('Agent isolated runtimes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('keeps result state bound to the runtime that produced it', async () => {
		generateText
			.mockResolvedValueOnce(makeGenerateSuccess('first response'))
			.mockResolvedValueOnce(makeGenerateSuccess('second response'));
		const agent = new Agent('agent').model('openai/gpt-4o-mini').instructions('test');

		const first = await agent.generate('first');
		const second = await agent.generate('second');

		expect(first.getState().messageList.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					content: expect.arrayContaining([expect.objectContaining({ text: 'first response' })]),
				}),
			]),
		);
		expect(second.getState().messageList.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					content: expect.arrayContaining([expect.objectContaining({ text: 'second response' })]),
				}),
			]),
		);
	});

	it('applies event handler changes to active runtimes', async () => {
		const agent = new Agent('agent').model('openai/gpt-4o-mini').instructions('test');
		const internals = agent as unknown as AgentInternals;
		const active = internals.createRuntime(await internals.ensureBuilt());
		const handler = vi.fn();

		agent.on(AgentEvent.AgentEnd, handler);
		active.bus.emit({ type: AgentEvent.AgentEnd, messages: [] });
		agent.off(AgentEvent.AgentEnd, handler);
		active.bus.emit({ type: AgentEvent.AgentEnd, messages: [] });

		expect(handler).toHaveBeenCalledTimes(1);
		await internals.cleanupRuntime(active);
	});

	it('cleans up the active runtime when a wrapped stream is cancelled', async () => {
		const agent = new Agent('agent').model('openai/gpt-4o-mini').instructions('test');
		const internals = agent as unknown as AgentInternals;
		const active = internals.createRuntime(await internals.ensureBuilt());
		const sourceCancel = vi.fn();
		const stream = internals.trackStreamRuntime(
			new ReadableStream<StreamChunk>({
				start(controller) {
					controller.enqueue({ type: 'start-step' });
				},
				cancel: sourceCancel,
			}),
			active,
		);
		const reader = stream.getReader();

		expect(internals.activeRuntimes.has(active)).toBe(true);
		await reader.read();
		await reader.cancel('client disconnected');
		reader.releaseLock();

		expect(sourceCancel).toHaveBeenCalledWith('client disconnected');
		expect(internals.activeRuntimes.has(active)).toBe(false);
	});
});
