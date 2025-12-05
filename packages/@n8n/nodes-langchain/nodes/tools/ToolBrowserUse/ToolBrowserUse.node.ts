import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import {
	BrowserUseToolkit,
	createCallTool,
	mcpToolToDynamicTool,
	type McpContentItem,
	convertMcpContentToLangChain,
} from './utils';
import { connectMcpClient, getAllTools, mapToNodeOperationError } from '../../mcp/shared/utils';

const TOOL_NAMES = ['browser'] as const;

function getBrowserUseUrl(): string {
	const globalConfig = Container.get(GlobalConfig);
	return globalConfig.browserUse.url;
}

export class ToolBrowserUse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Browser Use',
		name: 'toolBrowserUse',
		icon: {
			light: 'file:../../BrowserUse/browserUse.svg',
			dark: 'file:../../BrowserUse/browserUse.dark.svg',
		},
		group: ['transform'],
		version: 1,
		description: 'Provides browser automation capabilities (navigation, interaction, extraction)',
		defaults: {
			name: 'Browser Use',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
			},
			alias: ['Browser Use', 'Puppeteer', 'Web Scraping', 'Browser Automation'],
		},
		inputs: [],
		outputs: [{ type: NodeConnectionTypes.AiTool, displayName: 'Tools' }],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 120000,
						description: 'Time in ms to wait for tool calls to finish',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const node = this.getNode();
		const timeout = this.getNodeParameter('options.timeout', itemIndex, 120000) as number;

		const rawUrl = getBrowserUseUrl();
		this.logger.debug(`ToolBrowserUse: Raw URL from config: "${rawUrl}"`);

		if (!rawUrl) {
			throw new NodeOperationError(
				node,
				'Browser Use URL not configured. Set the N8N_BROWSER_USE_URL environment variable.',
				{ itemIndex },
			);
		}

		let endpointUrl = rawUrl;

		// Ensure URL ends with /mcp
		if (!endpointUrl.endsWith('/mcp')) {
			endpointUrl = `${endpointUrl}/mcp`;
		}

		const setError = (error: NodeOperationError): SupplyData => {
			this.addOutputData(NodeConnectionTypes.AiTool, itemIndex, error);
			throw error;
		};

		const client = await connectMcpClient({
			serverTransport: 'httpStreamable',
			endpointUrl,
			name: node.type,
			version: node.typeVersion,
		});

		if (!client.ok) {
			this.logger.error('ToolBrowserUse: Failed to connect to Browser Use server', {
				error: client.error,
			});
			return setError(mapToNodeOperationError(node, client.error));
		}

		this.logger.debug('ToolBrowserUse: Successfully connected to Browser Use server');

		// Fetch tools from the MCP server (same pattern as McpClientTool)
		const mcpTools = await getAllTools(client.result);

		if (!mcpTools?.length) {
			return setError(
				new NodeOperationError(node, 'Browser Use server returned no tools', {
					itemIndex,
					description:
						'Connected successfully to the Browser Use server but it returned an empty list of tools.',
				}),
			);
		}

		// Convert MCP tools to LangChain tools (same pattern as McpClientTool)
		const tools = mcpTools.map((tool) =>
			logWrapper(
				mcpToolToDynamicTool(
					tool,
					createCallTool(tool.name, client.result, timeout, (errorMessage) => {
						const error = new NodeOperationError(node, errorMessage, { itemIndex });
						void this.addOutputData(NodeConnectionTypes.AiTool, itemIndex, error);
						this.logger.error(`ToolBrowserUse: Tool "${tool.name}" failed to execute`, { error });
					}),
				),
				this,
			),
		);

		this.logger.debug(`ToolBrowserUse: Initialized with ${tools.length} tools`);

		const toolkit = new BrowserUseToolkit(tools);

		return {
			response: toolkit,
			closeFunction: async () => await client.result.close(),
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const node = this.getNode();
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const item = items[itemIndex];
			const timeout = this.getNodeParameter('options.timeout', itemIndex, 120000) as number;

			const rawUrl = getBrowserUseUrl();
			if (!rawUrl) {
				throw new NodeOperationError(
					node,
					'Browser Use URL not configured. Set the N8N_BROWSER_USE_URL environment variable.',
					{ itemIndex },
				);
			}

			let endpointUrl = rawUrl;
			if (!endpointUrl.endsWith('/mcp')) {
				endpointUrl = `${endpointUrl}/mcp`;
			}

			const client = await connectMcpClient({
				serverTransport: 'httpStreamable',
				endpointUrl,
				name: node.type,
				version: node.typeVersion,
			});

			if (!client.ok) {
				throw mapToNodeOperationError(node, client.error);
			}

			// Check for tool name in item.json.tool
			if (!item.json.tool || typeof item.json.tool !== 'string') {
				throw new NodeOperationError(node, 'Tool name not found in item.json.tool', {
					itemIndex,
				});
			}

			const toolName = item.json.tool;
			if (!TOOL_NAMES.includes(toolName as (typeof TOOL_NAMES)[number])) {
				throw new NodeOperationError(
					node,
					`Invalid tool name "${toolName}". Valid tools are: ${TOOL_NAMES.join(', ')}`,
					{ itemIndex },
				);
			}

			// Extract the tool name from arguments before passing to MCP
			const { tool: _, ...toolArguments } = item.json;
			const params: {
				name: string;
				arguments: IDataObject;
			} = {
				name: toolName,
				arguments: toolArguments as IDataObject,
			};

			const result = await client.result.callTool(params, CallToolResultSchema, {
				timeout,
			});

			returnData.push({
				json: {
					response: convertMcpContentToLangChain(result.content as McpContentItem[]),
				},
				pairedItem: {
					item: itemIndex,
				},
			});

			await client.result.close();
		}

		return [returnData];
	}
}
