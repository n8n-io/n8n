import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { LifecycleEventBatch } from '@n8n/engine';
import { OperationalError, UnexpectedError } from 'n8n-workflow';

import { EngineV2PushRegistry } from '@/services/engine-v2-push-registry.service';

import { EngineLifecycleEventPushRelay } from './engine-lifecycle-event-push-relay';
import type { UnsubscribeFromExecutionChannel } from './execution-channel/execution-channel';

/** Receives the lifecycle events of one execution, one batch at a time. */
export interface LifecycleEventReceiver {
	receive(
		executionId: string,
		handler: (batch: LifecycleEventBatch) => void,
	): Promise<UnsubscribeFromExecutionChannel>;
}

/**
 * How long (in ms) a subscription can take. A transport can wait for its
 * broker, for example Redis while it reconnects.
 */
export const LIFECYCLE_SUBSCRIBE_TIMEOUT_MS = 30_000;

/**
 * Subscribes to the lifecycle events of the executions that an editor watches,
 * and relays the events to that editor.
 *
 * The main that starts a run subscribes, and the push registry on the same main
 * holds the session of the run. A subscription ends with its push session.
 */
@Service()
export class EngineV2LifecycleSubscriptions {
	private receiver?: LifecycleEventReceiver;

	private readonly subscriptions = new Map<string, UnsubscribeFromExecutionChannel>();

	/** Subscriptions that are not active yet. */
	private readonly pending = new Set<string>();

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
	 * Call this before the execution starts. Otherwise, the first events can
	 * arrive before the subscription is active, and they are not replayed.
	 *
	 * @throws {UnexpectedError} If the receiver is not set.
	 * @throws {OperationalError} If the subscription fails or does not become
	 * active within `LIFECYCLE_SUBSCRIBE_TIMEOUT_MS`.
	 */
	async subscribe(executionId: string): Promise<void> {
		const { receiver } = this;
		if (!receiver) {
			throw new UnexpectedError(
				'Engine v2 cannot subscribe to lifecycle events without a receiver',
			);
		}

		if (this.subscriptions.has(executionId) || this.pending.has(executionId)) return;

		this.pending.add(executionId);
		const subscription = receiver.receive(executionId, (batch) =>
			this.pushRelay.relay(batch.events),
		);

		let timer: NodeJS.Timeout | undefined;
		const timedOut = new Promise<'timed-out'>((resolve) => {
			timer = setTimeout(() => resolve('timed-out'), LIFECYCLE_SUBSCRIBE_TIMEOUT_MS).unref();
		});

		let result: UnsubscribeFromExecutionChannel | 'timed-out';
		try {
			result = await Promise.race([subscription, timedOut]);
		} catch (error) {
			this.pending.delete(executionId);
			throw new OperationalError('Engine v2 could not subscribe to the lifecycle events', {
				cause: error,
				extra: { executionId },
			});
		} finally {
			clearTimeout(timer);
		}

		if (result === 'timed-out') {
			this.pending.delete(executionId);
			// The subscription can still complete. It must not outlive this call.
			void subscription.then(
				(unsubscribe) => unsubscribe(),
				() => {},
			);
			throw new OperationalError(
				`Engine v2 could not subscribe to the lifecycle events within ${LIFECYCLE_SUBSCRIBE_TIMEOUT_MS / 1000}s.`,
				{ extra: { executionId } },
			);
		}

		// The session can end while the subscription is pending.
		if (!this.pending.delete(executionId)) {
			result();
			return;
		}

		this.subscriptions.set(executionId, result);
	}

	unsubscribe(executionId: string): void {
		this.pending.delete(executionId);

		const unsubscribe = this.subscriptions.get(executionId);
		if (!unsubscribe) return;

		this.subscriptions.delete(executionId);
		unsubscribe();
	}
}
