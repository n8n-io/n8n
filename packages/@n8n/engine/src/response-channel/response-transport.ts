/** Ends one subscription. Calling it twice is safe. */
export type Unsubscribe = () => void;

/**
 * Delivers serialized responses to subscribers for a specific execution.
 *
 * A subscriber receives only frames published for its execution ID. The
 * transport treats each frame as an opaque string. `ExecutionResponseChannel`
 * handles serialization and validation.
 *
 * Frames are not buffered. Only active subscribers receive them, and each
 * frame is delivered at most once.
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
