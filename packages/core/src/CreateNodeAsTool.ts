/**
 * @module NodeAsTool
 * @description This module converts n8n nodes into LangChain tools by analyzing node parameters,
 * identifying placeholders, and generating a Zod schema. It then creates a DynamicStructuredTool
 * that can be used in LangChain workflows.
 *
 * General approach:
 * 1. Recursively traverse node parameters to find placeholders, including in nested structures
 * 2. Generate a Zod schema based on these placeholders, preserving the nested structure
 * 3. Create a DynamicStructuredTool with the schema and a function that executes the n8n node
 *
 * Example:
 * - Node parameters:
 *   {
 *     "inputText": "{{ '__PLACEHOLDER: Enter main text to process' }}",
 *     "options": {
 *       "language": "{{ '__PLACEHOLDER: Specify language' }}",
 *       "advanced": {
 *         "maxLength": "{{ '__PLACEHOLDER: Enter maximum length' }}"
 *       }
 *     }
 *   }
 *
 * - Generated Zod schema:
 *   z.object({
 *     "inputText": z.string().describe("Enter main text to process"),
 *     "options__language": z.string().describe("Specify language"),
 *     "options__advanced__maxLength": z.string().describe("Enter maximum length")
 *   }).required()
 *
 * - Resulting tool can be called with:
 *   {
 *     "inputText": "Hello, world!",
 *     "options__language": "en",
 *     "options__advanced__maxLength": "100"
 *   }
 *
 * Note: Nested properties are flattened with double underscores in the schema,
 * but the tool reconstructs the original nested structure when executing the node.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeParameters,
	type INodeType,
} from 'n8n-workflow';
import { z } from 'zod';

/** Represents a nested object structure */
type NestedObject = { [key: string]: unknown };

/**
 * Encodes a dot-notated key to a format safe for use as an object key.
 * @param {string} key - The dot-notated key to encode.
 * @returns {string} The encoded key.
 */
function encodeDotNotation(key: string): string {
	// Replace dots with double underscores, then handle special case for '__value' for complicated params
	return key.replace(/\./g, '__').replace('__value', '');
}

/**
 * Decodes an encoded key back to its original dot-notated form.
 * @param {string} key - The encoded key to decode.
 * @returns {string} The decoded, dot-notated key.
 */
function decodeDotNotation(key: string): string {
	// Simply replace double underscores with dots
	return key.replace(/__/g, '.');
}

/**
 * Recursively traverses an object to find placeholder values.
 * @param {NestedObject} obj - The object to traverse.
 * @param {string[]} path - The current path in the object.
 * @param {Map<string, string>} results - Map to store found placeholders.
 * @returns {Map<string, string>} Updated map of placeholders.
 */
function traverseObject(
	obj: NestedObject,
	path: string[] = [],
	results: Map<string, string> = new Map(),
): Map<string, string> {
	for (const [key, value] of Object.entries(obj)) {
		const currentPath = [...path, key];
		const fullPath = currentPath.join('.');

		if (typeof value === 'string' && value.startsWith("{{ '__PLACEHOLDER")) {
			// Store placeholder values with their full path
			results.set(encodeDotNotation(fullPath), value);
		} else if (Array.isArray(value)) {
			// Recursively traverse arrays
			// eslint-disable-next-line @typescript-eslint/no-use-before-define
			traverseArray(value, currentPath, results);
		} else if (typeof value === 'object' && value !== null) {
			// Recursively traverse nested objects, but only if they're not empty
			if (Object.keys(value).length > 0) {
				traverseObject(value as NestedObject, currentPath, results);
			}
		}
	}

	return results;
}

/**
 * Recursively traverses an array to find placeholder values.
 * @param {unknown[]} arr - The array to traverse.
 * @param {string[]} path - The current path in the array.
 * @param {Map<string, string>} results - Map to store found placeholders.
 */
function traverseArray(arr: unknown[], path: string[], results: Map<string, string>): void {
	arr.forEach((item, index) => {
		const currentPath = [...path, index.toString()];
		const fullPath = currentPath.join('.');

		if (typeof item === 'string' && item.startsWith("{{ '__PLACEHOLDER")) {
			// Store placeholder values with their full path
			results.set(encodeDotNotation(fullPath), item);
		} else if (Array.isArray(item)) {
			// Recursively traverse nested arrays
			traverseArray(item, currentPath, results);
		} else if (typeof item === 'object' && item !== null) {
			// Recursively traverse nested objects
			traverseObject(item as NestedObject, currentPath, results);
		}
	});
}

/**
 * Builds a nested object structure from matching keys and their values.
 * @param {string} baseKey - The base key to start building from.
 * @param {string[]} matchingKeys - Array of matching keys.
 * @param {Record<string, string>} values - Object containing values for the keys.
 * @returns {Record<string, unknown>} The built nested object structure.
 */
