import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { LifecycleEvent, UnsubscribeFromExecutionChannel } from '@n8n/engine';
import { OperationalError, UnexpectedError } from '@n8n/errors';

import { EngineV2PushRegistry } from '@/services/engine-v2-push-registry.service';

import { EngineLifecycleEventPushRelay } from './engine-lifecycle-event-push-relay';
import { SUBSCRIBE_TIMEOUT_MS } from '../webhook-response/webhook-response-registry.service';

/** Receives the lifecycle events of one execution, one event at a time. */
export interface LifecycleEventReceiver {
	receive(
		executionId: string,
		handler: (event: LifecycleEvent) => void,
	): Promise<UnsubscribeFromExecutionChannel>;
}

export type LifecycleEventListener = (event: LifecycleEvent) => void;

class SharedSubscription {
	readonly listeners = new Set<LifecycleEventListener>();

	/** Rejects when the subscription fails or times out. */
	readonly opened: Promise<void>;

	/** Set once the channel subscription is active. */
	unsubscribe?: UnsubscribeFromExecutionChannel;

	constructor(open: (shared: SharedSubscription) => Promise<void>) {
		this.opened = open(this);
	}
}

/**
 * Subscribes to the lifecycle events of executions and passes each event to
 * the listeners of its execution. The Redis channel allows one subscriber for
 * each execution, so the listeners of an execution share one subscription.
 *
 * The editor that watches a run is one listener. The main that starts the run
 * subscribes, and the push registry on the same main holds the session of the
 * run. The editor's listener ends with its push session.
 */
@Service()
export class EngineV2LifecycleSubscriptions {
	private receiver?: LifecycleEventReceiver;

	private readonly subscriptions = new Map<string, SharedSubscription>();

	/** Removes the editor's listener of each execution. */
	private readonly pushListeners = new Map<string, () => void>();

	constructor(
		private readonly pushRegistry: EngineV2PushRegistry,
		private readonly pushRelay: EngineLifecycleEventPushRelay,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('engine-v2');
		this.pushRegistry.onSessionEnd((executionId) => this.unsubscribe(executionId));
	}

	/** The host calls this once with the receiver for lifecycle events. */
	useReceiver(receiver: LifecycleEventReceiver): void {
		if (this.receiver) {
			throw new UnexpectedError('Engine v2 lifecycle event receiver is already set');
		}
		this.receiver = receiver;
	}

	/**
	 * Relays the lifecycle events of the execution to the editor, until its push
	 * session ends. Call this before the execution starts. Otherwise, the first
	 * events can arrive before the subscription is active, and they are not replayed.
	 *
	 * @throws {UnexpectedError} If the receiver is not set.
	 * @throws {OperationalError} If the subscription fails or does not become
	 * active within `SUBSCRIBE_TIMEOUT_MS`.
	 */
	async subscribe(executionId: string): Promise<void> {
		if (this.pushListeners.has(executionId)) return;

		const { opened, remove } = this.addListener(executionId, (event) =>
			this.pushRelay.relay([event]),
		);
		this.pushListeners.set(executionId, remove);
		try {
			await opened;
		} catch (error) {
			if (this.pushListeners.get(executionId) === remove) this.pushListeners.delete(executionId);
			remove();
			throw error;
		}
	}

	/** Removes the editor's listener. Other listeners keep the channel open. */
	unsubscribe(executionId: string): void {
		const remove = this.pushListeners.get(executionId);
		if (!remove) return;

		this.pushListeners.delete(executionId);
		remove();
	}

	/**
	 * Adds a listener for the lifecycle events of one execution, and resolves
	 * once the subscription is active. Call this before the execution starts.
	 * Events are not replayed.
	 *
	 * @returns A function that removes the listener.
	 * @throws {UnexpectedError} If the receiver is not set.
	 * @throws {OperationalError} If the subscription fails or does not become
	 * active within `SUBSCRIBE_TIMEOUT_MS`.
	 */
	async listen(executionId: string, listener: LifecycleEventListener): Promise<() => void> {
		const { opened, remove } = this.addListener(executionId, listener);
		try {
			await opened;
		} catch (error) {
			remove();
			throw error;
		}

		return remove;
	}

