import {
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodePropertyOptions,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	NodeOperationError,
} from 'n8n-workflow';

import type { McpToolHint, McpToolIncludeMode } from '../McpClientTool/types';
import {
	buildMcpToolkit,
	executeMcpTool,
	loadMcpToolOptions,
	type ResolvedMcpConfig,
} from '../shared/runtime';
import {
	isMcpOAuth2Authentication,
	type McpAuthenticationOption,
	type McpServerTransport,
} from '../shared/types';

/**
 * Nodes from the MCP registry are saved as `@n8n/mcp-registry.<slug>`
 *
 * This class is the shared runtime for all of them
 */
export class McpRegistryClientTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MCP Registry Client (internal)',
		name: 'mcpRegistryClientTool',
		hidden: true,
		group: ['output'],
		version: 1,
		description: 'Runtime backing for MCP registry-derived nodes',
		defaults: {
			name: 'MCP Registry Client',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Model Context Protocol'],
			},
			alias: ['MCP', 'Model Context Protocol'],
		},
		inputs: [],
		outputs: [{ type: NodeConnectionTypes.AiTool, displayName: 'Tools' }],
		credentials: [
			{
				name: 'mcpOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Endpoint URL',
				name: 'endpointUrl',
				type: 'hidden',
				default: '',
			},
			{
				displayName: 'Server Transport',
				name: 'serverTransport',
				type: 'hidden',
				default: 'httpStreamable',
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
						description: 'Expose every tool from the MCP server',
					},
					{
						name: 'Selected',
						value: 'selected',
						description: 'Only expose the tools listed in "Tools to Include"',
					},
					{
						name: 'All Except',
						value: 'except',
						description: 'Expose all tools except those listed in "Tools to Exclude"',
					},
					{
						name: 'With Hints',
						value: 'hints',
						description:
							'Only expose tools whose MCP annotations declare any of the selected hints as true',
					},
				],
			},
			{
				displayName: 'Tools to Include',
				name: 'includeTools',
				type: 'multiOptions',
				default: [],
				description:
					'Tools from the MCP server to expose to the agent. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
					'Tools from the MCP server to hide from the agent. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
				displayName: 'Tool Hints',
				name: 'hints',
				type: 'multiOptions',
				default: [],
				description:
					'Expose tools whose <a href="https://modelcontextprotocol.io/specification/2025-06-18/server/tools#tool-annotations">MCP annotations</a> declare any of the selected hints as true',
				options: [
					{
						name: 'Read-Only',
						value: 'readOnlyHint',
						description: 'The tool does not modify its environment',
					},
					{
						name: 'Destructive',
						value: 'destructiveHint',
						description: 'The tool may perform destructive updates',
					},
					{
						name: 'Idempotent',
						value: 'idempotentHint',
						description: 'Repeated calls with the same arguments have no additional effect',
					},
					{
						name: 'Open-World',
						value: 'openWorldHint',
						description: 'The tool interacts with an open world of external entities',
					},
				],
				displayOptions: {
					show: {
						include: ['hints'],
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
			async getTools(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const authentication = getCredentialType(this);
				return await loadMcpToolOptions(this, {
					authentication,
					transport: this.getNodeParameter('serverTransport') as McpServerTransport,
					endpointUrl: this.getNodeParameter('endpointUrl') as string,
					timeout: this.getNodeParameter('options.timeout', 60000) as number,
				});
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		return await buildMcpToolkit(this, itemIndex, resolveConfig(this, itemIndex));
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await executeMcpTool(this, (itemIndex) => resolveConfig(this, itemIndex));
	}
}

function resolveConfig(
	ctx: ISupplyDataFunctions | IExecuteFunctions,
	itemIndex: number,
): ResolvedMcpConfig {
	const authentication = getCredentialType(ctx);
	return {
		authentication,
		transport: ctx.getNodeParameter('serverTransport', itemIndex) as McpServerTransport,
		endpointUrl: ctx.getNodeParameter('endpointUrl', itemIndex) as string,
		timeout: ctx.getNodeParameter('options.timeout', itemIndex, 60000) as number,
		toolFilter: {
			mode: ctx.getNodeParameter('include', itemIndex) as McpToolIncludeMode,
			includeTools: ctx.getNodeParameter('includeTools', itemIndex, []) as string[],
			excludeTools: ctx.getNodeParameter('excludeTools', itemIndex, []) as string[],
			hints: ctx.getNodeParameter('hints', itemIndex, []) as McpToolHint[],
		},
	};
}

function getCredentialType(
	ctx: Pick<ILoadOptionsFunctions | ISupplyDataFunctions | IExecuteFunctions, 'getNode'>,
): McpAuthenticationOption {
	const node = ctx.getNode();
	const credentials = node.credentials ?? {};
	const credentialType = Object.keys(credentials).find(
		// for now we support only OAuth2
		(credentialType) => isMcpOAuth2Authentication(credentialType),
	);

	if (!credentialType) {
		throw new NodeOperationError(node, 'No MCP OAuth2 credential type found');
	}

	return credentialType;
}
