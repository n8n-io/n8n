/**
 * Moves opaque frames from a publisher to every subscriber.
 *
 * A transport knows nothing about what a frame means. Everything that must not
 * vary between deployments — the envelope, the size cap, validation — lives in
 * `ExecutionResponseChannel`, above this.
 *
 * Delivery is at-most-once: a subscriber that is not listening when a frame is
 * published never receives it. That is what makes this option K1.
 */
export interface ResponseTransport {
	/** Never throws and never blocks: a step must not wait on the response path. */
	publish(frame: string): void;
	subscribe(handler: (frame: string) => void): void;
	stop(): Promise<void>;
}

/** Transport for a host that is not listening. */
export const noopResponseTransport: ResponseTransport = Object.freeze({
	publish: () => {},
	subscribe: () => {},
	stop: async () => {},
});
