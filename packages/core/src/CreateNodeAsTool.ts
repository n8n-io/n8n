/* eslint-disable @typescript-eslint/no-use-before-define */
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
import type { IExecuteFunctions, INodeParameters, INodeType } from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { z } from 'zod';

type PlaceholderDefinition = {
	name: string;
	type?: string;
	description: string;
};

interface fromAIArgument {
	/** The key or name of the argument */
	key: string;
	/** Optional description of the argument */
	description?: string;
	/** Optional type of the argument */
	type?: string;
	/** Optional default value for the argument */
	defaultValue?: string | number | boolean;
}

function makeParameterZodSchema(placeholder: fromAIArgument) {
	let schema: z.ZodTypeAny;

	if (placeholder.type === 'string') {
		schema = z.string();
	} else if (placeholder.type === 'number') {
		schema = z.number();
	} else if (placeholder.type === 'boolean') {
		schema = z.boolean();
	} else if (placeholder.type === 'json') {
		schema = z.record(z.any());
	} else if (placeholder.type === 'date') {
		schema = z.date();
	} else {
		schema = z.string();
	}

	if (placeholder.description) {
		schema = schema.describe(placeholder.description);
	}

	return schema;
}

function getDescription(node: INodeType, nodeParameters: INodeParameters) {
	const manualDescription = nodeParameters.toolDescription as string;

	if (nodeParameters.descriptionType === 'auto') {
		const resource = nodeParameters.resource as string;
		const operation = nodeParameters.operation as string;
		let description = node.description.description;
		if (resource) {
			description += `\n Resource: ${resource}`;
		}
		if (operation) {
			description += `\n Operation: ${operation}`;
		}
		return description.trim();
	}
	if (nodeParameters.descriptionType === 'manual') {
		return manualDescription ?? node.description.description;
	}

	return node.description.description;
}

/**
 * Parses a string containing JSON and extracts all fromAI function arguments.
 *
 * @param jsonString - A string containing JSON with fromAI function calls
 * @returns An array of fromAIArgument objects
 */
function parseFromAIArguments(jsonString: string): fromAIArgument[] {
	/**
	 * Regular expression to match fromAI function calls, including nested parentheses.
	 * Explanation:
	 * $fromAI\(     - Matches the literal string "$fromAI("
	 * (             - Start of capturing group
	 *   (?:         - Start of non-capturing group
	 *     [^()]     - Any character that is not a parenthesis
	 *     |         - OR
	 *     \(        - A literal opening parenthesis
	 *       (?:     - Start of nested non-capturing group
	 *         [^()] - Any character that is not a parenthesis
	 *         |     - OR
	 *         \([^()]*\) - A pair of parentheses with any non-parenthesis characters inside
	 *       )*      - End of nested group, repeated zero or more times
	 *     \)        - A literal closing parenthesis
	 *   )*          - End of non-capturing group, repeated zero or more times
	 * )             - End of capturing group
	 * \)            - Matches the closing parenthesis of the function call
	 */
	const fromAIRegex = /\$fromAI\(((?:[^()]|\((?:[^()]|\([^()]*\))*\))*)\)/g;
	const matches = jsonString.matchAll(fromAIRegex);
	return Array.from(matches).map((match) => parseArguments(match[1]));
}

/**
 * Parses the arguments of a single fromAI function call.
 *
 * @param argsString - The string containing the function arguments
 * @returns A fromAIArgument object with parsed values
 */
function parseArguments(argsString: string): fromAIArgument {
	const args: string[] = [];
	let currentArg = '';
	let inQuotes = false;
	let quoteChar = '';
	let depth = 0;

	for (let i = 0; i < argsString.length; i++) {
		const char = argsString[i];

		if (char === "'" || char === '"') {
			if (!inQuotes) {
				inQuotes = true;
				quoteChar = char;
			} else if (char === quoteChar) {
				inQuotes = false;
				quoteChar = '';
			}
			currentArg += char;
		} else if (char === '(' && !inQuotes) {
			depth++;
			currentArg += char;
		} else if (char === ')' && !inQuotes) {
			depth--;
			currentArg += char;
		} else if (char === ',' && !inQuotes && depth === 0) {
			args.push(currentArg.trim());
			currentArg = '';
		} else {
			currentArg += char;
		}
	}

	if (currentArg) {
		args.push(currentArg.trim());
	}

	const cleanArgs = args.map((arg) => arg.replace(/^['"]|['"]$/g, ''));

	return {
		key: cleanArgs[0] || '',
		description: cleanArgs[1] || undefined,
		type: cleanArgs[2] || undefined,
		defaultValue: parseDefaultValue(cleanArgs[3]),
	};
}

/**
 * Parses the default value, preserving its original type.
 *
 * @param value - The string representation of the default value
 * @returns The parsed default value as string, number, boolean, or undefined
 */
function parseDefaultValue(value: string | undefined): string | number | boolean | undefined {
	if (value === undefined) return undefined;
	if (value === 'true') return true;
	if (value === 'false') return false;
	if (!isNaN(Number(value))) return Number(value);
	return value;
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
	const stringifiedParameters = JSON.stringify(nodeParameters, null, 2);
	console.log('Stringified parameters:', stringifiedParameters);
	const parsedArguments = parseFromAIArguments(stringifiedParameters);
	console.log('parseFromAIArguments output:', parsedArguments);

	for (const argument of parsedArguments) {
		const nameValidationRegex = /^[a-zA-Z0-9_-]{1,64}$/;
		if (!nameValidationRegex.test(argument.key)) {
			const error = new Error(`Parameter name \`${argument.key}\` is invalid.`);
			throw new NodeOperationError(ctx.getNode(), error, {
				description:
					'Invalid parameter name, must be between 1 and 64 characters long and only contain lowercase letters, uppercase letters, numbers, underscores, and hyphens',
			});
		}
	}
	// Generate Zod schema from placeholder values
	const schemaObj = parsedArguments.reduce((acc: Record<string, z.ZodTypeAny>, placeholder) => {
		acc[placeholder.key] = makeParameterZodSchema(placeholder);
		return acc;
	}, {});

	const schema = z.object(schemaObj).required();
	const description = getDescription(node, nodeParameters);
	const name = ctx.getNode().name.replace(/ /g, '_') ?? node.description.name;

	const tool = new DynamicStructuredTool({
		name,
		description,
		schema,
		func: async (functionArgs: z.infer<typeof schema>) => {
			const { index } = ctx.addInputData(NodeConnectionType.AiTool, [[{ json: functionArgs }]]);

			try {
				// Execute the node with the proxied context
				const result = await node.execute?.bind(ctx)();

				// Process and map the results
				const mappedResults = result?.[0]?.flatMap((item) => item.json);

				// Add output data to the context
				ctx.addOutputData(NodeConnectionType.AiTool, index, [
					[{ json: { response: mappedResults } }],
				]);

				// Return the stringified results
				return JSON.stringify(mappedResults);
			} catch (error) {
				console.log('🚀 ~ error:', error);
				const nodeErrror = new NodeOperationError(ctx.getNode(), error as Error);
				ctx.addOutputData(NodeConnectionType.AiTool, index, nodeErrror);
				return 'Error during node execution: ' + nodeErrror.description;
			}
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
