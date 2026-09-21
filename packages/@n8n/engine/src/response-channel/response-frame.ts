/** Ends one receive operation. Calling it twice is safe. */
export type Unsubscribe = () => void;

/** Sends opaque execution response frames under their execution IDs. */
export interface ResponseFrameSender {
	/** Never throws and never blocks: a step must not wait on the response path. */
	send(executionId: string, frame: string): void;
	stop(): Promise<void>;
}

/**
 * Receives opaque execution response frames for a specific execution.
 *
 * Frames are not buffered. Only active handlers receive them. Each handler
 * receives a frame at most once.
 */
export interface ResponseFrameReceiver {
	receive(executionId: string, handler: (frame: string) => void): Unsubscribe;
	stop(): Promise<void>;
}

/** Frame sender for a host that discards execution responses. */
export const noopResponseFrameSender: ResponseFrameSender = Object.freeze({
	send: () => {},
	stop: async () => {},
});
