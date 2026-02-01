import type { Toolkit } from '@langchain/classic/agents';
import { StructuredTool, Tool } from '@langchain/core/tools';
import { buildResponseMetadata, processHitlResponses } from '@utils/agent-execution';
import {
	extractHitlMetadata,
	hasGatedToolNodeName,
} from '@utils/agent-execution/createEngineRequests';
import type { RequestResponseMetadata } from '@utils/agent-execution/types';
import get from 'lodash/get';
import type {
	EngineRequest,
	EngineResponse,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOutput,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { executeTool } from './utils/executeTool';
import { convertValueBySchema } from './utils/convertToSchema';
import { ZodObject } from 'zod';

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
				description:
					'Key-value pairs, where key is the name of the tool name and value is the parameters to pass to the tool',
			},
			{
				displayName: 'Tool Name',
				name: 'toolName',
				type: 'string',
				default: '',
				description: 'Name of the tool to execute if the connected tool is a toolkit',
			},
			{
				displayName: 'Node',
				name: 'node',
				type: 'string',
				default: '',
				description: 'Name of the node that is being executed',
			},
		],
		group: ['transform'],
		description: 'Node to execute tools without an AI Agent',
	};

	async execute(
		this: IExecuteFunctions,
		response?: EngineResponse<RequestResponseMetadata>,
	): Promise<NodeOutput> {
		// Process HITL (Human-in-the-Loop) tool responses before running the agent
		// If there are approved HITL tools, we need to execute the gated tools first
		const hitlResult = processHitlResponses(response, 0);

		if (hitlResult.hasApprovedHitlTools && hitlResult.pendingGatedToolRequest) {
			// Return the gated tool request immediately
			// The Agent will resume after the gated tool executes
			return hitlResult.pendingGatedToolRequest;
		}

		const query = this.getNodeParameter('query', 0, {}) as string | object;
		const toolName = this.getNodeParameter('toolName', 0, '') as string;
		const node = this.getNodeParameter('node', 0, '') as string;

		let parsedQuery: Record<string, unknown>;

		try {
			parsedQuery = typeof query === 'string' ? JSON.parse(query) : query;
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				`Failed to parse query: ${(error as Error).message}`,
			);
		}

		const getQueryData = (name: string) => {
			// node names in query may have underscores in place of spaces, use it for accessing the query data.
			return (get(parsedQuery, name, null) ?? get(parsedQuery, name.replaceAll(' ', '_'), null)) as
				| Record<string, unknown>
				| string
				| null;
		};

		const resultData: INodeExecutionData[] = [];
		const toolInputs = await this.getInputConnectionData(NodeConnectionTypes.AiTool, 0);

		if (!toolInputs || !Array.isArray(toolInputs)) {
			throw new NodeOperationError(this.getNode(), 'No tool inputs found');
		}

		try {
			for (const tool of toolInputs) {
				// Handle toolkits
				if (tool && typeof (tool as Toolkit).getTools === 'function') {
					const toolsInToolkit = (tool as Toolkit).getTools();
					for (const toolkitTool of toolsInToolkit) {
						if (!(toolkitTool instanceof Tool || toolkitTool instanceof StructuredTool)) {
							continue;
						}

						if (toolName === toolkitTool.name) {
							if (hasGatedToolNodeName(toolkitTool.metadata) && node) {
								const toolInput: { toolParameters: unknown } = {
									toolParameters: getQueryData(toolName) ?? {},
								};
								const hitlInput = getQueryData(node);
								if (typeof hitlInput === 'string') {
									throw new NodeOperationError(
										this.getNode(),
										`Invalid hitl input for tool ${toolkitTool.name}`,
									);
								}

								// handle code tool which uses a string input, but it should be converted to an object
								const requiresObjectInput =
									toolkitTool.metadata.originalSchema &&
									toolkitTool.metadata.originalSchema instanceof ZodObject;
								if (typeof toolInput.toolParameters === 'string' && requiresObjectInput) {
									toolInput.toolParameters = convertValueBySchema(
										toolInput.toolParameters,
										toolkitTool.metadata.originalSchema,
									);
								}

								const hitlMetadata = extractHitlMetadata(
									toolkitTool.metadata,
									toolkitTool.name,
									toolInput as IDataObject,
								);

								// prepare request for execution engine to execute the HITL node
								const engineRequest: EngineRequest<RequestResponseMetadata>['actions'] = [
									{
										actionType: 'ExecutionNodeAction' as const,
										nodeName: node,
										input: {
											tool: toolName,
											toolParameters: toolInput.toolParameters as IDataObject,
											...hitlInput,
										},
										type: 'ai_tool',
										id: crypto.randomUUID(),
										metadata: {
											itemIndex: 0,
											hitl: hitlMetadata,
										},
									},
								];
								return {
									actions: engineRequest,
									metadata: buildResponseMetadata(response, 0),
								};
							}

							const result = await executeTool(toolkitTool, getQueryData(toolName) ?? {});
							resultData.push(result);
						}
					}
				} else {
					// Handle single tool
					if (!toolName || toolName === tool.name) {
						const toolInput = getQueryData(toolName || tool.name);
						const result = await executeTool(tool, toolInput ?? {});
						resultData.push(result);
					}
				}
			}
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				`Error executing tool: ${(error as Error).message}`,
			);
		}
		return [resultData];
	}
}
