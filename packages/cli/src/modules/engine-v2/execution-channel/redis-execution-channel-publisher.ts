import type { Logger } from '@n8n/backend-common';
import type { ExecutionChannelPublisher, ExecutionChannelTopic } from '@n8n/engine';

import type { RedisExecutionChannelNameGenerator } from './redis-execution-channel';

/**
 * How long (in ms) shutdown waits for in-flight publishes. Redis queues commands
 * while it is down, so an unbounded wait could hold shutdown open.
 */
export const SHUTDOWN_DRAIN_TIMEOUT_MS = 5_000;

export interface RedisChannelPublisher {
	publish(channel: string, message: string): Promise<unknown>;
	disconnect(): void;
}

/** Learns once how a publish ended. A publish still in flight at shutdown counts as failed. */
export interface PublishObserver {
	settled(failed: boolean): void;
}

/** Publishes serialized frames to execution-specific Redis channels. */
export class RedisExecutionChannelPublisher implements ExecutionChannelPublisher {
	private stopped = false;

	private readonly inFlightPublishes = new Set<Promise<unknown>>();

	private readonly pendingObservers = new Set<PublishObserver>();

	constructor(
		private readonly publisher: RedisChannelPublisher,
		private readonly getChannelName: RedisExecutionChannelNameGenerator,
		private readonly logger: Logger,
	) {}

	publish(
		topic: ExecutionChannelTopic,
		executionId: string,
		frame: string,
		observer?: PublishObserver,
	): void {
		if (this.stopped) {
			observer?.settled(true);
			return;
		}

		let failed = false;
		let publishTask: Promise<unknown>;
		try {
			publishTask = this.publisher
				.publish(this.getChannelName(topic, executionId), frame)
				.catch((error: unknown) => {
					failed = true;
					this.logger.error('Failed to publish to the execution channel', {
						topic,
						executionId,
						error,
					});
				})
				.finally(() => {
					this.settle(observer, failed);
					this.inFlightPublishes.delete(publishTask);
				});
		} catch (error) {
			observer?.settled(true);
			throw error;
		}
		if (observer) this.pendingObservers.add(observer);
		this.inFlightPublishes.add(publishTask);
	}

	async stop(): Promise<void> {
		if (this.stopped) return;

		this.stopped = true;
		await this.drainInFlightPublishes();
		// Before the disconnect, so no observer waits on a publish that can no longer finish.
		for (const observer of this.pendingObservers) this.settle(observer, true);
		this.publisher.disconnect();
	}

	private settle(observer: PublishObserver | undefined, failed: boolean): void {
		if (!observer || !this.pendingObservers.delete(observer)) return;

		observer.settled(failed);
	}

	/** Gives in-flight publishes a bounded time to reach Redis before it disconnects. */
	private async drainInFlightPublishes(): Promise<void> {
		if (this.inFlightPublishes.size === 0) return;

		let timer: NodeJS.Timeout | undefined;
		const timeout = new Promise<void>((resolve) => {
			timer = setTimeout(resolve, SHUTDOWN_DRAIN_TIMEOUT_MS);
		});
		try {
			await Promise.race([Promise.allSettled(this.inFlightPublishes), timeout]);
		} finally {
			clearTimeout(timer);
		}

		if (this.inFlightPublishes.size > 0) {
			this.logger.warn('Execution channel frames were still being published at shutdown', {
				count: this.inFlightPublishes.size,
			});
		}
	}
}
