/**
 * @module NodeAsTool
 * @description This module converts n8n nodes into LangChain tools by analyzing node parameters,
 * identifying placeholders using the $fromAI function, and generating a Zod schema. It then creates
 * a DynamicStructuredTool that can be used in LangChain workflows.
 *
 * General approach:
 * 1. Parse node parameters to find $fromAI function calls and extract ment information
 * 2. Generate a Zod schema based on these arguments, preserving types and descriptions
 * 3. Create a DynamicStructuredTool with the schema and a function that executes the n8n node
 *
 * Example:
 * - Node parameters:
 *   {
 *     "inputText": "={{ $fromAI("inputText", "Enter main text to process", "string") }}",
 *     "options": {
 *       "language": "={{ $fromAI("language", "Specify language", "string") }}",
 *       "advanced": {
 *         "maxLength": "={{ $fromAI("maxLength", "Enter maximum length", "number") }}",
 *       }
 *     }
 *   }
 *
 * - Generated Zod schema:
 *   z.object({
 *     "inputText": z.string().describe("Enter main text to process"),
 *     "language": z.string().describe("Specify language"),
 *     "maxLength": z.number().describe("Enter maximum length")
 *   }).required()
 *
 * - Resulting will be called with:
 *   {
 *     "inputText": "Hello, world!",
 *     "language": "en",
 *     "maxLength": 100
 *   }
 *
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import type { IExecuteFunctions, INodeParameters, INodeType } from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { z } from 'zod';

interface FromAIArgument {
	/** The key or name of the argument */
	key: string;
	/** Optional description of the argument */
	description?: string;
	/** Optional type of the argument */
	type?: string;
	/** Optional default value for the argument */
	defaultValue?: string | number | boolean;
}

/**
 * Generates a Zod schema based on the provided FromAIArgument placeholder.
 *
 * @param placeholder - An object containing information about the argument.
 * @returns A Zod schema corresponding to the argument type and description.
 *
 * This function creates a Zod schema based on the type specified in the placeholder.
 * It supports 'string', 'number', 'boolean', 'json', and 'date' types.
 * If no type is specified or an unsupported type is provided, it defaults to a string schema.
 * If a description is provided in the placeholder, it is added to the schema.
 */
function generateZodSchema(placeholder: FromAIArgument) {
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

/**
 * Generates a description for a node based on the provided parameters.
 *
 * @param node - The node type containing basic description information.
 * @param nodeParameters - Parameters specifying how to generate the description.
 * @returns A string containing the generated description.
 *
 * This function handles three cases:
 * 1. 'auto': Combines the node's description with resource and operation info.
 * 2. 'manual': Uses a manually provided description or falls back to the node's description.
 * 3. default: Returns the node's original description.
 */
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
 * Parses the arguments of a single fromAI function call.
 *
 * This function takes a string representation of function arguments and parses them into
 * a structured format. It handles complex nested structures, respecting quotes and parentheses.
 * The function is designed to work with arguments that may contain nested objects, arrays,
 * or quoted strings, ensuring that these are correctly parsed as single entities.
 *
 * @param argsString - The string containing the function arguments, potentially including
 *                     nested structures and quoted strings
 * @returns A FromAIArgument object with parsed values, maintaining the structure and types
 *          of the original arguments
 */
function parseArguments(argsString: string): FromAIArgument {
	const args: string[] = [];
	let currentArg = '';
	let inQuotes = false;
	let quoteChar = '';
	let depth = 0;

	// This loop iterates through each character in the argsString
	for (let i = 0; i < argsString.length; i++) {
		const char = argsString[i];

		// Handle quotes (single or double)
		if (char === "'" || char === '"') {
			if (!inQuotes) {
				// Start of a quoted section
				inQuotes = true;
				quoteChar = char;
			} else if (char === quoteChar) {
				// End of a quoted section
				inQuotes = false;
				quoteChar = '';
			}
			currentArg += char;
		} else if (char === '(' && !inQuotes) {
			// Handle opening parenthesis (increase depth)
			depth++;
			currentArg += char;
		} else if (char === ')' && !inQuotes) {
			// Handle closing parenthesis (decrease depth)
			depth--;
			currentArg += char;
		} else if (char === ',' && !inQuotes && depth === 0) {
			// Handle comma separator (only if not in quotes and at top level)
			args.push(currentArg.trim());
			currentArg = '';
		} else {
			// Add any other character to the current argument
			currentArg += char;
		}
	}

	// Add the last argument if there's any remaining
	if (currentArg) {
		args.push(currentArg.trim());
	}

	// Clean up the arguments by removing leading and trailing quotes
	// This is done using a regular expression:
	// ^['"]  - Matches a single or double quote at the start of the string
	// ['"]$  - Matches a single or double quote at the end of the string
	// The 'g' flag ensures all matches are replaced
	const cleanArgs = args.map((arg) => arg.replace(/^['"]|['"]$/g, ''));

	return {
		key: cleanArgs[0] || '',
		description: cleanArgs[1],
		type: cleanArgs[2],
		defaultValue: parseDefaultValue(cleanArgs[3]),
	};
}

/**
 * Parses a string containing JSON and extracts all fromAI function arguments.
 *
 * @param jsonString - A string containing JSON with fromAI function calls
 * @returns An array of fromAIArgument objects
 */
function parseFromAIArguments(jsonString: string): FromAIArgument[] {
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
	const parsedArguments = parseFromAIArguments(stringifiedParameters);

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
		acc[placeholder.key] = generateZodSchema(placeholder);
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
