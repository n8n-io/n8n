import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type {
	IBinaryKeyData,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeExecutionWithMetadata,
} from 'n8n-workflow';
import { jsonParse, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { ZodError } from 'zod';
import { prettifyError } from 'zod/v4/core';

import * as listSearch from './listSearch';
import * as resourceMapping from './resourceMapping';
import { credentials, transportSelect } from '../shared/descriptions';
import type { McpAuthenticationOption, McpServerTransport } from '../shared/types';
import {
	getAuthHeaders,
	tryRefreshOAuth2Token,
	connectMcpClient,
	mapToNodeOperationError,
} from '../shared/utils';

export class McpClient implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MCP Client',
		description: 'Standalone MCP Client',
		name: 'mcpClient',
		icon: {
			light: 'file:../mcp.svg',
			dark: 'file:../mcp.dark.svg',
		},
		group: ['transform'],
		version: 1,
		defaults: {
			name: 'MCP Client',
		},
		credentials,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			transportSelect({
				defaultOption: 'httpStreamable',
			}),
			{
				displayName: 'MCP Endpoint URL',
				name: 'endpointUrl',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://my-mcp-server.ai/mcp',
				required: true,
				description: 'The URL of the MCP server to connect to',
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
				displayName: 'Tool',
				name: 'tool',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'The tool to use',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'getTools',
							searchable: true,
							skipCredentialsCheckInRLC: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
					},
				],
			},
			{
				displayName: 'Input Mode',
				name: 'inputMode',
				type: 'options',
				default: 'manual',
				noDataExpression: true,
				options: [
					{
						name: 'Manual',
						value: 'manual',
						description: 'Manually specify the input data for each tool parameter',
					},
					{
						name: 'JSON',
						value: 'json',
						description: 'Specify the input data as a JSON object',
					},
				],
			},
			{
				displayName: 'Parameters',
				name: 'parameters',
				type: 'resourceMapper',
				default: {
					mappingMode: 'defineBelow',
					value: null,
				},
				noDataExpression: true,
				required: true,
				typeOptions: {
					loadOptionsDependsOn: ['tool.value'],
					resourceMapper: {
						resourceMapperMethod: 'getToolParameters',
						hideNoDataError: true,
						addAllFields: false,
						supportAutoMap: false,
						mode: 'add',
						fieldWords: {
							singular: 'parameter',
							plural: 'parameters',
						},
					},
				},
				displayOptions: {
					show: {
						inputMode: ['manual'],
					},
				},
			},
			{
				displayName: 'JSON',
				name: 'jsonInput',
				type: 'json',
				typeOptions: {
					rows: 5,
				},
				default: '{\n  "my_field_1": "value",\n  "my_field_2": 1\n}\n',
				validateType: 'object',
				displayOptions: {
					show: {
						inputMode: ['json'],
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
						displayName: 'Convert to Binary',
						name: 'convertToBinary',
						type: 'boolean',
						default: true,
						description:
							'Whether to convert images and audio to binary data. If false, images and audio will be returned as base64 encoded strings.',
					},
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
		listSearch,
		resourceMapping,
	};

	async execute(
		this: IExecuteFunctions,
	): Promise<INodeExecutionData[][] | NodeExecutionWithMetadata[][] | null> {
		const authentication = this.getNodeParameter('authentication', 0) as McpAuthenticationOption;
		const serverTransport = this.getNodeParameter('serverTransport', 0) as McpServerTransport;
		const endpointUrl = this.getNodeParameter('endpointUrl', 0) as string;
		const node = this.getNode();
		const { headers } = await getAuthHeaders(this, authentication);
		const client = await connectMcpClient({
			serverTransport,
			endpointUrl,
			headers,
			name: node.type,
			version: node.typeVersion,
			onUnauthorized: async (headers) => await tryRefreshOAuth2Token(this, authentication, headers),
		});
		if (!client.ok) {
			throw mapToNodeOperationError(node, client.error);
		}

		const inputMode = this.getNodeParameter('inputMode', 0, 'manual') as 'manual' | 'json';
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const tool = this.getNodeParameter('tool.value', itemIndex) as string;
				const options = this.getNodeParameter('options', itemIndex);
				let parameters: IDataObject = {};
				if (inputMode === 'manual') {
					parameters = this.getNodeParameter('parameters.value', itemIndex) as IDataObject;
				} else {
					parameters = this.getNodeParameter('jsonInput', itemIndex) as IDataObject;
				}

				const result = (await client.result.callTool(
					{
						name: tool,
						arguments: parameters,
					},
					undefined,
					{
						timeout: options.timeout ? Number(options.timeout) : undefined,
					},
				)) as CallToolResult;

				let binaryIndex = 0;
				const binary: IBinaryKeyData = {};
				const content: IDataObject[] = [];
				const convertToBinary = options.convertToBinary ?? true;
				for (const contentItem of result.content) {
					if (contentItem.type === 'text') {
						content.push({
							...contentItem,
							text: jsonParse(contentItem.text, { fallbackValue: contentItem.text }),
						});
						continue;
					}

					if (convertToBinary && (contentItem.type === 'image' || contentItem.type === 'audio')) {
						binary[`data_${binaryIndex}`] = await this.helpers.prepareBinaryData(
							Buffer.from(contentItem.data, 'base64'),
							undefined,
							contentItem.mimeType,
						);
						binaryIndex++;
						continue;
					}

					content.push(contentItem as IDataObject);
				}

				returnData.push({
					json: {
						content: content.length > 0 ? content : undefined,
					},
					binary: Object.keys(binary).length > 0 ? binary : undefined,
					pairedItem: {
						item: itemIndex,
					},
				});
			} catch (e) {
				const errorMessage =
					e instanceof ZodError ? prettifyError(e) : e instanceof Error ? e.message : String(e);
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: {
								message: errorMessage,
								issues: e instanceof ZodError ? e.issues : undefined,
							},
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}

				throw new NodeOperationError(node, errorMessage, {
					itemIndex,
				});
			}
		}

		return [returnData];
	}
}
