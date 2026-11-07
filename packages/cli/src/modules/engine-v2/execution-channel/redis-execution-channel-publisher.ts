import type { Logger } from '@n8n/backend-common';

import type { ExecutionChannelPublisher, ExecutionChannelTopic } from './execution-channel';
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

/** Publishes serialized frames to execution-specific Redis channels. */
export class RedisExecutionChannelPublisher implements ExecutionChannelPublisher {
	private stopped = false;

	private readonly inFlightPublishes = new Set<Promise<unknown>>();

	constructor(
		private readonly publisher: RedisChannelPublisher,
		private readonly getChannelName: RedisExecutionChannelNameGenerator,
		private readonly logger: Logger,
	) {}

	publish(topic: ExecutionChannelTopic, executionId: string, frame: string): void {
		if (this.stopped) return;

		const publishTask: Promise<unknown> = this.publisher
			.publish(this.getChannelName(topic, executionId), frame)
			.catch((error: unknown) => {
				this.logger.error('Failed to publish to the execution channel', {
					topic,
					executionId,
					error,
				});
			})
			.finally(() => this.inFlightPublishes.delete(publishTask));
		this.inFlightPublishes.add(publishTask);
	}

	async stop(): Promise<void> {
		if (this.stopped) return;

		this.stopped = true;
		await this.drainInFlightPublishes();
		this.publisher.disconnect();
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
