import { isRecord } from '@n8n/utils/is-record';
import type { INode } from 'n8n-workflow';
import { isSafeObjectProperty, jsonParse, NodeOperationError } from 'n8n-workflow';

/** Just enough of the node context to raise an error against the right node. */
type NodeContext = { getNode: () => INode };

/**
 * `isRecord` accepts any non-array object, a Date or a class instance included. An expression can
 * resolve to either, and neither has enumerable own keys, so the merge would add nothing and the
 * field would silently do nothing. Only an object literal carries model parameters.
 */
function isObjectLiteral(value: unknown): value is Record<string, unknown> {
	if (!isRecord(value)) return false;

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

/**
 * Reads the Extra Body field of a model node.
 *
 * Shared so every model node rejects the same shapes with the same wording. The result is meant
 * to be merged into `modelKwargs`, which the client puts into the request body.
 */
export function parseExtraBody(
	ctx: NodeContext,
	value: unknown,
	itemIndex: number,
): Record<string, unknown> {
	// A whole-value expression on a `json` field resolves to a real object, not a string, so
	// parse only what still needs parsing. `HttpRequestV3` handles its JSON Body the same way.
	let extraBody: unknown = value;

	if (typeof value === 'string') {
		try {
			extraBody = jsonParse(value);
		} catch (error) {
			throw new NodeOperationError(
				ctx.getNode(),
				'The value in the "Extra Body" field is not valid JSON',
				{ itemIndex, description: error instanceof Error ? error.message : String(error) },
			);
		}
	}

	if (!isObjectLiteral(extraBody)) {
		throw new NodeOperationError(
			ctx.getNode(),
			'The value in the "Extra Body" field must be a JSON object',
			{ itemIndex },
		);
	}

	// `JSON.parse` keeps a name like `__proto__` as an own key. Depending on how the caller merges,
	// it either repoints the prototype of the options object or rides into the request body as a
	// literal key. None of these names is a model parameter either way, so refuse rather than drop.
	const unsafeKey = Object.keys(extraBody).find((key) => !isSafeObjectProperty(key));
	if (unsafeKey) {
		throw new NodeOperationError(
			ctx.getNode(),
			`The "Extra Body" field cannot set "${unsafeKey}"`,
			{
				itemIndex,
				description: `"${unsafeKey}" is reserved and is not a model parameter. Remove it from the Extra Body field.`,
			},
		);
	}

	return extraBody;
}
