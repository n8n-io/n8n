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

const TIMEOUT_MS = 50_000;

const runEnd = { kind: 'runEnd' } as const;
const stepResponse = { kind: 'stepResponse' } as const;

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

	const stillPending = Symbol('still pending');
	const raceWithPending = async (outcome: Promise<unknown>) =>
		await Promise.race([outcome, Promise.resolve(stillPending)]);

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
