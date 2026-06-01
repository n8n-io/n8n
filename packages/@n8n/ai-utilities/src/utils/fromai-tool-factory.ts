import type { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import type { FromAIArgument, IDataObject, INode } from 'n8n-workflow';

import { createZodSchemaFromArgs, extractFromAIParameters } from './fromai-helpers';

export { extractFromAIParameters, createZodSchemaFromArgs } from './fromai-helpers';

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
