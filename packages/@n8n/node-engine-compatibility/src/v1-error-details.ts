import type { JsonValue } from '@n8n/engine';
import { isRecord } from '@n8n/utils/is-record';
import type { ExecutionError } from 'n8n-workflow';
import { ExecutionBaseError, jsonParse, jsonStringify, WorkflowOperationError } from 'n8n-workflow';

/**
 * The details of a v1 error: what `ExecutionBaseError.toJSON` serializes, and
 * nothing more. That projection is what reaches the editor after a v1 run, so
 * it is what the data plane stores for a step error and what a read restores.
 * Any other error has none.
 */
export function toV1ErrorDetails(error: unknown): JsonValue | undefined {
	if (!(error instanceof ExecutionBaseError) || !error.toJSON) return undefined;

	// The round trip is what persistence does to the details anyway, and it drops
	// what JSON cannot carry before the engine sees it.
	return jsonParse<JsonValue>(jsonStringify(error.toJSON()));
}

/**
 * Rebuilds the v1 error for a step failure. With details, the editor gets what
 * it would have seen after a v1 run; without them, a bare error that carries
 * the name and message.
 */
export function fromV1ErrorDetails(
	name: string,
	message: string,
	details: JsonValue | undefined,
): ExecutionError {
	const read = isRecord(details) ? details : {};
	const description = typeof read.description === 'string' ? read.description : undefined;

	const error = new WorkflowOperationError(message, undefined, description);
	error.name = name;
	if (isRecord(read.context)) Object.assign(error, { context: read.context });
	if (typeof read.lineNumber === 'number') error.lineNumber = read.lineNumber;
	if (typeof read.timestamp === 'number') error.timestamp = read.timestamp;

	return error;
}