	/** A listener counts from the call to `listen`, also while the subscription is pending. */
	hasListener(executionId: string): boolean {
		return (this.subscriptions.get(executionId)?.listeners.size ?? 0) > 0;
	}

	private addListener(
		executionId: string,
		listener: LifecycleEventListener,
	): { opened: Promise<void>; remove: () => void } {
		const { receiver } = this;
		if (!receiver) {
			throw new UnexpectedError(
				'Engine v2 cannot subscribe to lifecycle events without a receiver',
			);
		}

		let subscription = this.subscriptions.get(executionId);
		if (!subscription) {
			subscription = new SharedSubscription(
				async (shared) => await this.open(receiver, executionId, shared),
			);
			this.subscriptions.set(executionId, subscription);
		}

		// A new function for each call, so that adding the same listener twice adds two listeners.
		const entry: LifecycleEventListener = (event) => listener(event);
		subscription.listeners.add(entry);

		const remove = () => {
			if (!subscription.listeners.delete(entry) || subscription.listeners.size > 0) return;
			// `open` closes a pending subscription once it is active.
			if (!subscription.unsubscribe) return;

			this.discard(executionId, subscription);
			subscription.unsubscribe();
		};

		return { opened: subscription.opened, remove };
	}

	private async open(
		receiver: LifecycleEventReceiver,
		executionId: string,
		shared: SharedSubscription,
	): Promise<void> {
		const subscription = receiver.receive(executionId, (event) =>
			this.dispatch(executionId, shared, event),
		);

		let timer: NodeJS.Timeout | undefined;
		const timedOut = new Promise<'timed-out'>((resolve) => {
			timer = setTimeout(() => resolve('timed-out'), SUBSCRIBE_TIMEOUT_MS).unref();
		});

		let result: UnsubscribeFromExecutionChannel | 'timed-out';
		try {
			result = await Promise.race([subscription, timedOut]);
		} catch (error) {
			this.discard(executionId, shared);
			throw new OperationalError('Engine v2 could not subscribe to the lifecycle events', {
				cause: error,
				extra: { executionId },
			});
		} finally {
			clearTimeout(timer);
		}

		if (result === 'timed-out') {
			this.discard(executionId, shared);
			// The subscription can still complete. It must not outlive this call.
			void subscription.then(
				(unsubscribe) => unsubscribe(),
				() => {},
			);
			throw new OperationalError(
				`Engine v2 could not subscribe to the lifecycle events within ${SUBSCRIBE_TIMEOUT_MS / 1000}s.`,
				{ extra: { executionId } },
			);
		}

		// The last listener can be removed while the subscription is pending.
		if (shared.listeners.size === 0) {
			this.discard(executionId, shared);
			result();
			return;
		}

		shared.unsubscribe = result;
	}

	private discard(executionId: string, shared: SharedSubscription): void {
		if (this.subscriptions.get(executionId) === shared) this.subscriptions.delete(executionId);
	}

	/** Listeners trust the execution id of the event, so the event must belong to the channel. */
	private dispatch(
		channelExecutionId: string,
		shared: SharedSubscription,
		event: LifecycleEvent,
	): void {
		if (event.executionId !== channelExecutionId) {
			this.logger.warn('Engine v2 dropped a lifecycle event of another execution', {
				executionId: channelExecutionId,
				eventExecutionId: event.executionId,
				type: event.type,
			});
			return;
		}

		for (const listener of [...shared.listeners]) {
			if (!shared.listeners.has(listener)) continue;
			try {
				listener(event);
			} catch (error) {
				this.logger.error('An engine v2 lifecycle event listener failed', {
					executionId: channelExecutionId,
					type: event.type,
					error,
				});
			}
		}
	}
}
