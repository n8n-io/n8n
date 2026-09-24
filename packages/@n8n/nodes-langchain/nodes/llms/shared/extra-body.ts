import isPlainObject from 'lodash/isPlainObject';
import type { INode } from 'n8n-workflow';
import { isSafeObjectProperty, jsonParse, NodeOperationError } from 'n8n-workflow';

/** Just enough of the node context to raise an error against the right node. */
type NodeContext = { getNode: () => INode };

/**
 * Parses the raw JSON a builder typed into an Extra Body field.
 *
 * Shared so every model node rejects the same shapes with the same wording. The result is meant
 * to be merged into `modelKwargs`, which the client spreads into the request body.
 */
export function parseExtraBody(
	ctx: NodeContext,
	value: string,
	itemIndex: number,
): Record<string, unknown> {
	let extraBody: Record<string, unknown>;

	try {
		extraBody = jsonParse<Record<string, unknown>>(value);
	} catch (error) {
		throw new NodeOperationError(
			ctx.getNode(),
			'The value in the "Extra Body" field is not valid JSON',
			{ itemIndex, description: error instanceof Error ? error.message : String(error) },
		);
	}

	if (!isPlainObject(extraBody)) {
		throw new NodeOperationError(
			ctx.getNode(),
			'The value in the "Extra Body" field must be a JSON object',
			{ itemIndex },
		);
	}

	// `JSON.parse` keeps a key like `__proto__` as an own property, and merging that into the
	// request options with `Object.assign` replaces the prototype of the options object. No model
	// parameter has one of these names, so refuse the key instead of silently dropping it.
	const unsafeKey = Object.keys(extraBody).find((key) => !isSafeObjectProperty(key));
	if (unsafeKey) {
		throw new NodeOperationError(
			ctx.getNode(),
			`The "Extra Body" field cannot set "${unsafeKey}"`,
			{
				itemIndex,
				description: 'This name changes the request object itself, not a model parameter.',
			},
		);
	}

	return extraBody;
}
