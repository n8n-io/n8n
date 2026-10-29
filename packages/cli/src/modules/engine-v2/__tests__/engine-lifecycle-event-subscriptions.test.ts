import { mockLogger } from '@n8n/backend-test-utils';
import type { LifecycleEvent } from '@n8n/engine';
import { OperationalError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { EngineV2PushRegistry } from '@/services/engine-v2-push-registry.service';

import type { EngineLifecycleEventPushRelay } from '../engine-lifecycle-event-push-relay';
import {
	EngineV2LifecycleSubscriptions,
	LIFECYCLE_SUBSCRIBE_TIMEOUT_MS,
	type LifecycleEventReceiver,
} from '../engine-lifecycle-event-subscriptions';

const completed: LifecycleEvent = {
	type: 'execution:completed',
	executionId: 'exec-1',
	workflowId: 'wf-1',
	at: '2026-10-29T10:00:00.000Z',
};

describe('EngineV2LifecycleSubscriptions', () => {
	let registry: EngineV2PushRegistry;
	let relay: ReturnType<typeof mock<EngineLifecycleEventPushRelay>>;
	let receiver: ReturnType<typeof mock<LifecycleEventReceiver>>;
	let unsubscribe: Mock<() => void>;
	let subscriptions: EngineV2LifecycleSubscriptions;

	const register = (executionId = 'exec-1') =>
		registry.register(executionId, { pushRef: 'push-1', workflowId: 'wf-1' });

	beforeEach(() => {
		registry = new EngineV2PushRegistry();
		relay = mock<EngineLifecycleEventPushRelay>();
		receiver = mock<LifecycleEventReceiver>();
		unsubscribe = vi.fn<() => void>();
		receiver.receive.mockResolvedValue(unsubscribe);
		subscriptions = new EngineV2LifecycleSubscriptions(registry, relay, mockLogger());
		subscriptions.useReceiver(receiver);
	});

	it('refuses to subscribe without a receiver', async () => {
		const withoutReceiver = new EngineV2LifecycleSubscriptions(registry, relay, mockLogger());

		await expect(withoutReceiver.subscribe('exec-1')).rejects.toThrow('without a receiver');
	});

	it('refuses a second receiver', () => {
		expect(() => subscriptions.useReceiver(receiver)).toThrow('already set');
	});

	it('relays the events it receives to the editor', async () => {
		await subscriptions.subscribe('exec-1');
		const [executionId, handler] = receiver.receive.mock.calls[0];

		handler({ events: [completed] });

		expect(executionId).toBe('exec-1');
		expect(relay.relay).toHaveBeenCalledExactlyOnceWith([completed]);
	});

	it('subscribes once for each execution', async () => {
		await subscriptions.subscribe('exec-1');
		await subscriptions.subscribe('exec-1');

		expect(receiver.receive).toHaveBeenCalledTimes(1);
	});

	it('unsubscribes when the push session is released', async () => {
		register();
		await subscriptions.subscribe('exec-1');

		registry.release('exec-1');

		expect(unsubscribe).toHaveBeenCalledTimes(1);
	});

	it('unsubscribes when the push session is evicted', async () => {
		vi.useFakeTimers();
		try {
			register();
			await subscriptions.subscribe('exec-1');

			// A new session sweeps out the sessions that have been idle for longer than the TTL.
			vi.advanceTimersByTime(13 * 60 * 60 * 1000);
			register('exec-2');

			expect(unsubscribe).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});

	it('unsubscribes when the session ends before the subscription is active', async () => {
		let activate: ((value: () => void) => void) | undefined;
		receiver.receive.mockReturnValue(
			new Promise((resolve) => {
				activate = resolve;
			}),
		);
		register();

		const subscribing = subscriptions.subscribe('exec-1');
		registry.release('exec-1');
		activate?.(unsubscribe);
		await subscribing;

		expect(unsubscribe).toHaveBeenCalledTimes(1);
		// A later release must not unsubscribe a second time.
		subscriptions.unsubscribe('exec-1');
		expect(unsubscribe).toHaveBeenCalledTimes(1);
	});

	it('reports a failed subscription as an operational error', async () => {
		receiver.receive.mockRejectedValue(new Error('Redis is unavailable'));

		const subscribing = subscriptions.subscribe('exec-1');

		await expect(subscribing).rejects.toThrow(OperationalError);
		await expect(subscribing).rejects.toThrow('could not subscribe');
	});

	it('can subscribe again after a failed subscription', async () => {
		receiver.receive.mockRejectedValueOnce(new Error('Redis is unavailable'));
		await subscriptions.subscribe('exec-1').catch(() => {});

		await subscriptions.subscribe('exec-1');

		expect(receiver.receive).toHaveBeenCalledTimes(2);
	});

	it('gives up when the subscription does not become active in time', async () => {
		vi.useFakeTimers();
		try {
			let activate: ((value: () => void) => void) | undefined;
			receiver.receive.mockReturnValue(
				new Promise((resolve) => {
					activate = resolve;
				}),
			);

			const subscribing = subscriptions.subscribe('exec-1');
			const rejection = expect(subscribing).rejects.toThrow(
				`within ${LIFECYCLE_SUBSCRIBE_TIMEOUT_MS / 1000}s`,
			);
			await vi.advanceTimersByTimeAsync(LIFECYCLE_SUBSCRIBE_TIMEOUT_MS);
			await rejection;

			// A subscription that completes late must not outlive the call.
			activate?.(unsubscribe);
			await vi.advanceTimersByTimeAsync(0);
			expect(unsubscribe).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});
});
