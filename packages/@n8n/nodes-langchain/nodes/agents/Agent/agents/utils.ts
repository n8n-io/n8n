import type { BaseOutputParser } from '@langchain/core/output_parsers';
import type { DynamicStructuredTool, Tool } from 'langchain/tools';
import { NodeOperationError, type IExecuteFunctions, type INode } from 'n8n-workflow';

import type { ZodObjectAny } from '../../../../types/types';

export async function extractParsedOutput(
	ctx: IExecuteFunctions,
	outputParser: BaseOutputParser<unknown>,
	output: string,
): Promise<Record<string, unknown> | undefined> {
	const parsedOutput = (await outputParser.parse(output)) as {
		output: Record<string, unknown>;
	};

	if (ctx.getNode().typeVersion <= 1.6) {
		return parsedOutput;
	}
	// For 1.7 and above, we try to extract the output from the parsed output
	// with fallback to the original output if it's not present
	return parsedOutput?.output ?? parsedOutput;
}

export async function checkForStructuredTools(
	tools: Array<Tool | DynamicStructuredTool<ZodObjectAny>>,
	node: INode,
	currentAgentType: string,
) {
	const dynamicStructuredTools = tools.filter(
		(tool) => tool.constructor.name === 'DynamicStructuredTool',
	);
	if (dynamicStructuredTools.length > 0) {
		const getToolName = (tool: Tool | DynamicStructuredTool) => `"${tool.name}"`;
		throw new NodeOperationError(
			node,
			`The selected tools are not supported by "${currentAgentType}", please use "Tools Agent" instead`,
			{
				itemIndex: 0,
				description: `Incompatible connected tools: ${dynamicStructuredTools.map(getToolName).join(', ')}`,
			},
		);
	}
}
