import { Tool, StructuredTool } from '@langchain/core/tools';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { convertObjectBySchema } from './utils/convertToSchema';

export class ToolExecutor implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Tool Executor',
		name: 'toolExecutor',
		version: 1,
		defaults: {
			name: 'Tool Executor',
		},
		hidden: true,
		inputs: [NodeConnectionTypes.Main, NodeConnectionTypes.AiTool],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'json',
				default: '{}',
				description: 'Parameters to pass to the tool as JSON or string',
			},
			{
				displayName: 'Tool Name',
				name: 'toolName',
				type: 'string',
				default: '',
				description: 'Name of the tool to execute if the connected tool is a toolkit',
			},
		],
		group: ['output'],
		description: 'Virtual Agent to execute tools in partial executions',
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const query = this.getNodeParameter('query', 0, {}) as string | object;
		const toolName = this.getNodeParameter('toolName', 0, '') as string;

		let parsedQuery: string | object = query;

		try {
			parsedQuery = typeof query === 'string' ? JSON.parse(query) : query;
		} catch (error) {
			// If parsing fails, keep the original string
		}

		const resultData: INodeExecutionData[] = [];
		const toolInputs = await this.getInputConnectionData(NodeConnectionTypes.AiTool, 0);

		if (!toolInputs || !Array.isArray(toolInputs)) {
			throw new NodeOperationError(this.getNode(), 'No tool inputs found');
		}

		for (const tool of toolInputs) {
			if (tool instanceof Tool || tool instanceof StructuredTool) {
				// Handle LangChain tools
				try {
					// If tool has a schema, use it to parse and validate the input
					if ('schema' in tool && tool.schema) {
						const convertedQuery = convertObjectBySchema(parsedQuery, tool.schema);
						const result = await tool.invoke(convertedQuery);
						resultData.push({ json: result as IDataObject });
					} else {
						// Fallback to direct invocation if no schema
						const result = await tool.invoke(parsedQuery);
						resultData.push({ json: result as IDataObject });
					}
				} catch (error) {
					throw new NodeOperationError(this.getNode(), `Error executing tool: ${error.message}`);
				}
			} else if (tool && typeof (tool as { getTools?: () => unknown[] }).getTools === 'function') {
				// Handle toolkits
				const tools = (tool as { getTools: () => unknown[] }).getTools();
				for (const toolkitTool of tools) {
					if (toolkitTool instanceof Tool || toolkitTool instanceof StructuredTool) {
						if (toolName === toolkitTool.name) {
							try {
								// If tool has a schema, use it to parse and validate the input
								if ('schema' in toolkitTool && toolkitTool.schema) {
									const convertedQuery = convertObjectBySchema(parsedQuery, toolkitTool.schema);
									const result = await toolkitTool.invoke(convertedQuery);
									resultData.push({ json: result as IDataObject });
								} else {
									// Fallback to direct invocation if no schema
									const result = await toolkitTool.invoke(parsedQuery);
									resultData.push({ json: result as IDataObject });
								}
							} catch (error) {
								throw new NodeOperationError(
									this.getNode(),
									`Error executing tool: ${error.message}`,
								);
							}
						}
					}
				}
			}
		}

		// Log the tool output
		this.logger.info('Tool execution result:', { resultData });

		return [resultData];
	}
}
