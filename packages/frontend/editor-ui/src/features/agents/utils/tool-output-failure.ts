import { isRecord } from '@n8n/utils/is-record';

/** The error message of a tool output, from an `error` text or an `error.message` text. */
export function toolOutputErrorMessage(output: unknown): string | undefined {
	const error = isRecord(output) ? output.error : undefined;
	const message = isRecord(error) ? error.message : error;
	return typeof message === 'string' && message.length > 0 ? message : undefined;
}

/**
 * True when a tool output reports a failure. Some tools return a failure as
 * their result, for example `{ success: false, error }`, and do not throw, so
 * the call itself still finishes.
 */
export function isFailedToolOutput(output: unknown): boolean {
	if (!isRecord(output)) return false;
	const { error, status, success, ok, isError } = output;
	// The same read as toolOutputErrorMessage. It is not a call, so that the call
	// chains of the session timeline stay short.
	const message = isRecord(error) ? error.message : error;
	return (
		(typeof message === 'string' && message.length > 0) ||
		status === 'error' ||
		status === 'failed' ||
		success === false ||
		ok === false ||
		isError === true
	);
}
