import {
	NodeConnectionTypes,
	NodeOperationError,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { testMcpSseCredential } from './credentialTest';
import { getTools } from './loadOptions';
import type { McpSseCredential, McpToolIncludeMode } from './types';
import {
	connectMcpClient,
	createCallTool,
	getAllTools,
	getSelectedTools,
	getToolCallErrorDescription,
	McpToolkit,
	mcpToolToDynamicTool,
} from './utils';

export class ToolMcpClient implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MCP Client Tool',
		name: 'toolMcpClient',
		icon: {
			light: 'file:mcp.svg',
			dark: 'file:mcp.dark.svg',
		},
		group: ['output'],
		version: 1,
		description: 'Connect tools from an MCP Server',
		defaults: {
			name: 'MCP Client',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Other Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp/',
					},
				],
			},
		},
		inputs: [],
		outputs: [{ type: NodeConnectionTypes.AiTool, displayName: 'Tools' }],
		credentials: [{ name: 'mcpSseApi', testedBy: 'testMcpSseCredential' }],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Tools to Include',
				name: 'include',
				type: 'options',
				description: 'How to select the tools you want to be exposed to the AI Agent',
				default: 'all',
				options: [
					{
						name: 'All',
						value: 'all',
						description: 'Also include all unchanged fields from the input',
					},
					{
						name: 'Selected',
						value: 'selected',
						description: 'Also include the tools listed in the parameter "Tools to Include"',
					},
					{
						name: 'All Except',
						value: 'except',
						description: 'Exclude the tools listed in the parameter "Tools to Exclude"',
					},
				],
			},
			{
				displayName: 'Tools to Include',
				name: 'includeTools',
				type: 'multiOptions',
				default: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getTools',
				},
				displayOptions: {
					show: {
						include: ['selected'],
					},
				},
			},
			{
				displayName: 'Tools to Exclude',
				name: 'excludeTools',
				type: 'multiOptions',
				default: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getTools',
				},
				displayOptions: {
					show: {
						include: ['except'],
					},
				},
			},
		],
	};

	methods = {
		loadOptions: {
			getTools,
		},
		credentialTest: {
			testMcpSseCredential,
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const sseCredentials = await this.getCredentials<McpSseCredential>('mcpSseApi');
		const node = this.getNode();
		const client = await connectMcpClient({
			credential: sseCredentials,
			name: node.type,
			version: node.typeVersion,
		});

		const setError = (message: string, description?: string): SupplyData => {
			const error = new NodeOperationError(node, message, { itemIndex, description });
			this.addOutputData(NodeConnectionTypes.AiTool, itemIndex, error);
			throw error;
		};

		if (!client.ok) {
			this.logger.error('ToolMCPClient: Failed to connect to MCP Server', {
				error: client.error,
			});

			switch (client.error.type) {
				case 'invalid_url':
					return setError('Could not connect to your MCP server. The provided URL is invalid.');
				case 'connection':
				default:
					return setError('Could not connect to your MCP server');
			}
		}

		this.logger.debug('ToolMCPClient: Successfully connected to MCP Server');

		const mode = this.getNodeParameter('include', itemIndex) as McpToolIncludeMode;
		const includeTools = this.getNodeParameter('includeTools', itemIndex, []) as string[];
		const excludeTools = this.getNodeParameter('excludeTools', itemIndex, []) as string[];

		const allTools = await getAllTools(client.result);
		const mcpTools = getSelectedTools({
			tools: allTools,
			mode,
			includeTools,
			excludeTools,
		});

		if (!mcpTools.length) {
			return setError(
				'MCP Server returned no tools',
				'Connected successfully to your MCP server but it returned an empty list of tools.',
			);
		}

		const tools = mcpTools.map((tool) =>
			logWrapper(
				mcpToolToDynamicTool(
					tool,
					createCallTool(tool.name, client.result, (error) => {
						this.logger.error(`ToolMCPClient: Tool "${tool.name}" failed to execute`, { error });
						throw new NodeOperationError(node, `Failed to execute tool "${tool.name}"`, {
							description: getToolCallErrorDescription(error),
						});
					}),
				),
				this,
			),
		);

		this.logger.debug(`ToolMCPClient: Connected to MCP Server with ${tools.length} tools`);

		const toolkit = new McpToolkit(tools);

		return { response: toolkit, closeFunction: async () => await client.result.close() };
	}
}
