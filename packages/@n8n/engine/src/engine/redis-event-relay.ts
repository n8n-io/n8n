import Redis from 'ioredis';

import type { EventRelay } from './event-relay';
import type { EngineEvent } from './event-bus.types';

export function getRedisChannel(prefix: string = 'default'): string {
	return `engine:events:${prefix}`;
}

type BroadcastHandler = (event: EngineEvent) => void;

interface Envelope {
	instanceId: string;
	event: EngineEvent;
}

/**
 * Relays engine events across instances via Redis pub/sub.
 *
 * Uses two Redis connections: one for publishing, one for subscribing
 * (Redis requires dedicated connections for subscribers).
 *
 * Events are wrapped in an envelope with `instanceId` so each instance
 * can skip its own events (already handled locally by the event bus).
 *
 * Resilient to Redis failures: logs errors and continues. Local
 * orchestration is unaffected. Cross-instance SSE delivery is lost
 * until Redis recovers. ioredis auto-reconnects by default.
 */
export class RedisEventRelay implements EventRelay {
	private publisher: Redis;

	private subscriber: Redis;

	private handlers: BroadcastHandler[] = [];

	private readonly channel: string;

	constructor(
		redisUrl: string,
		private readonly instanceId: string,
		channelPrefix: string = 'default',
	) {
		this.channel = getRedisChannel(channelPrefix);
		this.publisher = new Redis(redisUrl, { lazyConnect: false });
		this.subscriber = new Redis(redisUrl, { lazyConnect: false });

		this.publisher.on('error', (err) => {
			console.error('RedisEventRelay publisher error:', err.message);
		});

		this.subscriber.on('error', (err) => {
			console.error('RedisEventRelay subscriber error:', err.message);
		});

		this.subscriber.subscribe(this.channel).catch((err) => {
			console.error('RedisEventRelay subscribe error:', err.message);
		});

		this.subscriber.on('message', (_channel: string, message: string) => {
			try {
				const envelope = JSON.parse(message) as Envelope;
				// Skip own events -- already handled locally
				if (envelope.instanceId === this.instanceId) return;

				for (const handler of this.handlers) {
					handler(envelope.event);
				}
			} catch (err) {
				console.error('RedisEventRelay message parse error:', err);
			}
		});
	}

	broadcast(event: EngineEvent): void {
		const envelope: Envelope = { instanceId: this.instanceId, event };
		this.publisher.publish(this.channel, JSON.stringify(envelope)).catch((err) => {
			console.error('RedisEventRelay publish error:', err.message);
		});
	}

	onBroadcast(handler: BroadcastHandler): void {
		this.handlers.push(handler);
	}

	getStatus(): string {
		return this.publisher.status;
	}

	async close(): Promise<void> {
		this.handlers = [];
		await Promise.all([this.publisher.disconnect(), this.subscriber.disconnect()]);
	}
}
