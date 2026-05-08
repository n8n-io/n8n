import { getConnectionHintNoticeField } from '@n8n/ai-utilities';
import {
	type IExecuteFunctions,
	type INodeExecutionData,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { getTools } from './loadOptions';
import type { McpToolIncludeMode } from './types';
import { credentials, transportSelect } from '../shared/descriptions';
import { buildMcpToolkit, executeMcpTool, type ResolvedMcpConfig } from '../shared/runtime';
import type { McpAuthenticationOption, McpServerTransport } from '../shared/types';

function resolveConfigFromNodeParameters(
	ctx: ISupplyDataFunctions | IExecuteFunctions,
	itemIndex: number,
): ResolvedMcpConfig {
	const node = ctx.getNode();
	const authentication = ctx.getNodeParameter(
		'authentication',
		itemIndex,
	) as McpAuthenticationOption;
	const timeout = ctx.getNodeParameter('options.timeout', itemIndex, 60000) as number;

	let transport: McpServerTransport;
	let endpointUrl: string;
	if (node.typeVersion === 1) {
		transport = 'sse';
		endpointUrl = ctx.getNodeParameter('sseEndpoint', itemIndex) as string;
	} else {
		transport = ctx.getNodeParameter('serverTransport', itemIndex) as McpServerTransport;
		endpointUrl = ctx.getNodeParameter('endpointUrl', itemIndex) as string;
	}

	return {
		authentication,
		transport,
		endpointUrl,
		timeout,
		toolFilter: {
			mode: ctx.getNodeParameter('include', itemIndex) as McpToolIncludeMode,
			includeTools: ctx.getNodeParameter('includeTools', itemIndex, []) as string[],
			excludeTools: ctx.getNodeParameter('excludeTools', itemIndex, []) as string[],
		},
	};
}

export class McpClientTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MCP Client Tool',
		name: 'mcpClientTool',
		icon: {
			light: 'file:../mcp.svg',
			dark: 'file:../mcp.dark.svg',
		},
		group: ['output'],
		version: [1, 1.1, 1.2],
		description: 'Connect tools from an MCP Server',
		defaults: {
			name: 'MCP Client',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Recommended Tools'],
			},
			alias: ['Model Context Protocol', 'MCP Client'],
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
		credentials,
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: 'SSE Endpoint',
				name: 'sseEndpoint',
				type: 'string',
				description: 'SSE Endpoint of your MCP server',
				placeholder: 'e.g. https://my-mcp-server.ai/sse',
				default: '',
				required: true,
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Endpoint',
				name: 'endpointUrl',
				type: 'string',
				description: 'Endpoint of your MCP server',
				placeholder: 'e.g. https://my-mcp-server.ai/mcp',
				default: '',
				required: true,
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.1 } }],
					},
				},
			},
			transportSelect({
				defaultOption: 'sse',
				displayOptions: {
					show: {
						'@version': [1.1],
					},
				},
			}),
			transportSelect({
				defaultOption: 'httpStreamable',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
				},
			}),
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Bearer Auth',
						value: 'bearerAuth',
					},
					{
						name: 'Header Auth',
						value: 'headerAuth',
					},
					{
						name: 'None',
						value: 'none',
					},
				],
				default: 'none',
				description: 'The way to authenticate with your endpoint',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { lt: 1.2 } }],
					},
				},
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Bearer Auth',
						value: 'bearerAuth',
					},
					{
						name: 'Header Auth',
						value: 'headerAuth',
					},
					{
						name: 'MCP OAuth2',
						value: 'mcpOAuth2Api',
					},
					{
						name: 'Multiple Headers Auth',
						value: 'multipleHeadersAuth',
					},
					{
						name: 'None',
						value: 'none',
					},
				],
				default: 'none',
				description: 'The way to authenticate with your endpoint',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
				},
			},
			{
				displayName: 'Credentials',
				name: 'credentials',
				type: 'credentials',
				default: '',
				displayOptions: {
					show: {
						authentication: ['headerAuth', 'bearerAuth', 'mcpOAuth2Api', 'multipleHeadersAuth'],
					},
				},
			},
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
					loadOptionsDependsOn: ['sseEndpoint'],
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
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
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
						default: 60000,
						description: 'Time in ms to wait for tool calls to finish',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			getTools,
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		return await buildMcpToolkit(this, itemIndex, resolveConfigFromNodeParameters(this, itemIndex));
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await executeMcpTool(this, (itemIndex) =>
			resolveConfigFromNodeParameters(this, itemIndex),
		);
	}
}
