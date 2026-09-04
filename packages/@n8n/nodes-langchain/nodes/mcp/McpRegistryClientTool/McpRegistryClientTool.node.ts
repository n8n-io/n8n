import {
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodePropertyOptions,
	getConfiguredEndpointUrl,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type McpRegistryConnection,
	type McpRegistryRuntime,
	type PrepareMcpRegistryConnectionInput,
	type PrepareMcpRegistryConnectionResult,
	type SupplyData,
	NodeOperationError,
} from 'n8n-workflow';

import type { McpToolIncludeMode } from '../McpClientTool/types';
import {
	buildMcpToolkit,
	executeMcpTool,
	loadMcpToolOptions,
	type ResolvedMcpConfig,
} from '../shared/runtime';
import type { McpAuthenticationOption } from '../shared/types';

/**
 * Nodes from the MCP registry are saved as `@n8n/mcp-registry.<slug>`
 *
 * This class is the shared runtime for all of them
 */
export class McpRegistryClientTool implements INodeType {
	private static registryRuntime: McpRegistryRuntime | undefined;

	setRegistryRuntime(runtime: typeof McpRegistryClientTool.registryRuntime): void {
		McpRegistryClientTool.registryRuntime = runtime;
	}

	static getConnection(node: ReturnType<IExecuteFunctions['getNode']>): McpRegistryConnection {
		const connection = this.registryRuntime?.resolveConnection(node.type);
		if (connection) return connection;
		throw new NodeOperationError(node, 'MCP registry connection is not registered');
	}

	static prepareConnection(
		input: PrepareMcpRegistryConnectionInput,
	): PrepareMcpRegistryConnectionResult {
		return (
			this.registryRuntime?.prepareConnection(input) ?? {
				ok: false,
				error: {
					code: 'not_registered',
					message: 'MCP registry connection is not registered',
				},
			}
		);
	}

	description: INodeTypeDescription = {
		displayName: 'MCP Registry Client (internal)',
		name: 'mcpRegistryClientTool',
		hidden: true,
		group: ['output'],
		version: [1, 1.1],
		defaultVersion: 1.1,
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
		// endpointUrl and serverTransport are not used, kept as metadata for agent frontend configuration flow for tools
		// TODO: update frontend flow to not rely on these properties
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
				const connection = McpRegistryClientTool.getConnection(this.getNode());
				const authentication = getCredentialType(this, connection);
				return await loadMcpToolOptions(this, {
					authentication,
					transport: connection.transport,
					endpointUrl: getConfiguredEndpointUrl(connection),
					registryCredential: {
						connection,
						prepareConnection: (input) => McpRegistryClientTool.prepareConnection(input),
					},
					timeout: this.getNodeParameter('options.timeout', 60000) as number,
				});
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		return await buildMcpToolkit(this, itemIndex, resolveConfig(this, itemIndex));
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await executeMcpTool(this, (itemIndex) => resolveConfig(this, itemIndex), {
			// v1.1+ reuses one MCP session across tool calls within an execution.
			enableSessionCache: this.getNode().typeVersion >= 1.1,
		});
	}
}

function resolveConfig(
	ctx: ISupplyDataFunctions | IExecuteFunctions,
	itemIndex: number,
): ResolvedMcpConfig {
	const connection = McpRegistryClientTool.getConnection(ctx.getNode());
	const authentication = getCredentialType(ctx, connection);
	return {
		authentication,
		transport: connection.transport,
		endpointUrl: getConfiguredEndpointUrl(connection),
		registryCredential: {
			connection,
			prepareConnection: (input) => McpRegistryClientTool.prepareConnection(input),
		},
		timeout: ctx.getNodeParameter('options.timeout', itemIndex, 60000) as number,
		toolFilter: {
			mode: ctx.getNodeParameter('include', itemIndex) as McpToolIncludeMode,
			includeTools: ctx.getNodeParameter('includeTools', itemIndex, []) as string[],
			excludeTools: ctx.getNodeParameter('excludeTools', itemIndex, []) as string[],
		},
	};
}

function getCredentialType(
	ctx: Pick<ILoadOptionsFunctions | ISupplyDataFunctions | IExecuteFunctions, 'getNode'>,
	connection: McpRegistryConnection,
): McpAuthenticationOption {
	const node = ctx.getNode();
	if (!Object.hasOwn(node.credentials ?? {}, connection.credentialType)) {
		throw new NodeOperationError(node, 'No MCP OAuth2 credential type found');
	}

	return connection.credentialType;
}
