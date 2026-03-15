import type { EngineEvent } from './event-bus.types';

type BroadcastHandler = (event: EngineEvent) => void;

/**
 * Relays engine events across instances.
 *
 * In single-instance mode (LocalEventRelay), events are delivered
 * to local subscribers only.
 * In multi-instance mode (RedisEventRelay), events are published
 * to Redis and received by all instances.
 */
export interface EventRelay {
	broadcast(event: EngineEvent): void;
	onBroadcast(handler: BroadcastHandler): void;
	close(): Promise<void>;
}

/**
 * No-op event relay for single-instance mode. broadcast() does nothing
 * because the local EngineEventBus already delivers events in-process.
 * onBroadcast() never fires. Used when no Redis is configured.
 */
export class LocalEventRelay implements EventRelay {
	broadcast(_event: EngineEvent): void {
		// No-op: local event bus already delivered the event.
	}

	onBroadcast(_handler: BroadcastHandler): void {
		// No-op: no remote events in single-instance mode.
	}

	async close(): Promise<void> {}
}
