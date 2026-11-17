import { isRecord } from '../is-record';

/** Returns the message of `error`, or its string form if it has no message. */
export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	// Serialized errors lose their prototype but keep `message`
	if (isRecord(error) && typeof error.message === 'string') return error.message;
	return String(error);
}
