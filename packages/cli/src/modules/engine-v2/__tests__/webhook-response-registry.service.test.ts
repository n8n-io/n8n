import type { Logger } from '@n8n/backend-common';
import type { EngineConfig } from '@n8n/config';
import type { ExecutionResponse } from '@n8n/engine';
import { createDeferredPromise, type IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import { createExecutionIdV2 } from '@/executions/execution-id';
import type { ExecutionResponseReceiver } from '@/modules/engine-v2/response-channel/execution-response-receiver';
import {
	EngineV2WebhookResponseRegistry,
	MAX_PENDING_WEBHOOKS,
	SUBSCRIBE_TIMEOUT_MS,
} from '@/modules/engine-v2/webhook-response/webhook-response-registry.service';
import type { ResponseStream } from '@/webhooks/streaming-webhook-response-heartbeat';

const TIMEOUT_MS = 50_000;

const runEnd = { kind: 'runEnd' } as const;
const stepResponse = { kind: 'stepResponse' } as const;
const stream = { kind: 'stream' } as const;

/**
 * Stands in for the receiver. Only `src/modules/engine-v2/**` may import
 * `@n8n/engine` at runtime, and the receiver's own suite covers the frame round
 * trip; what matters here is what the registry does with a response.
 *
 * Handlers are per execution, as the real receiver's are. A response for
 * another run reaches nobody.
 */
function fakeReceiver() {
	const handlers = new Map<string, Array<(response: ExecutionResponse) => void>>();

	return {
		receiver: {
			receive: async (executionId: string, handler: (r: ExecutionResponse) => void) => {
				const forExecution = handlers.get(executionId) ?? [];
				handlers.set(executionId, [...forExecution, handler]);

				return () => handlers.delete(executionId);
			},
			stop: async () => {},
		} satisfies ExecutionResponseReceiver,
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

const newRegistry = (timeoutMs = TIMEOUT_MS) =>
	new EngineV2WebhookResponseRegistry(
		mock<EngineConfig>({ webhookResponseTimeout: timeoutMs }),
		mock<Logger>({ scoped: () => mock<Logger>() }),
	);

const stillPending = Symbol('still pending');
const raceWithPending = async (outcome: Promise<unknown>) =>
	await Promise.race([outcome, Promise.resolve(stillPending)]);

describe('EngineV2WebhookResponseRegistry', () => {
	let deliver: (response: ExecutionResponse) => void;
	let registry: EngineV2WebhookResponseRegistry;

	beforeEach(() => {
		vi.useFakeTimers();
		const fake = fakeReceiver();
		deliver = fake.deliver;
		registry = newRegistry();
		registry.useReceiver(fake.receiver);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('listens under the id the run is started with', async () => {
		const executionId = createExecutionIdV2();

		expect((await registry.waitForResponse(executionId, runEnd)).executionId).toBe(executionId);
	});

	it('refuses to listen before the host hands over a receiver', async () => {
		await expect(newRegistry().waitForResponse(createExecutionIdV2(), runEnd)).rejects.toThrow(
			'without a receiver',
		);
	});

	it('refuses a run once it listens for as many as it can hold', async () => {
		for (let i = 0; i < MAX_PENDING_WEBHOOKS; i++) {
			await registry.waitForResponse(createExecutionIdV2(), runEnd);
		}

		// Refused before dispatch, so no run starts that nothing can answer.
		await expect(registry.waitForResponse(createExecutionIdV2(), runEnd)).rejects.toThrow(
			'Try again later',
		);
	});

	const fillToCapacity = async () =>
		await Promise.all(
			Array.from(
				{ length: MAX_PENDING_WEBHOOKS },
				async () => await registry.waitForResponse(createExecutionIdV2(), runEnd),
			),
		);

	it('listens again once a released run frees its slot', async () => {
		const pending = await fillToCapacity();

		pending[0].release();

		await expect(registry.waitForResponse(createExecutionIdV2(), runEnd)).resolves.toBeDefined();
	});

	it('frees the slot and the timer once the run answers', async () => {
		const pending = await fillToCapacity();

		deliver(endedResponse(pending[0].executionId));
		await pending[0].outcome;

		await expect(registry.waitForResponse(createExecutionIdV2(), runEnd)).resolves.toBeDefined();
		// Only the timers of the runs that still wait remain.
		expect(vi.getTimerCount()).toBe(MAX_PENDING_WEBHOOKS);
	});

	it('leaves an unrelated pending run unaffected', async () => {
		const other = await registry.waitForResponse(createExecutionIdV2(), runEnd);
		const pending = await registry.waitForResponse(createExecutionIdV2(), runEnd);

		deliver(endedResponse(pending.executionId));

		await expect(pending.outcome).resolves.toMatchObject({ status: 'completed' });
		await expect(raceWithPending(other.outcome)).resolves.toBe(stillPending);
	});

	it('settles with the outcome of the response', async () => {
		const pending = await registry.waitForResponse(createExecutionIdV2(), runEnd);

		deliver(endedResponse(pending.executionId));

		await expect(pending.outcome).resolves.toEqual({
			status: 'completed',
			lastNode: { nodeName: 'A', outputs: [[{ json: { a: 1 } }]] },
		});
	});

	it('keeps the first terminal outcome', async () => {
		const pending = await registry.waitForResponse(createExecutionIdV2(), stepResponse);

		deliver({
			type: 'response',
			executionId: pending.executionId,
			payload: { body: { ok: true }, headers: {}, statusCode: 200 },
		});
		deliver(endedResponse(pending.executionId));

		await expect(pending.outcome).resolves.toMatchObject({ status: 'response' });
	});

	it('keeps waiting when a response does not answer the expectation', async () => {
		const pending = await registry.waitForResponse(createExecutionIdV2(), runEnd);

		deliver({
			type: 'response',
			executionId: pending.executionId,
			payload: { body: { ignored: true }, headers: {}, statusCode: 200 },
		});
		await expect(raceWithPending(pending.outcome)).resolves.toBe(stillPending);

		deliver(endedResponse(pending.executionId));
		await expect(pending.outcome).resolves.toMatchObject({ status: 'completed' });
	});

	it('times out rather than waiting forever for a lost answer', async () => {
		const impatient = newRegistry(1);
		impatient.useReceiver(fakeReceiver().receiver);

		const pending = await impatient.waitForResponse(createExecutionIdV2(), runEnd);
		await vi.advanceTimersByTimeAsync(1);
		await expect(pending.outcome).resolves.toEqual({
			status: 'timeout',
		});

		// The timed-out run frees its slot on its own.
		await expect(impatient.waitForResponse(pending.executionId, runEnd)).resolves.toBeDefined();
	});

	it('drops later responses for a released run', async () => {
		const pending = await registry.waitForResponse(createExecutionIdV2(), runEnd);
		pending.release();

		deliver(endedResponse(pending.executionId));

		await expect(raceWithPending(pending.outcome)).resolves.toBe(stillPending);
	});

	it('ignores a late release after the slot is taken again', async () => {
		const executionId = createExecutionIdV2();
		const first = await registry.waitForResponse(executionId, runEnd);
		deliver(endedResponse(executionId));
		await first.outcome;

		const second = await registry.waitForResponse(executionId, runEnd);
		first.release();

		await expect(registry.waitForResponse(executionId, runEnd)).rejects.toThrow(
			'already waits for a response for this execution',
		);
		deliver(endedResponse(executionId));
		await expect(second.outcome).resolves.toMatchObject({ status: 'completed' });
	});

	it('refuses a second wait for the same execution', async () => {
		const executionId = createExecutionIdV2();
		await registry.waitForResponse(executionId, runEnd);

		await expect(registry.waitForResponse(executionId, runEnd)).rejects.toThrow(
			'already waits for a response for this execution',
		);
	});
});

describe('EngineV2WebhookResponseRegistry with a streaming request', () => {
	let deliver: (response: ExecutionResponse) => void;
	let registry: EngineV2WebhookResponseRegistry;

	beforeEach(() => {
		vi.useFakeTimers();
		const fake = fakeReceiver();
		deliver = fake.deliver;
		registry = newRegistry();
		registry.useReceiver(fake.receiver);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const failedStep = {
		status: 'failed',
		lastStep: {
			nodeId: 'c',
			nodeName: 'C',
			status: 'failed',
			outputs: null,
			error: { name: 'NodeOperationError', message: 'it broke' },
		},
	};

	const openStream = () => mock<ResponseStream>({ writableEnded: false, destroyed: false });

	const waitForStream = async (responseStream: ResponseStream) =>
		await registry.waitForResponse(createExecutionIdV2(), stream, responseStream);

	it('refuses to wait for a stream without a response stream', async () => {
		await expect(registry.waitForResponse(createExecutionIdV2(), stream)).rejects.toThrow(
			'without a response stream',
		);
	});

	it.each([runEnd, stepResponse, { kind: 'none' } as const])(
		'does not write chunks when the expectation is %j',
		async (expectation) => {
			const responseStream = openStream();
			const pending = await registry.waitForResponse(
				createExecutionIdV2(),
				expectation,
				responseStream,
			);

			deliver({
				type: 'chunk',
				executionId: pending.executionId,
				payload: { type: 'item', content: 'ignored' },
			});
			deliver(endedResponse(pending.executionId));
			await pending.outcome;

			expect(responseStream.write).not.toHaveBeenCalled();
			expect(responseStream.end).not.toHaveBeenCalled();
		},
	);

	it('writes a chunk to the open response as one NDJSON line', async () => {
		const responseStream = openStream();
		const pending = await waitForStream(responseStream);

		const chunk = { type: 'item', content: 'hi' };
		deliver({ type: 'chunk', executionId: pending.executionId, payload: chunk });

		expect(responseStream.write).toHaveBeenCalledWith(JSON.stringify(chunk) + '\n');
		expect(responseStream.flush).toHaveBeenCalledTimes(1);
		pending.release();
	});

	it('ignores a Respond node result', async () => {
		const responseStream = openStream();
		const pending = await waitForStream(responseStream);

		deliver({
			type: 'response',
			executionId: pending.executionId,
			payload: { body: { ignored: true }, headers: {}, statusCode: 200 },
		});
		deliver(endedResponse(pending.executionId));

		await expect(pending.outcome).resolves.toMatchObject({ status: 'completed' });
		expect(responseStream.write).not.toHaveBeenCalled();
	});

	it('ends a successful stream without an error chunk', async () => {
		const responseStream = openStream();
		const pending = await waitForStream(responseStream);

		deliver(endedResponse(pending.executionId));
		await pending.outcome;

		expect(responseStream.write).not.toHaveBeenCalled();
		expect(responseStream.end).toHaveBeenCalledTimes(1);
	});

	it('writes one fallback error chunk before a failed stream ends', async () => {
		const responseStream = openStream();
		const pending = await waitForStream(responseStream);

		deliver(endedResponse(pending.executionId, failedStep));
		await pending.outcome;

		expect(responseStream.write).toHaveBeenCalledTimes(1);
		expect(responseStream.write).toHaveBeenCalledWith(
			expect.stringContaining('"nodeId":"c","nodeName":"C"'),
		);
		// The error message stays out of the stream.
		expect(responseStream.write).toHaveBeenCalledWith(
			expect.stringContaining('"content":"Workflow execution failed"'),
		);
		expect(responseStream.write).not.toHaveBeenCalledWith(expect.stringContaining('it broke'));
		expect(responseStream.flush).toHaveBeenCalledTimes(1);
		expect(responseStream.write.mock.invocationCallOrder[0]).toBeLessThan(
			responseStream.end.mock.invocationCallOrder[0],
		);
	});

	it('does not add a fallback error after the executor sent one', async () => {
		const responseStream = openStream();
		const pending = await waitForStream(responseStream);
		const errorChunk = {
			type: 'error' as const,
			content: 'it broke',
			metadata: { nodeId: 'c', nodeName: 'C', runIndex: 0, itemIndex: 0, timestamp: 1 },
		};

		deliver({ type: 'chunk', executionId: pending.executionId, payload: errorChunk });
		deliver(endedResponse(pending.executionId, failedStep));
		await pending.outcome;

		expect(responseStream.write).toHaveBeenCalledTimes(1);
		expect(responseStream.write).toHaveBeenCalledWith(`${JSON.stringify(errorChunk)}\n`);
		expect(responseStream.end).toHaveBeenCalledTimes(1);
	});

	it('writes and flushes an undeliverable response before it ends the stream', async () => {
		const flush = vi.fn();
		const responseStream = mock<ResponseStream>({ writableEnded: false, flush });
		const pending = await waitForStream(responseStream);

		deliver({
			type: 'undeliverable',
			executionId: pending.executionId,
			error: { code: 'RESPONSE_TOO_LARGE', message: 'The response is too large.' },
		});

		await expect(pending.outcome).resolves.toEqual({
			status: 'undeliverable',
			error: { name: 'RESPONSE_TOO_LARGE', message: 'The response is too large.' },
		});
		expect(responseStream.write).toHaveBeenCalledWith(
			expect.stringContaining('"nodeId":"unknown","nodeName":"unknown","runIndex":0,"itemIndex":0'),
		);
		expect(flush).toHaveBeenCalledTimes(1);
		expect(responseStream.end).toHaveBeenCalledTimes(1);
		expect(flush.mock.invocationCallOrder[0]).toBeLessThan(
			responseStream.end.mock.invocationCallOrder[0],
		);
	});

	it('writes an error chunk and ends the stream when the wait times out', async () => {
		const impatient = newRegistry(1);
		impatient.useReceiver(fakeReceiver().receiver);
		const responseStream = openStream();

		const pending = await impatient.waitForResponse(createExecutionIdV2(), stream, responseStream);
		await vi.advanceTimersByTimeAsync(1);

		await expect(pending.outcome).resolves.toEqual({ status: 'timeout' });
		expect(responseStream.write).toHaveBeenCalledTimes(1);
		expect(responseStream.write).toHaveBeenCalledWith(
			expect.stringContaining('"type":"error","content":"Workflow execution timed out"'),
		);
		expect(responseStream.end).toHaveBeenCalledTimes(1);
		expect(responseStream.write.mock.invocationCallOrder[0]).toBeLessThan(
			responseStream.end.mock.invocationCallOrder[0],
		);
	});

	it('measures the timeout from the last chunk', async () => {
		const fake = fakeReceiver();
		const impatient = newRegistry(1_000);
		impatient.useReceiver(fake.receiver);
		const responseStream = openStream();
		const pending = await impatient.waitForResponse(createExecutionIdV2(), stream, responseStream);
		const chunk = {
			type: 'chunk' as const,
			executionId: pending.executionId,
			payload: { type: 'item', content: 'hi' },
		};

		await vi.advanceTimersByTimeAsync(900);
		fake.deliver(chunk);
		await vi.advanceTimersByTimeAsync(900);
		fake.deliver(chunk);
		await vi.advanceTimersByTimeAsync(900);

		// 2.7 seconds in total, but never 1 second of silence.
		await expect(raceWithPending(pending.outcome)).resolves.toBe(stillPending);

		await vi.advanceTimersByTimeAsync(100);
		await expect(pending.outcome).resolves.toEqual({ status: 'timeout' });
	});

	it('does not measure the timeout from chunks when the request does not wait for a stream', async () => {
		const fake = fakeReceiver();
		const impatient = newRegistry(1_000);
		impatient.useReceiver(fake.receiver);
		const pending = await impatient.waitForResponse(createExecutionIdV2(), runEnd);

		await vi.advanceTimersByTimeAsync(900);
		fake.deliver({
			type: 'chunk',
			executionId: pending.executionId,
			payload: { type: 'item', content: 'ignored' },
		});
		await vi.advanceTimersByTimeAsync(100);

		await expect(pending.outcome).resolves.toEqual({ status: 'timeout' });
	});

	it('drops chunks after the run settles', async () => {
		const responseStream = openStream();
		const pending = await waitForStream(responseStream);

		deliver(endedResponse(pending.executionId));
		await pending.outcome;
		deliver({
			type: 'chunk',
			executionId: pending.executionId,
			payload: { type: 'item', content: 'late' },
		});

		expect(responseStream.write).not.toHaveBeenCalled();
	});

	it('leaves the stream to the caller when the caller releases the wait', async () => {
		const responseStream = openStream();
		const pending = await waitForStream(responseStream);

		pending.release();

		expect(responseStream.end).not.toHaveBeenCalled();
	});

	describe('heartbeat', () => {
		it('writes and flushes a keepalive after 30 seconds', async () => {
			const responseStream = openStream();
			const pending = await waitForStream(responseStream);

			await vi.advanceTimersByTimeAsync(30_000);

			expect(responseStream.write).toHaveBeenCalledWith('{"type":"keepalive"}\n');
			expect(responseStream.flush).toHaveBeenCalledTimes(1);
			pending.release();
		});

		it.each(['finish', 'close'] as const)('stops after the response emits %s', async (event) => {
			const responseStream = openStream();
			const pending = await waitForStream(responseStream);
			const handler = responseStream.once.mock.calls.find(
				([registered]) => registered === event,
			)?.[1];

			handler?.();
			await vi.advanceTimersByTimeAsync(30_000);

			expect(responseStream.write).not.toHaveBeenCalled();
			pending.release();
		});

		it('stops when the wait is released', async () => {
			const responseStream = openStream();
			const pending = await waitForStream(responseStream);

			pending.release();
			await vi.advanceTimersByTimeAsync(30_000);

			expect(responseStream.write).not.toHaveBeenCalled();
		});

		it('stops when the subscription fails', async () => {
			const failing = newRegistry();
			failing.useReceiver({
				receive: async () => {
					throw new Error('Redis is unavailable');
				},
				stop: async () => {},
			});
			const responseStream = openStream();

			await expect(
				failing.waitForResponse(createExecutionIdV2(), stream, responseStream),
			).rejects.toThrow('Redis is unavailable');
			await vi.advanceTimersByTimeAsync(30_000);

			expect(responseStream.write).not.toHaveBeenCalled();
		});

		it('does not start for a request that does not wait for a stream', async () => {
			const setIntervalSpy = vi.spyOn(global, 'setInterval');
			const pending = await registry.waitForResponse(createExecutionIdV2(), runEnd);

			expect(setIntervalSpy).not.toHaveBeenCalled();
			pending.release();
		});
	});
});

describe('EngineV2WebhookResponseRegistry while the receiver subscribes', () => {
	/** A receiver whose subscriptions complete only when the test says so. */
	function slowReceiver() {
		const subscriptions: Array<IDeferredPromise<() => void>> = [];

		return {
			receiver: {
				receive: async () => {
					const subscription = createDeferredPromise<() => void>();
					subscriptions.push(subscription);
					return await subscription.promise;
				},
				stop: async () => {},
			} satisfies ExecutionResponseReceiver,
			subscriptions,
		};
	}

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('counts runs that are still subscribing against the limit', async () => {
		const { receiver } = slowReceiver();
		const registry = newRegistry();
		registry.useReceiver(receiver);

		for (let i = 0; i < MAX_PENDING_WEBHOOKS; i++) {
			void registry.waitForResponse(createExecutionIdV2(), runEnd);
		}

		await expect(registry.waitForResponse(createExecutionIdV2(), runEnd)).rejects.toThrow(
			'Try again later',
		);
	});

	it('frees the slot and the timer when the subscription fails', async () => {
		const { receiver, subscriptions } = slowReceiver();
		const registry = newRegistry();
		registry.useReceiver(receiver);
		const executionId = createExecutionIdV2();

		const failed = registry.waitForResponse(executionId, runEnd);
		await vi.waitFor(() => expect(subscriptions).toHaveLength(1));
		subscriptions[0].reject(new Error('Redis is unavailable'));

		await expect(failed).rejects.toThrow('Redis is unavailable');
		expect(vi.getTimerCount()).toBe(0);

		const retried = registry.waitForResponse(executionId, runEnd);
		await vi.waitFor(() => expect(subscriptions).toHaveLength(2));
		subscriptions[1].resolve(() => {});
		await expect(retried).resolves.toBeDefined();
	});

	it('drops the subscription when the wait settles before it is ready', async () => {
		const { receiver, subscriptions } = slowReceiver();
		const registry = newRegistry(1_000);
		registry.useReceiver(receiver);

		const waiting = registry.waitForResponse(createExecutionIdV2(), runEnd);
		await vi.waitFor(() => expect(subscriptions).toHaveLength(1));
		await vi.advanceTimersByTimeAsync(1_000);

		const unsubscribe = vi.fn();
		subscriptions[0].resolve(unsubscribe);

		const pending = await waiting;
		await expect(pending.outcome).resolves.toEqual({ status: 'timeout' });
		expect(unsubscribe).toHaveBeenCalledTimes(1);
	});

	it('gives up at the subscribe timeout and drops a late subscription', async () => {
		const { receiver, subscriptions } = slowReceiver();
		// The response timeout is shorter, but it must not end the subscribe wait.
		const registry = newRegistry(1_000);
		registry.useReceiver(receiver);
		const executionId = createExecutionIdV2();

		let settled = false;
		const waiting = registry.waitForResponse(executionId, runEnd).finally(() => {
			settled = true;
		});
		const rejection = expect(waiting).rejects.toThrow(`within ${SUBSCRIBE_TIMEOUT_MS / 1000}s`);

		await vi.advanceTimersByTimeAsync(SUBSCRIBE_TIMEOUT_MS - 1);
		expect(settled).toBe(false);

		await vi.advanceTimersByTimeAsync(1);
		await rejection;
		expect(vi.getTimerCount()).toBe(0);

		// The slot is free before the late subscription completes.
		const retried = registry.waitForResponse(executionId, runEnd);
		await vi.waitFor(() => expect(subscriptions).toHaveLength(2));

		const unsubscribe = vi.fn();
		subscriptions[0].resolve(unsubscribe);
		await vi.waitFor(() => expect(unsubscribe).toHaveBeenCalledTimes(1));

		subscriptions[1].resolve(() => {});
		await expect(retried).resolves.toBeDefined();
	});
});
