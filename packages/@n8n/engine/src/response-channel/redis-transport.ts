import { EventEmitter } from 'node:events';

import type { EngineLogger } from '../logging';
import type { ResponseTransport, Unsubscribe } from './response-transport';

/**
 * The little of a Redis client this needs. Declared structurally rather than
 * imported, so this package takes no Redis dependency and a host can pass a
 * client it already manages, with its own retry and cluster policy.
 */
export interface RedisPubSub {
	publish(channel: string, message: string): Promise<unknown>;
	psubscribe(pattern: string): Promise<unknown>;
	punsubscribe(pattern: string): Promise<unknown>;
	on(
		event: 'pmessage',
		listener: (pattern: string, channel: string, message: string) => void,
	): unknown;
}

export interface RedisResponseTransportOptions {
	/** Separate clients: a subscribed Redis connection accepts no other command. */
	publisher: RedisPubSub;
	subscriber: RedisPubSub;
	/**
	 * Prefix for the per-execution channel names. Set it per deployment, or two
	 * deployments on one Redis read each other's responses.
	 */
	channelPrefix: string;
	logger: EngineLogger;
}

/**
 * `ResponseTransport` over Redis pub/sub. A publish is addressed to one
 * execution's channel; the subscription is a pattern over all of them.
 *
 * The pattern is what makes `subscribe` safe to call synchronously. Subscribing
 * per execution would have to reach Redis first, and a step that answers
 * immediately — a streamed chunk, above all — publishes before that lands. The
 * subscription is therefore opened once, at construction, and routing happens
 * locally.
 *
 * So this replica receives every run's frames for its deployment and keeps the
 * ones it holds. That is option K1's broadcast-and-filter, and its cost.
 */
export class RedisResponseTransport implements ResponseTransport {
	/** Routes a received frame to the listeners of the run it belongs to. */
	private readonly executions = new EventEmitter();

	private readonly pattern: string;

	constructor(private readonly options: RedisResponseTransportOptions) {
		this.pattern = `${options.channelPrefix}:*`;
		// Unbounded: one listener per in-flight run, and the responder caps those.
		this.executions.setMaxListeners(0);

		this.options.subscriber.on('pmessage', (_pattern, channel, frame) => {
			const executionId = this.executionIdOf(channel);
			if (executionId !== undefined) this.executions.emit(executionId, frame);
		});

		void this.options.subscriber
			.psubscribe(this.pattern)
			.catch((error: unknown) =>
				this.options.logger.error('failed to subscribe to responses', { error }),
			);
	}

	publish(executionId: string, frame: string): void {
		// Fire-and-forget: the caller is a running step, which must not wait.
		void this.options.publisher
			.publish(this.channelFor(executionId), frame)
			.catch((error: unknown) =>
				this.options.logger.error('failed to publish a response', { executionId, error }),
			);
	}

	subscribe(executionId: string, handler: (frame: string) => void): Unsubscribe {
		this.executions.on(executionId, handler);

		return () => this.executions.off(executionId, handler);
	}

	async stop(): Promise<void> {
		this.executions.removeAllListeners();
		await this.options.subscriber.punsubscribe(this.pattern);
	}

	private channelFor(executionId: string): string {
		return `${this.options.channelPrefix}:${executionId}`;
	}

	private executionIdOf(channel: string): string | undefined {
		const prefix = `${this.options.channelPrefix}:`;
		return channel.startsWith(prefix) ? channel.slice(prefix.length) : undefined;
	}
}
