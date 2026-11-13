import { isErrorLike } from './vendor/error-like';
import { ExecutionError } from './vendor/execution-error';
import { makeSerializable } from './vendor/serializable-error';

/**
 * Converts a thrown value to the error shape that the JS task runner sends
 * today, so n8n shows the same message, description and line number.
 *
 * The task runner ran user code in a `node:vm` context. Errors from that
 * context were not `instanceof Error` in the runner realm, so the runner
 * wrapped them in `ExecutionError`, which parses the line number from the
 * stack. This runtime runs user code in its own realm, so it wraps every
 * error-like value to keep that behavior.
 */
export function toExecutionError(error: unknown, itemIndex?: number): Error {
	if (error instanceof ExecutionError) return error;
	if (isErrorLike(error)) {
		const wrapped = new ExecutionError(error, itemIndex);
		copyExtraProperties(error, wrapped);
		return wrapped;
	}
	return new ExecutionError({ message: JSON.stringify(error) });
}

/** Keeps custom enumerable properties of the original error, like the runner did. */
function copyExtraProperties(from: object, to: Error) {
	for (const [key, value] of Object.entries(from)) {
		if (key === 'message' || key === 'stack' || key in to) continue;
		(to as unknown as Record<string, unknown>)[key] = value;
	}
}

/** Converts an error to a plain JSON-safe object. */
export function serializeError(error: unknown): Record<string, unknown> {
	const serializable = error instanceof Error ? makeSerializable(error) : toExecutionError(error);
	// Only the enumerable properties go over the wire, like in the task runner.
	return { ...serializable } as Record<string, unknown>;
}

/** Builds an Error from an error object that n8n sent back for an RPC call. */
export function errorFromRpc(data: unknown): Error {
	if (typeof data === 'string') return new Error(data);
	if (isErrorLike(data)) {
		const rpcError = new Error(data.message);
		for (const [key, value] of Object.entries(data)) {
			if (key === 'stack') continue;
			(rpcError as unknown as Record<string, unknown>)[key] = value;
		}
		return rpcError;
	}
	return new Error(`RPC call failed: ${JSON.stringify(data)}`);
}
