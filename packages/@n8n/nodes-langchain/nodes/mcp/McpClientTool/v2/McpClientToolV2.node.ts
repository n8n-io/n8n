import type {
	INodeTypeBaseDescription,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { getTools } from './loadOptions';
import type { McpServerTransport, McpAuthenticationOption, McpToolIncludeMode } from './types';
import {
	connectMcpClient,
	createCallTool,
	getAllTools,
	getAuthHeaders,
	getSelectedTools,
	McpToolkit,
	mcpToolToDynamicTool,
} from './utils';

export class McpClientToolV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 2,
			defaults: {},
			inputs: [],
			outputs: [{ type: NodeConnectionTypes.AiTool, displayName: 'Tools' }],
			credentials: [],
			properties: [
				getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
				{
					displayName: 'Endpoint',
					name: 'endpointUrl',
					type: 'string',
					description: 'Endpoint of your MCP server',
					placeholder: 'e.g. https://my-mcp-server.ai/mcp',
					default: '',
					required: true,
				},
				{
					displayName: 'Server Transport',
					name: 'serverTransport',
					type: 'options',
					options: [
						{
							name: 'Server Sent Events (Deprecated)',
							value: 'sse',
						},
						{
							name: 'HTTP Streamable',
							value: 'httpStreamable',
						},
					],
					default: 'sse',
					description: 'The transport used by your endpoint',
				},

				{
					displayName: 'Authentication',
					name: 'authentication',
					type: 'options',
					options: [
						{
							name: 'Generic Credential Type',
							value: 'genericCredentialType',
							description: 'Fully customizable. Choose between basic, header, OAuth2, etc.',
						},
						{
							name: 'None',
							value: 'none',
						},
					],
					default: 'none',
					description: 'The way to authenticate with your endpoint',
				},

				{
					displayName: 'Generic Auth Type',
					name: 'genericAuthType',
					type: 'credentialsSelect',
					required: true,
					default: '',
					credentialTypes: ['has:genericAuth'],
					displayOptions: {
						show: {
							authentication: ['genericCredentialType'],
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
						loadOptionsDependsOn: ['endpointUrl'],
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
	}

	methods = {
		loadOptions: {
			getTools,
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const authentication = this.getNodeParameter(
			'authentication',
			itemIndex,
			'none',
		) as McpAuthenticationOption;

		const node = this.getNode();

		const serverTransport = this.getNodeParameter(
			'serverTransport',
			itemIndex,
		) as McpServerTransport;
		const endpointUrl = this.getNodeParameter('endpointUrl', itemIndex) as string;

		if (authentication !== 'none') {
			const domain = new URL(endpointUrl).hostname;
			if (domain.includes('{') && domain.includes('}')) {
				throw new NodeOperationError(
					this.getNode(),
					"Can't use a placeholder for the domain when using authentication",
					{
						itemIndex,
						description:
							'This is for security reasons, to prevent the model accidentally sending your credentials to an unauthorized domain',
					},
				);
			}
		}

		const { headers } = await getAuthHeaders(this, authentication, itemIndex);
		const client = await connectMcpClient({
			serverTransport,
			endpointUrl,
			headers,
			name: node.type,
			version: node.typeVersion,
		});

		const setError = (message: string, description?: string): SupplyData => {
			const error = new NodeOperationError(node, message, { itemIndex, description });
			this.addOutputData(NodeConnectionTypes.AiTool, itemIndex, error);
			throw error;
		};

		if (!client.ok) {
			this.logger.error('McpClientTool: Failed to connect to MCP Server', {
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

		this.logger.debug('McpClientTool: Successfully connected to MCP Server');

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
					createCallTool(tool.name, client.result, (errorMessage) => {
						const error = new NodeOperationError(node, errorMessage, { itemIndex });
						void this.addOutputData(NodeConnectionTypes.AiTool, itemIndex, error);
						this.logger.error(`McpClientTool: Tool "${tool.name}" failed to execute`, { error });
					}),
				),
				this,
			),
		);

		this.logger.debug(`McpClientTool: Connected to MCP Server with ${tools.length} tools`);

		const toolkit = new McpToolkit(tools);

		return { response: toolkit, closeFunction: async () => await client.result.close() };
	}
}
