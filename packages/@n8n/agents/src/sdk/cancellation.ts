/**
 * Pass as `resumeData` to `agent.resume()` to cancel a suspended tool call
 * and steer the agent with a new message instead of answering the tool.
 *
 * Uses a JSON-serializable `_type` string so it survives HTTP round-trips —
 * frontend code can construct `{ _type: 'agent.cancellation', message }`
 * without importing this package.
 */

export const CANCELLATION_TYPE = 'agent.cancellation' as const;

export interface Cancellation {
	readonly _type: typeof CANCELLATION_TYPE;
	/** The user's steering message provided when cancelling. */
	readonly message: string;
}

export function createCancellation(message: string): Cancellation {
	return { _type: CANCELLATION_TYPE, message };
}

export function isCancellation(value: unknown): value is Cancellation {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>)._type === CANCELLATION_TYPE &&
		typeof (value as Record<string, unknown>).message === 'string'
	);
}
