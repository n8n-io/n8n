import { DynamicStructuredTool } from '@langchain/core/tools';
import { AIParametersParser } from 'n8n-workflow';
import type { IDataObject, INode, INodeType, AIParametersParserOptions } from 'n8n-workflow';
import type { z } from 'zod';

export type CreateNodeAsToolOptions = {
	node: INode;
	nodeType: INodeType;
	handleToolInvocation: (toolArgs: IDataObject) => Promise<unknown>;
};

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

/**
 * Creates a DynamicStructuredTool from a node.
 * @returns A DynamicStructuredTool instance.
 */
function createTool(parser: AIParametersParser, options: CreateNodeAsToolOptions) {
	const { node, nodeType, handleToolInvocation } = options;
	const schema = parser.getSchema();
	const description = makeDescription(node, nodeType);
	const nodeName = node.name.replace(/ /g, '_');
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
export function createNodeAsTool(options: AIParametersParserOptions & CreateNodeAsToolOptions) {
	const parser = new AIParametersParser(options);
	return { response: createTool(parser, options) };
}
