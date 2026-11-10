import type { JsonValue } from '@n8n/engine';
import { isRecord } from '@n8n/utils/is-record';
import type { ExecutionError, IDataObject, INode } from 'n8n-workflow';
import {
	ExecutionBaseError,
	jsonParse,
	jsonStringify,
	NodeApiError,
	NodeError,
	NodeOperationError,
	WorkflowOperationError,
} from 'n8n-workflow';

/**
 * The structured part of a v1 node error, the part the editor renders beyond
 * the message: the guidance under it, the node it names, the HTTP code, and
 * the context the error view reads its template values from.
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
 * Rebuilds the v1 error for a step failure. With details, the editor gets the
 * node error it would have seen after a v1 run; without them, a bare error
 * that carries the name and message.
 */
export function fromV1ErrorDetails(
	name: string,
	message: string,
	details: JsonValue | undefined,
): ExecutionError {
	const read = isRecord(details) ? details : {};
	const description = typeof read.description === 'string' ? read.description : undefined;

	const error = isNode(read.node)
		? new NodeOperationError(read.node, message, { description })
		: new WorkflowOperationError(message, undefined, description);
	error.name = name;

	if (isRecord(read.context)) Object.assign(error, { context: read.context });
	if (typeof read.lineNumber === 'number') error.lineNumber = read.lineNumber;
	if (typeof read.timestamp === 'number') error.timestamp = read.timestamp;
	if (isLevel(read.level)) error.level = read.level;
	if (isFunctionality(read.functionality)) error.functionality = read.functionality;
	// Only `NodeApiError` declares `httpCode`; the editor reads it off any error.
	if (typeof read.httpCode === 'string') Object.assign(error, { httpCode: read.httpCode });

	return error;
}

function isNode(value: unknown): value is INode {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		typeof value.name === 'string' &&
		typeof value.type === 'string' &&
		typeof value.typeVersion === 'number' &&
		Array.isArray(value.position) &&
		isRecord(value.parameters)
	);
}

const LEVELS = ['fatal', 'error', 'warning', 'info'] as const;
function isLevel(value: unknown): value is (typeof LEVELS)[number] {
	return LEVELS.some((level) => level === value);
}

const FUNCTIONALITIES = ['regular', 'configuration-node', 'pairedItem'] as const;
function isFunctionality(value: unknown): value is (typeof FUNCTIONALITIES)[number] {
	return FUNCTIONALITIES.some((functionality) => functionality === value);
}
