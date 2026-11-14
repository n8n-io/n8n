import type { JsonValue } from '@n8n/engine';
import { isRecord } from '@n8n/utils/is-record';
import type { ExecutionError } from 'n8n-workflow';
import { ExecutionBaseError, WorkflowOperationError } from 'n8n-workflow';

/**
 * The details of a v1 error: what `ExecutionBaseError.toJSON` serializes, and
 * nothing more. That projection is what reaches the editor after a v1 run, so
 * it is what the data plane stores for a step error and what a read restores.
 * Any other error has none.
 */
export function toV1ErrorDetails(error: unknown): JsonValue | undefined {
	if (!(error instanceof ExecutionBaseError) || !error.toJSON) return undefined;

	// The step error carries the name and message itself.
	const { name: _name, message: _message, ...details } = error.toJSON();
	return asStoredJson(details);
}

/**
 * The value as it comes back from JSON storage. A JSON round trip drops what
 * JSON cannot carry: `undefined` members, functions, symbols. The data plane
 * stores the details as JSON, so this is the shape every later read gets. It
 * is not a clone: `deepCopy` keeps those members, so it is not a substitute.
 */
function asStoredJson(value: object): JsonValue {
	// eslint-disable-next-line n8n-local-rules/no-json-parse-json-stringify -- the round trip is the point, not a clone
	return JSON.parse(JSON.stringify(value)) as JsonValue;
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
