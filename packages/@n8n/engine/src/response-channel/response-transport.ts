/** Ends one subscription. Calling it twice is safe. */
export type Unsubscribe = () => void;

/**
 * Moves opaque frames from a publisher to the subscribers of one execution.
 *
 * Every frame is addressed to an execution, so a transport can give each run a
 * channel of its own — a subscriber then receives nothing but its own run's
 * responses, however many runs are in flight.
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
	publish(executionId: string, frame: string): void;
	subscribe(executionId: string, handler: (frame: string) => void): Unsubscribe;
	stop(): Promise<void>;
}

/** Transport for a host that is not listening. */
export const noopResponseTransport: ResponseTransport = Object.freeze({
	publish: () => {},
	subscribe: () => () => {},
	stop: async () => {},
});