function buildStructureFromMatches(
	baseKey: string,
	matchingKeys: string[],
	values: Record<string, string>,
): Record<string, unknown> {
	const result = {};

	for (const matchingKey of matchingKeys) {
		const decodedKey = decodeDotNotation(matchingKey);
		// Extract the part of the key after the base key
		const remainingPath = decodedKey
			.slice(baseKey.length)
			.split('.')
			.filter((k) => k !== '');
		let current: Record<string, unknown> = result;

		// Build the nested structure
		for (let i = 0; i < remainingPath.length - 1; i++) {
			if (!(remainingPath[i] in current)) {
				current[remainingPath[i]] = {};
			}
			current = current[remainingPath[i]] as Record<string, unknown>;
		}

		// Set the value at the deepest level
		const lastKey = remainingPath[remainingPath.length - 1];
		current[lastKey ?? matchingKey] = values[matchingKey];
	}

	// If no nested structure was created, return the direct value
	return Object.keys(result).length === 0 ? values[encodeDotNotation(baseKey)] : result;
}

/**
 * Extracts the description from a placeholder string.
 * @param {string} value - The placeholder string.
 * @returns {string} The extracted description or a default message.
 */
function extractPlaceholderDescription(value: string): string {
	const match = value.match(/{{ '__PLACEHOLDER:\s*(.+?)\s*' }}/);
	return match ? match[1] : 'No description provided';
}

/**
 * Creates a DynamicStructuredTool from an n8n node.
 * @param {INodeType} node - The n8n node to convert.
 * @param {IExecuteFunctions} ctx - The execution context.
 * @param {INodeParameters} nodeParameters - The node parameters.
 * @returns {DynamicStructuredTool} The created tool.
 */
export function createNodeAsTool(
	node: INodeType,
	ctx: IExecuteFunctions,
	nodeParameters: INodeParameters,
): DynamicStructuredTool {
	// Find all placeholder values in the node parameters
	const placeholderValues = traverseObject(nodeParameters);

	// Generate Zod schema from placeholder values
	const schemaObj: { [key: string]: z.ZodString } = {};
	for (const [key, value] of placeholderValues.entries()) {
		const description = extractPlaceholderDescription(value);
		schemaObj[key] = z.string().describe(description);
	}
	const schema = z.object(schemaObj).required();

	// Get the tool description from node parameters or use the default
	const toolDescription = ctx.getNodeParameter(
		'toolDescription',
		0,
		node.description.description,
	) as string;
	type GetNodeParameterMethod = IExecuteFunctions['getNodeParameter'];

	const tool = new DynamicStructuredTool({
		name: node.description.name,
		description: toolDescription ? toolDescription : node.description.description,
		schema,
		func: async (functionArgs: z.infer<typeof schema>) => {
			// Create a proxy for ctx to soft-override parameters with values from the LLM
			const ctxProxy = new Proxy(ctx, {
				get(target: IExecuteFunctions, prop: string | symbol, receiver: unknown) {
					if (prop === 'getNodeParameter') {
						// Override getNodeParameter method
						// eslint-disable-next-line @typescript-eslint/unbound-method
						return new Proxy(target.getNodeParameter, {
							apply(
								targetMethod: GetNodeParameterMethod,
								thisArg: unknown,
								argumentsList: Parameters<GetNodeParameterMethod>,
							): ReturnType<GetNodeParameterMethod> {
								const [key] = argumentsList;
								if (typeof key !== 'string') {
									// If key is not a string, use the original method
									return Reflect.apply(targetMethod, thisArg, argumentsList);
								}

								const encodedKey = encodeDotNotation(key);
								// Check if the full key or any more specific key is a placeholder
								const matchingKeys = Array.from(placeholderValues.keys()).filter((k) =>
									k.startsWith(encodedKey),
								);

								if (matchingKeys.length > 0) {
									// If there are matching keys, build the structure using args
									const res = buildStructureFromMatches(encodedKey, matchingKeys, functionArgs);
									// Return either the specific value or the entire built structure
									return res?.[decodeDotNotation(key)] ?? res;
								}

								// If no placeholder is found, use the original function
								return Reflect.apply(targetMethod, thisArg, argumentsList);
							},
						});
					}
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					return Reflect.get(target, prop, receiver);
				},
			});

			// Add input data to the context
			ctxProxy.addInputData(NodeConnectionType.AiTool, [[{ json: functionArgs }]]);

			// Execute the node with the proxied context
			const result = await node.execute?.bind(ctxProxy)();

			// Process and map the results
			const mappedResults = result?.[0]?.flatMap((item) => item.json);

			// Add output data to the context
			ctxProxy.addOutputData(NodeConnectionType.AiTool, 0, [
				[{ json: { response: mappedResults } }],
			]);

			// Return the stringified results
			return JSON.stringify(mappedResults);
		},
	});

	return tool;
}

/**
 * Asynchronously creates a DynamicStructuredTool from an n8n node.
 * @param {IExecuteFunctions} ctx - The execution context.
 * @param {INodeType} node - The n8n node to convert.
 * @param {INodeParameters} nodeParameters - The node parameters.
 * @returns {Promise<{response: DynamicStructuredTool}>} A promise that resolves to an object containing the created tool.
 */
export function getNodeAsTool(
	ctx: IExecuteFunctions,
	node: INodeType,
	nodeParameters: INodeParameters,
) {
	return {
		response: createNodeAsTool(node, ctx, nodeParameters),
	};
}
