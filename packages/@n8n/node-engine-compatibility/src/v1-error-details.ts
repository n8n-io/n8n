import type { JsonValue } from '@n8n/engine';
import { isRecord } from '@n8n/utils/is-record';
import type { ExecutionError, IDataObject, INode } from 'n8n-workflow';
import {
	ExecutionBaseError,
	jsonParse,
	jsonStringify,
	NodeApiError,
	NodeError,
	WorkflowOperationError,
} from 'n8n-workflow';

/**
 * The structured part of a v1 node error: the guidance under the message, the
 * context the error view reads its template values from, the node it names,
 * and the HTTP code.
 *
 * This is what the data plane stores as a step error's `details`, so a read
 * can rebuild an error the editor shows as it would after a v1 run.
 */
export interface V1ErrorDetails {
	description?: string | null;
	level?: string;
	functionality?: string;
	lineNumber?: number;
	timestamp?: number;
	context?: IDataObject;
	httpCode?: string | null;
	node?: INode;
}

/** The details of a v1 error, as a JSON value. Any other error has none. */
export function toV1ErrorDetails(error: unknown): JsonValue | undefined {
	if (!(error instanceof ExecutionBaseError)) return undefined;

	const details: V1ErrorDetails = {
		description: error.description,
		level: error.level,
		functionality: error.functionality,
		lineNumber: error.lineNumber,
		timestamp: error.timestamp,
		context: error.context,
	};
	if (error instanceof NodeError) details.node = error.node;
	if (error instanceof NodeApiError) details.httpCode = error.httpCode;

	// The round trip is what persistence does to the details anyway, and it drops
	// what JSON cannot carry before the engine sees it.
	return jsonParse<JsonValue>(jsonStringify(details));
}

/**
 * Rebuilds the v1 error for a step failure. With details, the editor gets what
 * it would have seen after a v1 run; without them, a bare error that carries
 * the name and message.
 *
 * Only the fields `ExecutionBaseError.toJSON` serializes are restored. The
 * rest of the details stay in the data plane record, where an operator or an
 * API consumer can still read them: the wire would drop them on the way to the
 * editor, as it does after a v1 run.
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
