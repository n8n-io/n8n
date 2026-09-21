import type { Logger } from '@n8n/backend-common';
import type { EngineConfig } from '@n8n/config';
import type { ExecutionResponse, ExecutionResponseReceiver } from '@n8n/engine';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { IExecuteResponsePromiseData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { createExecutionIdV2 } from '@/executions/execution-id';
import { EXECUTION_ENDED_WITHOUT_RESPONSE } from '@/webhooks/constants';
import {
	EngineV2WebhookResponder,
	MAX_PENDING_WEBHOOKS,
	type ResponseStream,
	type WaitOptions,
} from '@/services/engine-v2-webhook-responder.service';

const TIMEOUT_MS = 50_000;

/**
 * Stands in for the receiver. Only `src/modules/engine-v2/**` may import
 * `@n8n/engine` at runtime, and the receiver's own suite covers the frame round
 * trip; what matters here is what the responder does with a response.
 *
 * Handlers are per execution, as the real receiver's are. A response for
 * another run reaches nobody.
 */
function fakeReceiver() {
	const handlers = new Map<string, Array<(response: ExecutionResponse) => void>>();

	return {
		receiver: {
			receive: (executionId: string, handler: (r: ExecutionResponse) => void) => {
				const forExecution = handlers.get(executionId) ?? [];
				handlers.set(executionId, [...forExecution, handler]);

				return () => handlers.delete(executionId);
			},
		} as unknown as ExecutionResponseReceiver,
		deliver: (response: ExecutionResponse) =>
			handlers.get(response.executionId)?.forEach((h) => h(response)),
	};
}

const endedResponse = (executionId: string, overrides: Record<string, unknown> = {}) => ({
	type: 'ended' as const,
	executionId,
	workflowId: 'wf-1',
	status: 'completed' as const,
	lastStep: {
		nodeId: 'a',
		nodeName: 'A',
		status: 'completed' as const,
		outputs: [[{ json: { a: 1 } }]],
	},
	...overrides,
});

const newResponder = (timeoutMs = TIMEOUT_MS) =>
	new EngineV2WebhookResponder(
		mock<EngineConfig>({ webhookResponseTimeout: timeoutMs }),
		mock<Logger>({ scoped: () => mock<Logger>() }),
	);

const waitForResponse = (
	responder: EngineV2WebhookResponder,
	executionId: ReturnType<typeof createExecutionIdV2>,
	options: Omit<WaitOptions, 'responseStream'> & { responseStream?: ResponseStream },
) => responder.waitForResponse(executionId, { responseStream: mock<ResponseStream>(), ...options });

describe('EngineV2WebhookResponder', () => {
	let deliver: (response: ExecutionResponse) => void;
	let responder: EngineV2WebhookResponder;

	beforeEach(() => {
		const fake = fakeReceiver();
		deliver = fake.deliver;
		responder = newResponder();
		responder.useReceiver(fake.receiver);
	});

	it('listens under the id the run is started with', () => {
		const executionId = createExecutionIdV2();

		expect(waitForResponse(responder, executionId, { responseMode: 'lastNode' }).executionId).toBe(
			executionId,
		);
	});

	it('refuses to listen before the host hands over a receiver', () => {
		expect(() =>
			waitForResponse(newResponder(), createExecutionIdV2(), { responseMode: 'lastNode' }),
		).toThrow('without a receiver');
	});

	it('refuses a run once it listens for as many as it can hold', () => {
		for (let i = 0; i < MAX_PENDING_WEBHOOKS; i++) {
			waitForResponse(responder, createExecutionIdV2(), { responseMode: 'lastNode' });
		}

		// Refused before dispatch, so no run starts that nothing can answer.
		expect(() =>
			waitForResponse(responder, createExecutionIdV2(), { responseMode: 'lastNode' }),
		).toThrow('Try again later');
	});

	it('listens again once an answered run releases its slot', () => {
		const pending = Array.from({ length: MAX_PENDING_WEBHOOKS }, () =>
			waitForResponse(responder, createExecutionIdV2(), { responseMode: 'lastNode' }),
		);

		pending[0].release();

		expect(() =>
			waitForResponse(responder, createExecutionIdV2(), { responseMode: 'lastNode' }),
		).not.toThrow();
	});

	it('leaves an unrelated pending run unaffected', async () => {
		const other = waitForResponse(responder, createExecutionIdV2(), { responseMode: 'lastNode' });
		const pending = waitForResponse(responder, createExecutionIdV2(), { responseMode: 'lastNode' });

		deliver(endedResponse(pending.executionId));

		await expect(pending.settled).resolves.toMatchObject({ status: 'completed' });

		const stillPending = Symbol('still pending');
		await expect(Promise.race([other.settled, Promise.resolve(stillPending)])).resolves.toBe(
			stillPending,
		);
	});

	it('reports the step the run ended with', async () => {
		const pending = waitForResponse(responder, createExecutionIdV2(), { responseMode: 'lastNode' });

		deliver(endedResponse(pending.executionId));

		await expect(pending.settled).resolves.toEqual({
			status: 'completed',
			lastNode: { nodeName: 'A', outputs: [[{ json: { a: 1 } }]] },
		});
	});

	it('reports no last node when that step produced nothing', async () => {
		const pending = waitForResponse(responder, createExecutionIdV2(), { responseMode: 'lastNode' });

		deliver(
			endedResponse(pending.executionId, {
				lastStep: { nodeId: 'c', nodeName: 'C', status: 'skipped', outputs: null },
			}),
		);
		await expect(pending.settled).resolves.toEqual({ status: 'completed', lastNode: undefined });
	});

	it('does not deliver chunks in a non-streaming mode', () => {
		const responseStream = mock<ResponseStream>();
		const pending = waitForResponse(responder, createExecutionIdV2(), {
			responseMode: 'lastNode',
			responseStream,
		});

		deliver({
			type: 'chunk',
			executionId: pending.executionId,
			payload: { type: 'item', content: 'ignored' },
		});

		expect(responseStream.write).not.toHaveBeenCalled();
		pending.release();
	});

	it('resolves the response promise when the Respond node answers', async () => {
		const responsePromise = createDeferredPromise<IExecuteResponsePromiseData>();
		const pending = waitForResponse(responder, createExecutionIdV2(), {
			responseMode: 'responseNode',
			responsePromise,
		});

		deliver({
			type: 'response',
			executionId: pending.executionId,
			payload: { body: { ok: true }, headers: {}, statusCode: 200 },
		});

		await expect(responsePromise.promise).resolves.toMatchObject({ body: { ok: true } });
	});

	it('rejects the response promise when the response fails', async () => {
		const responsePromise = createDeferredPromise<IExecuteResponsePromiseData>();
		const pending = waitForResponse(responder, createExecutionIdV2(), {
			responseMode: 'responseNode',
			responsePromise,
		});

		deliver({
			type: 'failure',
			executionId: pending.executionId,
			error: { code: 'RESPONSE_TOO_LARGE', message: 'The response is too large.' },
		});

		await expect(responsePromise.promise).rejects.toThrow('The response is too large.');
	});

	it('stands the response promise down when the Respond node never ran', async () => {
		const responsePromise = createDeferredPromise<IExecuteResponsePromiseData>();
		const pending = waitForResponse(responder, createExecutionIdV2(), {
			responseMode: 'responseNode',
			responsePromise,
		});

		deliver(endedResponse(pending.executionId));

		await expect(responsePromise.promise).resolves.toBe(EXECUTION_ENDED_WITHOUT_RESPONSE);
	});

	it('writes a chunk to the open response as one NDJSON line', () => {
		const responseStream = mock<ResponseStream>({ writableEnded: false });
		const pending = waitForResponse(responder, createExecutionIdV2(), {
			responseMode: 'streaming',
			responseStream,
		});

		const chunk = { type: 'item', content: 'hi' };
		deliver({ type: 'chunk', executionId: pending.executionId, payload: chunk });

		expect(responseStream.write).toHaveBeenCalledWith(JSON.stringify(chunk) + '\n');
		expect(responseStream.flush).toHaveBeenCalledTimes(1);
		pending.release();
	});

	describe('streaming heartbeat', () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it('writes and flushes a keepalive after 30 seconds', async () => {
			vi.useFakeTimers();
			const responseStream = mock<ResponseStream>({ writableEnded: false, destroyed: false });
			const pending = waitForResponse(responder, createExecutionIdV2(), {
				responseMode: 'streaming',
				responseStream,
			});

			await vi.advanceTimersByTimeAsync(30_000);

			expect(responseStream.write).toHaveBeenCalledWith('{"type":"keepalive"}\n');
			expect(responseStream.flush).toHaveBeenCalledTimes(1);
			pending.release();
		});

		it.each(['finish', 'close'] as const)('stops after the response emits %s', async (event) => {
			vi.useFakeTimers();
			const responseStream = mock<ResponseStream>({ writableEnded: false });
			const pending = waitForResponse(responder, createExecutionIdV2(), {
				responseMode: 'streaming',
				responseStream,
			});
			const handler = responseStream.once.mock.calls.find(
				([registered]) => registered === event,
			)?.[1];

			handler?.();
			await vi.advanceTimersByTimeAsync(30_000);

			expect(responseStream.write).not.toHaveBeenCalled();
			pending.release();
		});

		it('stops when the pending response is released', async () => {
			vi.useFakeTimers();
			const responseStream = mock<ResponseStream>({ writableEnded: false });
			const pending = waitForResponse(responder, createExecutionIdV2(), {
				responseMode: 'streaming',
				responseStream,
			});

			pending.release();
			await vi.advanceTimersByTimeAsync(30_000);

			expect(responseStream.write).not.toHaveBeenCalled();
		});

		it('does not start for non-streaming delivery', () => {
			const setIntervalSpy = vi.spyOn(global, 'setInterval');
			const pending = waitForResponse(responder, createExecutionIdV2(), {
				responseMode: 'lastNode',
			});

			expect(setIntervalSpy).not.toHaveBeenCalled();
			pending.release();
		});
	});

	it('ends a successful stream without an error chunk', async () => {
		const responseStream = mock<ResponseStream>();
		const pending = waitForResponse(responder, createExecutionIdV2(), {
			responseMode: 'streaming',
			responseStream,
		});

		deliver(endedResponse(pending.executionId));
		await pending.settled;

		expect(responseStream.write).not.toHaveBeenCalled();
		expect(responseStream.end).toHaveBeenCalled();
	});

	it('writes one fallback error chunk before a failed stream ends', async () => {
		const responseStream = mock<ResponseStream>();
		const pending = waitForResponse(responder, createExecutionIdV2(), {
			responseMode: 'streaming',
			responseStream,
		});

		deliver(
			endedResponse(pending.executionId, {
				status: 'failed',
				lastStep: {
					nodeId: 'c',
					nodeName: 'C',
					status: 'failed',
					outputs: null,
					error: { name: 'NodeOperationError', message: 'it broke' },
				},
			}),
		);
		await pending.settled;

		expect(responseStream.write).toHaveBeenCalledTimes(1);
		expect(responseStream.write).toHaveBeenCalledWith(expect.stringContaining('"type":"error"'));
		expect(responseStream.flush).toHaveBeenCalledTimes(1);
		expect(responseStream.write.mock.invocationCallOrder[0]).toBeLessThan(
			responseStream.end.mock.invocationCallOrder[0]!,
		);
	});

	it('does not add a fallback error after the executor sent one', async () => {
		const responseStream = mock<ResponseStream>();
		const pending = waitForResponse(responder, createExecutionIdV2(), {
			responseMode: 'streaming',
			responseStream,
		});
		const errorChunk = {
			type: 'error' as const,
			content: 'it broke',
			metadata: {
				nodeId: 'c',
				nodeName: 'C',
				runIndex: 0,
				itemIndex: 0,
				timestamp: 1,
			},
		};

		deliver({ type: 'chunk', executionId: pending.executionId, payload: errorChunk });
		deliver(
			endedResponse(pending.executionId, {
				status: 'failed',
				lastStep: {
					nodeId: 'c',
					nodeName: 'C',
					status: 'failed',
					outputs: null,
					error: { name: 'NodeOperationError', message: 'it broke' },
				},
			}),
		);
		await pending.settled;

		expect(responseStream.write).toHaveBeenCalledTimes(1);
		expect(responseStream.write).toHaveBeenCalledWith(`${JSON.stringify(errorChunk)}\n`);
		expect(responseStream.end).toHaveBeenCalledTimes(1);
	});

	it('reports a failure with the node that caused it', async () => {
		const pending = waitForResponse(responder, createExecutionIdV2(), { responseMode: 'lastNode' });

		deliver(
			endedResponse(pending.executionId, {
				status: 'failed',
				lastStep: {
					nodeId: 'c',
					nodeName: 'C',
					status: 'failed',
					outputs: null,
					error: { name: 'NodeOperationError', message: 'it broke' },
				},
			}),
		);

		await expect(pending.settled).resolves.toEqual({
			status: 'failed',
			nodeName: 'C',
			error: { name: 'NodeOperationError', message: 'it broke' },
		});
	});

	it('reports a response failure without attributing it to a node', async () => {
		const pending = waitForResponse(responder, createExecutionIdV2(), { responseMode: 'lastNode' });

		deliver({
			type: 'failure',
			executionId: pending.executionId,
			error: { code: 'RESPONSE_TOO_LARGE', message: 'The response is too large.' },
		});

		await expect(pending.settled).resolves.toEqual({
			status: 'failed',
			error: { name: 'RESPONSE_TOO_LARGE', message: 'The response is too large.' },
		});
	});

	it('writes and flushes a channel failure before it ends and settles the stream', async () => {
		const flush = vi.fn();
		const responseStream = mock<ResponseStream>({ flush });
		const pending = waitForResponse(responder, createExecutionIdV2(), {
			responseMode: 'streaming',
			responseStream,
		});

		deliver({
			type: 'failure',
			executionId: pending.executionId,
			error: { code: 'RESPONSE_TOO_LARGE', message: 'The response is too large.' },
		});

		await expect(pending.settled).resolves.toEqual({
			status: 'failed',
			error: { name: 'RESPONSE_TOO_LARGE', message: 'The response is too large.' },
		});
		expect(responseStream.write).toHaveBeenCalledWith(
			expect.stringContaining('"nodeId":"unknown","nodeName":"unknown","runIndex":0,"itemIndex":0'),
		);
		expect(responseStream.flush).toHaveBeenCalledTimes(1);
		expect(responseStream.end).toHaveBeenCalledTimes(1);
		expect(flush.mock.invocationCallOrder[0]).toBeLessThan(
			responseStream.end.mock.invocationCallOrder[0]!,
		);
	});

	it('times out rather than waiting forever for a lost answer', async () => {
		const impatient = newResponder(1);
		impatient.useReceiver(fakeReceiver().receiver);

		await expect(
			waitForResponse(impatient, createExecutionIdV2(), { responseMode: 'lastNode' }).settled,
		).resolves.toEqual({
			status: 'timeout',
		});
	});

	it('drops later responses for a released run', async () => {
		const pending = waitForResponse(responder, createExecutionIdV2(), { responseMode: 'lastNode' });
		pending.release();

		deliver(endedResponse(pending.executionId));

		await expect(Promise.race([pending.settled, Promise.resolve('still waiting')])).resolves.toBe(
			'still waiting',
		);
	});
});
