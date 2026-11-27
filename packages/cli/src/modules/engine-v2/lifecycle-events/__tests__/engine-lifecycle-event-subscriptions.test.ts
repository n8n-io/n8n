import type { Logger } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import type { LifecycleEvent } from '@n8n/engine';
import { OperationalError } from '@n8n/errors';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { EngineV2PushRegistry } from '@/services/engine-v2-push-registry.service';

import type { EngineLifecycleEventPushRelay } from '../engine-lifecycle-event-push-relay';
import {
	EngineV2LifecycleSubscriptions,
	type LifecycleEventReceiver,
} from '../engine-lifecycle-event-subscriptions';
import { SUBSCRIBE_TIMEOUT_MS } from '../../webhook-response/webhook-response-registry.service';

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
	let scopedLogger: Logger;
	let subscriptions: EngineV2LifecycleSubscriptions;

	const register = (executionId = 'exec-1') =>
		registry.register(executionId, { pushRef: 'push-1', workflowId: 'wf-1' });

	beforeEach(() => {
		registry = new EngineV2PushRegistry();
		relay = mock<EngineLifecycleEventPushRelay>();
		receiver = mock<LifecycleEventReceiver>();
		unsubscribe = vi.fn<() => void>();
		receiver.receive.mockResolvedValue(unsubscribe);
		scopedLogger = mock<Logger>();
		const logger = mock<Logger>({ scoped: () => scopedLogger });
		subscriptions = new EngineV2LifecycleSubscriptions(registry, relay, logger);
		subscriptions.useReceiver(receiver);
	});

	it('refuses to subscribe without a receiver', async () => {
		const withoutReceiver = new EngineV2LifecycleSubscriptions(registry, relay, mockLogger());

		await expect(withoutReceiver.subscribe('exec-1')).rejects.toThrow('without a receiver');
		await expect(withoutReceiver.listen('exec-1', vi.fn())).rejects.toThrow('without a receiver');
	});

	it('refuses a second receiver', () => {
		expect(() => subscriptions.useReceiver(receiver)).toThrow('already set');
	});

	it('relays the events it receives to the editor', async () => {
		await subscriptions.subscribe('exec-1');
		const [executionId, handler] = receiver.receive.mock.calls[0];

		handler(completed);

		expect(executionId).toBe('exec-1');
		expect(relay.relay).toHaveBeenCalledExactlyOnceWith([completed]);
	});

	it('drops an event of another execution', async () => {
		const listener = vi.fn();
		await subscriptions.subscribe('exec-1');
		await subscriptions.listen('exec-1', listener);
		const [, handler] = receiver.receive.mock.calls[0];

		handler({ ...completed, executionId: 'exec-2' });

		expect(relay.relay).not.toHaveBeenCalled();
		expect(listener).not.toHaveBeenCalled();
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

	it('gives up for every caller when the subscription does not become active in time', async () => {
		vi.useFakeTimers();
		try {
			let activate: ((value: () => void) => void) | undefined;
			receiver.receive.mockReturnValue(
				new Promise((resolve) => {
					activate = resolve;
				}),
			);

			const timeoutMessage = `within ${SUBSCRIBE_TIMEOUT_MS / 1000}s`;
			const subscribing = expect(subscriptions.subscribe('exec-1')).rejects.toThrow(timeoutMessage);
			const listening = expect(subscriptions.listen('exec-1', vi.fn())).rejects.toThrow(
				timeoutMessage,
			);
			await vi.advanceTimersByTimeAsync(SUBSCRIBE_TIMEOUT_MS);
			await subscribing;
			await listening;

			// A subscription that completes late must not outlive the call.
			activate?.(unsubscribe);
			await vi.advanceTimersByTimeAsync(0);
			expect(unsubscribe).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});

	describe('listeners', () => {
		const activeLater = () => {
			let activate: ((value: () => void) => void) | undefined;
			receiver.receive.mockReturnValue(
				new Promise((resolve) => {
					activate = resolve;
				}),
			);
			return () => activate?.(unsubscribe);
		};

		it('shares one channel subscription between the editor and other listeners', async () => {
			const first = vi.fn();
			const second = vi.fn();
			await subscriptions.subscribe('exec-1');
			await subscriptions.listen('exec-1', first);
			await subscriptions.listen('exec-1', second);
			const [, handler] = receiver.receive.mock.calls[0];

			handler(completed);

			expect(receiver.receive).toHaveBeenCalledTimes(1);
			expect(relay.relay).toHaveBeenCalledExactlyOnceWith([completed]);
			expect(first).toHaveBeenCalledExactlyOnceWith(completed);
			expect(second).toHaveBeenCalledExactlyOnceWith(completed);
		});

		it('keeps the channel open for the other listeners when one listener is removed', async () => {
			const removed = vi.fn();
			const remaining = vi.fn();
			const remove = await subscriptions.listen('exec-1', removed);
			await subscriptions.listen('exec-1', remaining);
			const [, handler] = receiver.receive.mock.calls[0];

			remove();
			handler(completed);

			expect(unsubscribe).not.toHaveBeenCalled();
			expect(removed).not.toHaveBeenCalled();
			expect(remaining).toHaveBeenCalledExactlyOnceWith(completed);
		});

		it('closes the channel once when the last listener is removed', async () => {
			const removeFirst = await subscriptions.listen('exec-1', vi.fn());
			const removeSecond = await subscriptions.listen('exec-1', vi.fn());

			removeFirst();
			removeSecond();
			removeSecond();

			expect(unsubscribe).toHaveBeenCalledTimes(1);
		});

		it('opens a new channel subscription for a listener added after the channel closed', async () => {
			const remove = await subscriptions.listen('exec-1', vi.fn());
			remove();

			const removeNew = await subscriptions.listen('exec-1', vi.fn());
			remove();

			expect(receiver.receive).toHaveBeenCalledTimes(2);
			expect(unsubscribe).toHaveBeenCalledTimes(1);
			removeNew();
			expect(unsubscribe).toHaveBeenCalledTimes(2);
		});

		it('keeps the same function added twice as two listeners', async () => {
			const listener = vi.fn();
			const remove = await subscriptions.listen('exec-1', listener);
			await subscriptions.listen('exec-1', listener);
			const [, handler] = receiver.receive.mock.calls[0];

			remove();
			handler(completed);

			expect(listener).toHaveBeenCalledExactlyOnceWith(completed);
		});

		it('keeps another listener subscribed when the push session ends', async () => {
			const listener = vi.fn();
			register();
			await subscriptions.subscribe('exec-1');
			const remove = await subscriptions.listen('exec-1', listener);
			const [, handler] = receiver.receive.mock.calls[0];

			registry.release('exec-1');
			handler(completed);

			expect(unsubscribe).not.toHaveBeenCalled();
			expect(relay.relay).not.toHaveBeenCalled();
			expect(listener).toHaveBeenCalledExactlyOnceWith(completed);

			remove();
			expect(unsubscribe).toHaveBeenCalledTimes(1);
		});

		it('delivers an event to the other listeners and logs the error when one listener throws', async () => {
			const failing = vi.fn(() => {
				throw new Error('listener failed');
			});
			const healthy = vi.fn();
			await subscriptions.listen('exec-1', failing);
			await subscriptions.listen('exec-1', healthy);
			const [, handler] = receiver.receive.mock.calls[0];

			handler(completed);

			expect(healthy).toHaveBeenCalledExactlyOnceWith(completed);
			expect(scopedLogger.error).toHaveBeenCalledWith(
				'An engine v2 lifecycle event listener failed',
				expect.objectContaining({ executionId: 'exec-1', type: 'execution:completed' }),
			);
		});

		it("delivers a terminal event to the other listeners when the editor's session ends while handling it", async () => {
			const other = vi.fn();
			register();
			await subscriptions.subscribe('exec-1');
			const remove = await subscriptions.listen('exec-1', other);
			relay.relay.mockImplementation(() => registry.release('exec-1'));
			const [, handler] = receiver.receive.mock.calls[0];

			handler(completed);

			expect(relay.relay).toHaveBeenCalledExactlyOnceWith([completed]);
			expect(other).toHaveBeenCalledExactlyOnceWith(completed);
			expect(unsubscribe).not.toHaveBeenCalled();

			remove();
			expect(unsubscribe).toHaveBeenCalledTimes(1);
		});

		it('does not deliver the current event to a listener added while it is dispatched', async () => {
			const added = vi.fn();
			await subscriptions.listen('exec-1', async () => await subscriptions.listen('exec-1', added));
			const [, handler] = receiver.receive.mock.calls[0];

			handler(completed);

			expect(added).not.toHaveBeenCalled();
		});

		it('does not call a listener removed while an event is dispatched', async () => {
			const removed = vi.fn();
			let removeLater = () => {};
			await subscriptions.listen('exec-1', () => removeLater());
			removeLater = await subscriptions.listen('exec-1', removed);
			const [, handler] = receiver.receive.mock.calls[0];

			handler(completed);

			expect(removed).not.toHaveBeenCalled();
		});

		it('resolves concurrent listeners only once the shared subscription is active', async () => {
			const activate = activeLater();
			let firstResolved = false;
			let secondResolved = false;

			const first = subscriptions.listen('exec-1', vi.fn()).then(() => (firstResolved = true));
			const second = subscriptions.listen('exec-1', vi.fn()).then(() => (secondResolved = true));
			await new Promise(setImmediate);
			expect(firstResolved || secondResolved).toBe(false);

			activate();
			await Promise.all([first, second]);

			expect(firstResolved && secondResolved).toBe(true);
			expect(receiver.receive).toHaveBeenCalledTimes(1);
		});

		it('rejects every concurrent listener when the subscription fails and leaves nothing behind', async () => {
			const failed = vi.fn();
			receiver.receive.mockRejectedValueOnce(new Error('Redis is unavailable'));

			const results = await Promise.allSettled([
				subscriptions.listen('exec-1', failed),
				subscriptions.subscribe('exec-1'),
			]);

			expect(results).toEqual([
				{ status: 'rejected', reason: expect.any(OperationalError) },
				{ status: 'rejected', reason: expect.any(OperationalError) },
			]);

			const retried = vi.fn();
			await subscriptions.listen('exec-1', retried);
			await subscriptions.subscribe('exec-1');
			const [, handler] = receiver.receive.mock.calls[1];
			handler(completed);

			expect(receiver.receive).toHaveBeenCalledTimes(2);
			expect(failed).not.toHaveBeenCalled();
			expect(retried).toHaveBeenCalledExactlyOnceWith(completed);
			expect(relay.relay).toHaveBeenCalledExactlyOnceWith([completed]);
		});

		it('has a listener from the call to listen, before the subscription is active', async () => {
			const activate = activeLater();

			const listening = subscriptions.listen('exec-1', vi.fn());

			expect(subscriptions.hasListener('exec-1')).toBe(true);
			expect(subscriptions.hasListener('exec-2')).toBe(false);
			activate();
			await listening;
			expect(subscriptions.hasListener('exec-1')).toBe(true);
		});

		it('has no listener after the last listener is removed', async () => {
			const removeFirst = await subscriptions.listen('exec-1', vi.fn());
			const removeSecond = await subscriptions.listen('exec-1', vi.fn());

			removeFirst();
			expect(subscriptions.hasListener('exec-1')).toBe(true);
			removeSecond();
			expect(subscriptions.hasListener('exec-1')).toBe(false);
		});

		it('has no listener after the subscription fails', async () => {
			receiver.receive.mockRejectedValueOnce(new Error('Redis is unavailable'));

			await expect(subscriptions.listen('exec-1', vi.fn())).rejects.toThrow(OperationalError);

			expect(subscriptions.hasListener('exec-1')).toBe(false);
		});

		it('opens a new channel subscription for a listener added after a subscription timed out', async () => {
			vi.useFakeTimers();
			try {
				receiver.receive.mockReturnValueOnce(new Promise(() => {}));
				const timedOut = expect(subscriptions.listen('exec-1', vi.fn())).rejects.toThrow('within');
				await vi.advanceTimersByTimeAsync(SUBSCRIBE_TIMEOUT_MS);
				await timedOut;
				expect(subscriptions.hasListener('exec-1')).toBe(false);
				await expect(subscriptions.listen('exec-1', vi.fn())).resolves.toBeTypeOf('function');
				expect(receiver.receive).toHaveBeenCalledTimes(2);
			} finally {
				vi.useRealTimers();
			}
		});

		it('has no listener while the subscription of a removed editor listener is still pending', async () => {
			const activate = activeLater();
			register();
			const subscribing = subscriptions.subscribe('exec-1');
			registry.release('exec-1');

			expect(subscriptions.hasListener('exec-1')).toBe(false);
			activate();
			await subscribing;
		});

		it('reuses a pending subscription whose last listener was removed for a new listener', async () => {
			const activate = activeLater();
			const listener = vi.fn();
			register();

			const subscribing = subscriptions.subscribe('exec-1');
			registry.release('exec-1');
			const listening = subscriptions.listen('exec-1', listener);
			activate();
			await subscribing;
			await listening;
			const [, handler] = receiver.receive.mock.calls[0];
			handler(completed);

			expect(receiver.receive).toHaveBeenCalledTimes(1);
			expect(unsubscribe).not.toHaveBeenCalled();
			expect(listener).toHaveBeenCalledExactlyOnceWith(completed);
		});
	});
});
