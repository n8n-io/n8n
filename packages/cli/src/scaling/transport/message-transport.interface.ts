/**
 * Cross-process messaging facet of the transport abstraction described in the
 * "Unify modes of operation" RFC: a single interface for pubsub-style messaging,
 * with a Redis-backed implementation for multi-host deployments and a non-Redis
 * implementation for single-host deployments. Deliberately narrow — it covers only
 * what `Publisher`/`Subscriber` need (channel publish/subscribe), not the storage
 * facet (durable execution queue, leader election, cross-process KV), which are
 * separate, not-yet-abstracted concerns.
 */
export interface MessageTransport {
	/**
	 * Publish `message` to `channel`. Delivered to every current subscriber of
	 * `channel`, including the publisher itself if it is also subscribed — this
	 * mirrors Redis `PUBLISH` semantics, which callers (e.g. `Subscriber`'s
	 * self-send filtering) already depend on.
	 */
	publish(channel: string, message: string): Promise<void>;

	/** Register `onMessage` to be called for every message published to `channel`. */
	subscribe(channel: string, onMessage: (message: string, channel: string) => void): Promise<void>;

	/** Release any underlying connection(s). Safe to call more than once. */
	shutdown(): void | Promise<void>;
}
