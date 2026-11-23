import type { StreamChunk, StreamResult } from '@n8n/agents';
import type { InstanceAiEvent } from '@n8n/api-types';

import { streamTurn, type StreamTurnOptions } from '../stream-turn';

function streamOf(runId: string, chunks: StreamChunk[], cancel?: () => void): StreamResult {
	return {
		runId,
		stream: new ReadableStream<StreamChunk>({
			start(controller) {
				for (const chunk of chunks) controller.enqueue(chunk);
				controller.close();
			},
			cancel,
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
	const cancelStream = vi.fn();
	const agent = {
		stream: vi.fn(async () => await Promise.resolve(streamOf('agent-run', first, cancelStream))),
		resume: vi.fn(async () => await Promise.resolve(streamOf('agent-run', resumed))),
	};
	const answerSuspension = vi.fn<StreamTurnOptions['answerSuspension']>(
		async () => await Promise.resolve({ approved: true }),
	);
	const options: StreamTurnOptions = {
		agent: agent as unknown as StreamTurnOptions['agent'],
		input: 'Hi',
		executionOptions: { maxIterations: 5 },
		runId: 'run-1',
		agentId: 'orchestrator',
		signal: new AbortController().signal,
		onEvent: (event) => events.push(event),
		answerSuspension,
	};
	return { agent, answerSuspension, cancelStream, events, options };
}

describe('streamTurn', () => {
	it('turns the chunks of the stream into events and reports the finish reason', async () => {
		const { agent, events, options } = setup([
			{ type: 'tool-call', toolCallId: 'call-1', toolName: 'load_skill', input: { name: 'a' } },
			finish('stop'),
		]);

		const result = await streamTurn(options);

		expect(result).toEqual({ status: 'completed', finishReason: 'stop' });
		expect(agent.stream).toHaveBeenCalledWith('Hi', {
			maxIterations: 5,
			abortSignal: options.signal,
		});
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
		const persistence = { threadId: 'thread-1', resourceId: 'user-1' };
		const { agent, answerSuspension, events, options } = setup(
			[suspended('call-1'), suspended('call-2'), finish('paused')],
			[{ type: 'tool-call', toolCallId: 'call-3', toolName: 'list_workflows', input: {} }],
		);

		const result = await streamTurn({ ...options, persistence });

		// The resumed stream ended without a finish chunk.
		expect(result).toEqual({ status: 'completed', finishReason: undefined });
		expect(answerSuspension).toHaveBeenCalledTimes(1);
		expect(answerSuspension).toHaveBeenCalledWith(
			expect.objectContaining({ toolCallId: 'call-1', requestId: 'request-call-1' }),
		);
		// The resume gets the same options again, except the thread, which the run keeps.
		const executionOptions = { maxIterations: 5, abortSignal: options.signal };
		expect(agent.stream).toHaveBeenCalledWith('Hi', { ...executionOptions, persistence });
		expect(agent.resume).toHaveBeenCalledWith(
			'stream',
			{ approved: true },
			{ ...executionOptions, runId: 'agent-run', toolCallId: 'call-1' },
		);
		expect(events.map((event) => event.type)).toEqual(['confirmation-request', 'tool-call']);
	});

	it('ends the turn at a suspended tool call that gets no answer', async () => {
		const { agent, answerSuspension, options } = setup([suspended('call-1'), finish('paused')]);
		answerSuspension.mockResolvedValue(undefined);

		const result = await streamTurn(options);

		expect(result).toEqual({ status: 'suspended', finishReason: 'paused' });
		expect(agent.resume).not.toHaveBeenCalled();
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

	it('stops reading and cancels the stream when the signal aborts', async () => {
		const controller = new AbortController();
		const { cancelStream, events, options } = setup([
			{ type: 'tool-call', toolCallId: 'call-1', toolName: 'load_skill', input: {} },
			finish('stop'),
		]);
		controller.abort();

		const result = await streamTurn({ ...options, signal: controller.signal });

		expect(result).toEqual({ status: 'cancelled' });
		expect(events).toEqual([]);
		expect(cancelStream).toHaveBeenCalledTimes(1);
	});
});
