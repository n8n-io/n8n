import type { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import type { FromAIArgument, IDataObject, INode, INodeParameters } from 'n8n-workflow';
import { generateZodSchema, traverseNodeParameters } from 'n8n-workflow';
import { z } from 'zod';

export type ToolFunc = (
	query: string | IDataObject,
	runManager?: CallbackManagerForToolRun,
) => Promise<string | IDataObject | IDataObject[]>;

export interface CreateToolOptions {
	name: string;
	description: string;
	func: ToolFunc;
	/**
	 * Extra arguments to include in the structured tool schema.
	 * These are added after extracting $fromAI parameters from node parameters.
	 */
	extraArgs?: FromAIArgument[];
}

/**
 * Extracts $fromAI parameters from node parameters and returns unique arguments.
 */
export function extractFromAIParameters(nodeParameters: INodeParameters): FromAIArgument[] {
	const collectedArguments: FromAIArgument[] = [];
	traverseNodeParameters(nodeParameters, collectedArguments);

	const uniqueArgsMap = new Map<string, FromAIArgument>();
	for (const arg of collectedArguments) {
		uniqueArgsMap.set(arg.key, arg);
	}

	return Array.from(uniqueArgsMap.values());
}

/**
 * Creates a Zod schema from $fromAI arguments.
 */
export function createZodSchemaFromArgs(args: FromAIArgument[]): z.ZodObject<z.ZodRawShape> {
	const schemaObj = args.reduce((acc: Record<string, z.ZodTypeAny>, placeholder) => {
		acc[placeholder.key] = generateZodSchema(placeholder);
		return acc;
	}, {});

	return z.object(schemaObj).required();
}

/**
 * Creates a DynamicStructuredTool if node has $fromAI parameters,
 * otherwise falls back to a simple DynamicTool.
 *
 * This is useful for creating AI agent tools that can extract parameters
 * from node configuration using $fromAI expressions.
 */
export function createToolFromNode(
	node: INode,
	options: CreateToolOptions,
): DynamicStructuredTool | DynamicTool {
	const { name, description, func, extraArgs = [] } = options;

	const collectedArguments = extractFromAIParameters(node.parameters);

	// If there are no $fromAI arguments and no extra args, fallback to simple tool
	if (collectedArguments.length === 0 && extraArgs.length === 0) {
		return new DynamicTool({ name, description, func });
	}

	// Combine collected arguments with extra arguments
	const allArguments = [...collectedArguments, ...extraArgs];
	const schema = createZodSchemaFromArgs(allArguments);

	return new DynamicStructuredTool({ schema, name, description, func });
}
