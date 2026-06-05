/**
 * Pass as `resumeData` to `agent.resume()` to cancel a suspended tool call
 * and steer the agent with a new message instead of answering the tool.
 *
 * Uses a JSON-serializable `_type` string so it survives HTTP round-trips —
 * frontend code can construct `{ _type: 'agent.cancellation', message }`
 * without importing this package.
 */

export const CANCELLATION_TYPE = 'agent.cancellation' as const;
export const SAVE_PARTIAL_RESPONSE_ABORT_TYPE = 'agent.abort.save-partial-response' as const;

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

export class SavePartialResponseAbortError extends Error {
	readonly _type = SAVE_PARTIAL_RESPONSE_ABORT_TYPE;

	constructor(message = 'Agent run was aborted with partial response persistence requested') {
		super(message);
		this.name = 'SavePartialResponseAbortError';
	}
}

export function createSavePartialResponseAbortReason(): SavePartialResponseAbortError {
	return new SavePartialResponseAbortError();
}

export function isSavePartialAbortError(value: unknown): boolean {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>)._type === SAVE_PARTIAL_RESPONSE_ABORT_TYPE
	);
}
