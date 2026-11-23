import type { StreamChunk, StreamResult } from '@n8n/agents';
import type { InstanceAiEvent } from '@n8n/api-types';

import { streamTurn, type StreamTurnOptions } from '../stream-turn';

function streamOf(runId: string, chunks: StreamChunk[]): StreamResult {
	return {
		runId,
		stream: new ReadableStream<StreamChunk>({
			start(controller) {
				for (const chunk of chunks) controller.enqueue(chunk);
				controller.close();
			},
		}),
		getState: () => ({}) as ReturnType<StreamResult['getState']>,
	};
}

const finish = (finishReason: 'stop' | 'paused'): StreamChunk => ({ type: 'finish', finishReason });

const suspended = (toolCallId: string): StreamChunk => ({
	type: 'tool-call-suspended',
	runId: 'agent-run',
	toolCallId,
	toolName: 'ask_user',
	suspendPayload: { requestId: `request-${toolCallId}`, message: 'Continue?' },
});

function setup(first: StreamChunk[], resumed: StreamChunk[] = []) {
	const events: InstanceAiEvent[] = [];
	const agent = {
		stream: vi.fn(async () => await Promise.resolve(streamOf('agent-run', first))),
		resume: vi.fn(async () => await Promise.resolve(streamOf('agent-run', resumed))),
	};
	const answerSuspension = vi.fn(async () => await Promise.resolve({ approved: true }));
	const options: StreamTurnOptions = {
		agent: agent as unknown as StreamTurnOptions['agent'],
		input: 'Hi',
		streamOptions: { maxIterations: 5 },
		runId: 'run-1',
		agentId: 'orchestrator',
		signal: new AbortController().signal,
		onEvent: (event) => events.push(event),
		answerSuspension,
	};
	return { agent, answerSuspension, events, options };
}

describe('streamTurn', () => {
	it('turns the chunks of the stream into events and reports the finish reason', async () => {
		const { agent, events, options } = setup([
			{ type: 'tool-call', toolCallId: 'call-1', toolName: 'load_skill', input: { name: 'a' } },
			finish('stop'),
		]);

		const result = await streamTurn(options);

		expect(result).toEqual({ status: 'completed', finishReason: 'stop' });
		expect(agent.stream).toHaveBeenCalledWith('Hi', { maxIterations: 5 });
		expect(events).toEqual([
			{
				type: 'tool-call',
				runId: 'run-1',
				agentId: 'orchestrator',
				payload: { toolCallId: 'call-1', toolName: 'load_skill', args: { name: 'a' } },
			},
		]);
	});

	it('answers a suspended tool call and continues with the resumed stream', async () => {
		const guardrails = { hooks: [] };
		const { agent, answerSuspension, events, options } = setup(
			[suspended('call-1'), suspended('call-2'), finish('paused')],
			[{ type: 'tool-call', toolCallId: 'call-3', toolName: 'list_workflows', input: {} }],
		);

		const result = await streamTurn({ ...options, resumeOptions: { guardrails } });

		// The resumed stream ended without a finish chunk.
		expect(result).toEqual({ status: 'completed', finishReason: undefined });
		expect(answerSuspension).toHaveBeenCalledTimes(1);
		expect(answerSuspension).toHaveBeenCalledWith(
			expect.objectContaining({ toolCallId: 'call-1', requestId: 'request-call-1' }),
		);
		expect(agent.resume).toHaveBeenCalledWith(
			'stream',
			{ approved: true },
			{ guardrails, runId: 'agent-run', toolCallId: 'call-1' },
		);
		expect(events.map((event) => event.type)).toEqual(['confirmation-request', 'tool-call']);
	});

	it('acknowledges an input boundary', async () => {
		const acknowledge = vi.fn();
		const { options } = setup([{ type: 'input-boundary', acknowledge }, finish('stop')]);

		await streamTurn(options);

		expect(acknowledge).toHaveBeenCalledTimes(1);
	});

	it('reports a stream with an error chunk as errored', async () => {
		const { options } = setup([{ type: 'error', error: new Error('boom') }]);

		expect((await streamTurn(options)).status).toBe('errored');
	});

	it('stops reading when the signal aborts', async () => {
		const controller = new AbortController();
		const { events, options } = setup([
			{ type: 'tool-call', toolCallId: 'call-1', toolName: 'load_skill', input: {} },
			finish('stop'),
		]);
		controller.abort();

		const result = await streamTurn({ ...options, signal: controller.signal });

		expect(result).toEqual({ status: 'cancelled' });
		expect(events).toEqual([]);
	});
});
