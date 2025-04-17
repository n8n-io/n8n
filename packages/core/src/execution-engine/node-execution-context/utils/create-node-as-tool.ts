import { DynamicStructuredTool } from '@langchain/core/tools';
import { generateZodSchema, NodeOperationError, traverseNodeParameters } from 'n8n-workflow';
import type { IDataObject, INode, INodeType, FromAIArgument } from 'n8n-workflow';
import { z } from 'zod';

export type CreateNodeAsToolOptions = {
	node: INode;
	nodeType: INodeType;
	handleToolInvocation: (toolArgs: IDataObject) => Promise<unknown>;
};

/**
 * Retrieves and validates the Zod schema for the tool.
 *
 * This method:
 * 1. Collects all $fromAI arguments from node parameters
 * 2. Validates parameter keys against naming rules
 * 3. Checks for duplicate keys and ensures consistency
 * 4. Generates a Zod schema from the validated arguments
 *
 * @throws {NodeOperationError} When parameter keys are invalid or when duplicate keys have inconsistent definitions
 * @returns {z.ZodObject} A Zod schema object representing the structure and validation rules for the node parameters
 */
function getSchema(node: INode) {
	const collectedArguments: FromAIArgument[] = [];
	try {
		traverseNodeParameters(node.parameters, collectedArguments);
	} catch (error) {
		throw new NodeOperationError(node, error as Error);
	}

	// Validate each collected argument
	const nameValidationRegex = /^[a-zA-Z0-9_-]{1,64}$/;
	const keyMap = new Map<string, FromAIArgument>();
	for (const argument of collectedArguments) {
		if (argument.key.length === 0 || !nameValidationRegex.test(argument.key)) {
			const isEmptyError = 'You must specify a key when using $fromAI()';
			const isInvalidError = `Parameter key \`${argument.key}\` is invalid`;
			const error = new Error(argument.key.length === 0 ? isEmptyError : isInvalidError);
			throw new NodeOperationError(node, error, {
				description:
					'Invalid parameter key, must be between 1 and 64 characters long and only contain letters, numbers, underscores, and hyphens',
			});
		}

		if (keyMap.has(argument.key)) {
			// If the key already exists in the Map
			const existingArg = keyMap.get(argument.key)!;

			// Check if the existing argument has the same description and type
			if (existingArg.description !== argument.description || existingArg.type !== argument.type) {
				// If not, throw an error for inconsistent duplicate keys
				throw new NodeOperationError(
					node,
					`Duplicate key '${argument.key}' found with different description or type`,
					{
						description:
							'Ensure all $fromAI() calls with the same key have consistent descriptions and types',
					},
				);
			}
			// If the duplicate key has consistent description and type, it's allowed (no action needed)
		} else {
			// If the key doesn't exist in the Map, add it
			keyMap.set(argument.key, argument);
		}
	}

	// Remove duplicate keys, latest occurrence takes precedence
	const uniqueArgsMap = collectedArguments.reduce((map, arg) => {
		map.set(arg.key, arg);
		return map;
	}, new Map<string, FromAIArgument>());

	const uniqueArguments = Array.from(uniqueArgsMap.values());

	// Generate Zod schema from unique arguments
	const schemaObj = uniqueArguments.reduce((acc: Record<string, z.ZodTypeAny>, placeholder) => {
		acc[placeholder.key] = generateZodSchema(placeholder);
		return acc;
	}, {});

	return z.object(schemaObj).required();
}

/**
 * Generates a description for a node based on the provided parameters.
 * @param node The node type.
 * @param nodeParameters The parameters of the node.
 * @returns A string description for the node.
 */
function makeDescription(node: INode, nodeType: INodeType): string {
	const manualDescription = node.parameters.toolDescription as string;

	if (node.parameters.descriptionType === 'auto') {
		const resource = node.parameters.resource as string;
		const operation = node.parameters.operation as string;
		let description = nodeType.description.description;
		if (resource) {
			description += `\n Resource: ${resource}`;
		}
		if (operation) {
			description += `\n Operation: ${operation}`;
		}
		return description.trim();
	}
	if (node.parameters.descriptionType === 'manual') {
		return manualDescription ?? nodeType.description.description;
	}

	return nodeType.description.description;
}

export function nodeNameToToolName(node: INode): string {
	return node.name.replace(/ /g, '_');
}

/**
 * Creates a DynamicStructuredTool from a node.
 * @returns A DynamicStructuredTool instance.
 */
function createTool(options: CreateNodeAsToolOptions) {
	const { node, nodeType, handleToolInvocation } = options;
	const schema = getSchema(node);
	const description = makeDescription(node, nodeType);
	const nodeName = nodeNameToToolName(node);
	const name = nodeName || nodeType.description.name;

	return new DynamicStructuredTool({
		name,
		description,
		schema,
		func: async (toolArgs: z.infer<typeof schema>) => await handleToolInvocation(toolArgs),
	});
}

/**
 * Converts node into LangChain tool by analyzing node parameters,
 * identifying placeholders using the $fromAI function, and generating a Zod schema. It then creates
 * a DynamicStructuredTool that can be used in LangChain workflows.
 */
export function createNodeAsTool(options: CreateNodeAsToolOptions) {
	return { response: createTool(options) };
}
