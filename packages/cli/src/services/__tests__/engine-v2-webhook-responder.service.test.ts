import type { Logger } from '@n8n/backend-common';
import type { EngineConfig } from '@n8n/config';
import type { ExecutionResponse } from '@n8n/engine';
import { createDeferredPromise, type IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { ENCODED_BUFFER_KEY } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { createExecutionIdV2 } from '@/executions/execution-id';
import type { ExecutionResponseReceiver } from '@/modules/engine-v2/response-channel/execution-response-receiver';
import {
	EngineV2WebhookResponder,
	MAX_PENDING_WEBHOOKS,
	SUBSCRIBE_TIMEOUT_MS,
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

const newResponder = (timeoutMs = TIMEOUT_MS) =>
	new EngineV2WebhookResponder(
		mock<EngineConfig>({ webhookResponseTimeout: timeoutMs }),
		mock<Logger>({ scoped: () => mock<Logger>() }),
	);

describe('EngineV2WebhookResponder', () => {
	let deliver: (response: ExecutionResponse) => void;
	let responder: EngineV2WebhookResponder;

	beforeEach(() => {
		vi.useFakeTimers();
		const fake = fakeReceiver();
		deliver = fake.deliver;
		responder = newResponder();
		responder.useReceiver(fake.receiver);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('listens under the id the run is started with', async () => {
		const executionId = createExecutionIdV2();

		expect((await responder.waitForResponse(executionId)).executionId).toBe(executionId);
	});

	it('refuses to listen before the host hands over a receiver', async () => {
		await expect(newResponder().waitForResponse(createExecutionIdV2())).rejects.toThrow(
			'without a receiver',
		);
	});

	it('refuses a run once it listens for as many as it can hold', async () => {
		for (let i = 0; i < MAX_PENDING_WEBHOOKS; i++) {
			await responder.waitForResponse(createExecutionIdV2());
		}

		// Refused before dispatch, so no run starts that nothing can answer.
		await expect(responder.waitForResponse(createExecutionIdV2())).rejects.toThrow(
			'Try again later',
		);
	});

	it('listens again once an answered run releases its slot', async () => {
		const pending = await Promise.all(
			Array.from(
				{ length: MAX_PENDING_WEBHOOKS },
				async () => await responder.waitForResponse(createExecutionIdV2()),
			),
		);

		pending[0].release();

		await expect(responder.waitForResponse(createExecutionIdV2())).resolves.toBeDefined();
	});

	it('leaves an unrelated pending run unaffected', async () => {
		const other = await responder.waitForResponse(createExecutionIdV2());
		const pending = await responder.waitForResponse(createExecutionIdV2());

		deliver(endedResponse(pending.executionId));

		await expect(pending.settled).resolves.toMatchObject({ status: 'completed' });

		const stillPending = Symbol('still pending');
		await expect(Promise.race([other.settled, Promise.resolve(stillPending)])).resolves.toBe(
			stillPending,
		);
	});

	it('reports the step the run ended with', async () => {
		const pending = await responder.waitForResponse(createExecutionIdV2());

		deliver(endedResponse(pending.executionId));

		await expect(pending.settled).resolves.toEqual({
			status: 'completed',
			lastNode: { nodeName: 'A', outputs: [[{ json: { a: 1 } }]] },
		});
	});

	it('reports no last node when that step produced nothing', async () => {
		const pending = await responder.waitForResponse(createExecutionIdV2());

		deliver(
			endedResponse(pending.executionId, {
				lastStep: { nodeId: 'c', nodeName: 'C', status: 'skipped', outputs: null },
			}),
		);

		await expect(pending.settled).resolves.toEqual({ status: 'completed', lastNode: undefined });
	});

	it('reports the response produced by the Respond node', async () => {
		const pending = await responder.waitForResponse(createExecutionIdV2(), true);

		deliver({
			type: 'response',
			executionId: pending.executionId,
			payload: { body: { ok: true }, headers: {}, statusCode: 200 },
		});

		await expect(pending.settled).resolves.toEqual({
			status: 'response',
			response: { body: { ok: true }, headers: {}, statusCode: 200 },
		});
	});

	it('restores a Buffer body the data plane sent as a base64 envelope', async () => {
		const pending = await responder.waitForResponse(createExecutionIdV2(), true);
		const bytes = Buffer.from([0x00, 0xff, 0x10]);
		const headers = { 'content-type': 'application/octet-stream', 'content-length': 3 };

		deliver({
			type: 'response',
			executionId: pending.executionId,
			payload: {
				body: { [ENCODED_BUFFER_KEY]: bytes.toString('base64') },
				headers,
				statusCode: 201,
			},
		});

		const outcome = await pending.settled;
		expect(outcome).toEqual({
			status: 'response',
			response: { body: bytes, headers, statusCode: 201 },
		});
		expect(Buffer.isBuffer((outcome as { response: { body: unknown } }).response.body)).toBe(true);
	});

	it('keeps the first terminal outcome', async () => {
		const pending = await responder.waitForResponse(createExecutionIdV2(), true);

		deliver({
			type: 'response',
			executionId: pending.executionId,
			payload: { body: { ok: true }, headers: {}, statusCode: 200 },
		});
		deliver(endedResponse(pending.executionId));

		await expect(pending.settled).resolves.toMatchObject({ status: 'response' });
	});

	it('ignores a Respond node result when the response mode waits for the last node', async () => {
		const pending = await responder.waitForResponse(createExecutionIdV2());

		deliver({
			type: 'response',
			executionId: pending.executionId,
			payload: { body: { ignored: true }, headers: {}, statusCode: 200 },
		});
		deliver(endedResponse(pending.executionId));

		await expect(pending.settled).resolves.toMatchObject({ status: 'completed' });
	});

	it('reports a failure with the node that caused it', async () => {
		const pending = await responder.waitForResponse(createExecutionIdV2());

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
		const pending = await responder.waitForResponse(createExecutionIdV2());

		deliver({
			type: 'undeliverable',
			executionId: pending.executionId,
			error: { code: 'RESPONSE_TOO_LARGE', message: 'The response is too large.' },
		});

		await expect(pending.settled).resolves.toEqual({
			status: 'undeliverable',
			error: { name: 'RESPONSE_TOO_LARGE', message: 'The response is too large.' },
		});
	});

	it('times out rather than waiting forever for a lost answer', async () => {
		const impatient = newResponder(1);
		impatient.useReceiver(fakeReceiver().receiver);

		const pending = await impatient.waitForResponse(createExecutionIdV2());
		await vi.advanceTimersByTimeAsync(1);
		await expect(pending.settled).resolves.toEqual({
			status: 'timeout',
		});
	});

	it('drops later responses for a released run', async () => {
		const pending = await responder.waitForResponse(createExecutionIdV2());
		pending.release();

		deliver(endedResponse(pending.executionId));

		await expect(Promise.race([pending.settled, Promise.resolve('still waiting')])).resolves.toBe(
			'still waiting',
		);
	});

	it('refuses a second wait for the same execution', async () => {
		const executionId = createExecutionIdV2();
		await responder.waitForResponse(executionId);

		await expect(responder.waitForResponse(executionId)).rejects.toThrow(
			'already waits for a response for this execution',
		);
	});
});

describe('EngineV2WebhookResponder while the receiver subscribes', () => {
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
		const responder = newResponder();
		responder.useReceiver(receiver);

		for (let i = 0; i < MAX_PENDING_WEBHOOKS; i++) {
			void responder.waitForResponse(createExecutionIdV2());
		}

		await expect(responder.waitForResponse(createExecutionIdV2())).rejects.toThrow(
			'Try again later',
		);
	});

	it('frees the slot and the timer when the subscription fails', async () => {
		const { receiver, subscriptions } = slowReceiver();
		const responder = newResponder();
		responder.useReceiver(receiver);
		const executionId = createExecutionIdV2();

		const failed = responder.waitForResponse(executionId);
		await vi.waitFor(() => expect(subscriptions).toHaveLength(1));
		subscriptions[0].reject(new Error('Redis is unavailable'));

		await expect(failed).rejects.toThrow('Redis is unavailable');
		expect(vi.getTimerCount()).toBe(0);

		const retried = responder.waitForResponse(executionId);
		await vi.waitFor(() => expect(subscriptions).toHaveLength(2));
		subscriptions[1].resolve(() => {});
		await expect(retried).resolves.toBeDefined();
	});

	it('gives up at the subscribe timeout and drops a late subscription', async () => {
		const { receiver, subscriptions } = slowReceiver();
		// The response timeout is shorter, but it must not end the subscribe wait.
		const responder = newResponder(1_000);
		responder.useReceiver(receiver);
		const executionId = createExecutionIdV2();

		let settled = false;
		const waiting = responder.waitForResponse(executionId).finally(() => {
			settled = true;
		});
		const rejection = expect(waiting).rejects.toThrow(`within ${SUBSCRIBE_TIMEOUT_MS / 1000}s`);

		await vi.advanceTimersByTimeAsync(SUBSCRIBE_TIMEOUT_MS - 1);
		expect(settled).toBe(false);

		await vi.advanceTimersByTimeAsync(1);
		await rejection;
		expect(vi.getTimerCount()).toBe(0);

		const unsubscribe = vi.fn();
		subscriptions[0].resolve(unsubscribe);
		await vi.waitFor(() => expect(unsubscribe).toHaveBeenCalledTimes(1));

		// The slot is free again.
		const retried = responder.waitForResponse(executionId);
		await vi.waitFor(() => expect(subscriptions).toHaveLength(2));
		subscriptions[1].resolve(() => {});
		await expect(retried).resolves.toBeDefined();
	});
});
