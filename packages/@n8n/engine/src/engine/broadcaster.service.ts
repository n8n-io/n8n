import type { Response } from 'express';

import type { EngineEventBus } from './event-bus.service';
import type { EventRelay } from './event-relay';
import type { EngineEvent } from './event-bus.types';
import type { MetricsService } from './metrics.service';

/**
 * Delivers engine events to HTTP clients via Server-Sent Events (SSE).
 * Subscribes to all events on the EngineEventBus and forwards them
 * to connected SSE clients grouped by executionId.
 *
 * Also subscribes to an optional EventRelay for cross-instance events.
 * No dedup needed: LocalEventRelay.onBroadcast is a no-op, and
 * RedisEventRelay filters out same-instance events via instanceId.
 */
export class BroadcasterService {
	/** Map executionId -> Set of SSE response objects */
	private clients = new Map<string, Set<Response>>();

	constructor(
		private readonly eventBus: EngineEventBus,
		private readonly relay?: EventRelay,
		private readonly metrics?: MetricsService,
	) {
		// Local events (this instance)
		this.eventBus.onAny((event: EngineEvent) => {
			if ('executionId' in event) {
				this.send(event.executionId, event);
			}
		});

		// Remote events (other instances via Redis).
		// No dedup needed: LocalEventRelay.onBroadcast is a no-op, and
		// RedisEventRelay filters out same-instance events via instanceId.
		this.relay?.onBroadcast((event: EngineEvent) => {
			this.metrics?.redisRelayLatency.observe(Date.now() - event.createdAt);
			if ('executionId' in event) {
				this.send(event.executionId, event);
			}
		});
	}

	/**
	 * Subscribe an HTTP response to receive SSE events for a given execution.
	 * Sets up proper SSE headers and handles cleanup on disconnect.
	 */
	subscribe(executionId: string, res: Response): void {
		// Set SSE headers (use res.set for Express 5 compatibility)
		res.set({
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'Access-Control-Allow-Origin': '*',
		});
		res.status(200);
		res.flushHeaders();

		// Send initial comment to confirm connection
		res.write(': connected\n\n');

		if (!this.clients.has(executionId)) {
			this.clients.set(executionId, new Set());
		}
		this.clients.get(executionId)!.add(res);
		this.metrics?.sseConnectedClients.inc();

		// Cleanup on disconnect
		res.on('close', () => {
			this.clients.get(executionId)?.delete(res);
			if (this.clients.get(executionId)?.size === 0) {
				this.clients.delete(executionId);
			}
			this.metrics?.sseConnectedClients.dec();
		});
	}

	/**
	 * Send an event to all SSE clients subscribed to the given execution.
	 */
	send(executionId: string, event: EngineEvent): void {
		const clients = this.clients.get(executionId);
		if (!clients) return;
		const data = `data: ${JSON.stringify(event)}\n\n`;
		for (const res of clients) {
			res.write(data);
		}
	}

	/**
	 * Returns the number of active SSE subscribers for a given execution.
	 */
	getSubscriberCount(executionId: string): number {
		return this.clients.get(executionId)?.size ?? 0;
	}

	/**
	 * Returns the total number of active SSE connections across all executions.
	 */
	getTotalSubscriberCount(): number {
		let total = 0;
		for (const clients of this.clients.values()) {
			total += clients.size;
		}
		return total;
	}
}
