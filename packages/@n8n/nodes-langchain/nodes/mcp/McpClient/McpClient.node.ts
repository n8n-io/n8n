import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol.js';
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
import {
	buildPromptArguments,
	getAllPrompts,
	getAllResourceTemplates,
	getAllResources,
	mapCapabilityError,
} from './utils';
import { credentials, transportSelect } from '../shared/descriptions';
import type { McpAuthenticationOption, McpServerTransport } from '../shared/types';
import {
	connectMcpClientForCredential,
	isStructuredContent,
	mapToNodeOperationError,
} from '../shared/utils';

type ReadResourceContents = Awaited<ReturnType<Client['readResource']>>['contents'];
type PromptMessages = Awaited<ReturnType<Client['getPrompt']>>['messages'];

async function convertResourceContents(
	ctx: IExecuteFunctions,
	contents: ReadResourceContents,
	convertToBinary: boolean,
): Promise<{ contents: IDataObject[]; binary: IBinaryKeyData }> {
	let binaryIndex = 0;
	const binary: IBinaryKeyData = {};
	const converted: IDataObject[] = [];

	for (const entry of contents) {
		if ('text' in entry) {
			converted.push({
				...entry,
				text: jsonParse(entry.text, { fallbackValue: entry.text }),
			});
			continue;
		}

		if (convertToBinary) {
			const binaryKey = `data_${binaryIndex}`;
			binary[binaryKey] = await ctx.helpers.prepareBinaryData(
				Buffer.from(entry.blob, 'base64'),
				undefined,
				entry.mimeType,
			);
			binaryIndex++;
			converted.push({ uri: entry.uri, mimeType: entry.mimeType, binaryKey });
			continue;
		}

		converted.push({ ...entry });
	}

	return { contents: converted, binary };
}

async function convertPromptMessages(
	ctx: IExecuteFunctions,
	messages: PromptMessages,
	convertToBinary: boolean,
): Promise<{ messages: IDataObject[]; binary: IBinaryKeyData }> {
	let binaryIndex = 0;
	const binary: IBinaryKeyData = {};
	const converted: IDataObject[] = [];

	const addBinary = async (data: string, mimeType: string | undefined): Promise<string> => {
		const binaryKey = `data_${binaryIndex}`;
		binary[binaryKey] = await ctx.helpers.prepareBinaryData(
			Buffer.from(data, 'base64'),
			undefined,
			mimeType,
		);
		binaryIndex++;
		return binaryKey;
	};

	for (const message of messages) {
		const content = message.content;

		if (content.type === 'text') {
			converted.push({ role: message.role, content: { ...content } });
			continue;
		}

		if (content.type === 'image' || content.type === 'audio') {
			if (convertToBinary) {
				const binaryKey = await addBinary(content.data, content.mimeType);
				converted.push({
					role: message.role,
					content: { type: content.type, mimeType: content.mimeType, binaryKey },
				});
			} else {
				converted.push({ role: message.role, content: { ...content } });
			}
			continue;
		}

		if (content.type === 'resource') {
			const resource = content.resource;
			if ('blob' in resource && convertToBinary) {
				const { blob: _blob, ...rest } = resource;
				const binaryKey = await addBinary(resource.blob, resource.mimeType);
				converted.push({
					role: message.role,
					content: { ...content, resource: { ...rest, binaryKey } },
				});
			} else {
				converted.push({ role: message.role, content: { ...content } });
			}
			continue;
		}

		converted.push({ role: message.role, content: { ...content } });
	}

	return { messages: converted, binary };
}

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
		version: [1, 1.1, 1.2],
		defaultVersion: 1.2,
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
				displayOptions: {
					show: {
						'@version': [{ _cnd: { lt: 1.2 } }],
					},
				},
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
				displayOptions: {
					show: {
						'@version': [{ _cnd: { lt: 1.2 } }],
					},
				},
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
						'@version': [{ _cnd: { lt: 1.2 } }],
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
						'@version': [{ _cnd: { lt: 1.2 } }],
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
				displayOptions: {
					show: {
						'@version': [{ _cnd: { lt: 1.2 } }],
					},
				},
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				required: true,
				default: 'executeTool',
				options: [
					{
						name: 'Execute Tool',
						value: 'executeTool',
						description: 'Execute a specific tool',
						action: 'Execute a tool',
					},
					{
						name: 'Get Prompt',
						value: 'getPrompt',
						description: 'Get a specific prompt',
						action: 'Get a prompt',
					},
					{
						name: 'List Prompts',
						value: 'listPrompts',
						description: 'List the available prompts',
						action: 'List prompts',
					},
					{
						name: 'List Resource Templates',
						value: 'listResourceTemplates',
						description: 'List the available resource templates',
						action: 'List resource templates',
					},
					{
						name: 'List Resources',
						value: 'listResources',
						description: 'List the available resources',
						action: 'List resources',
					},
					{
						name: 'Read Resource',
						value: 'readResource',
						description: 'Read a specific resource',
						action: 'Read a resource',
					},
				],
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.2 } }],
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
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.2 } }],
						operation: ['executeTool'],
					},
				},
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
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.2 } }],
						operation: ['executeTool'],
					},
				},
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
						'@version': [{ _cnd: { gte: 1.2 } }],
						operation: ['executeTool'],
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
						'@version': [{ _cnd: { gte: 1.2 } }],
						operation: ['executeTool'],
						inputMode: ['json'],
					},
				},
			},
			{
				displayName: 'Resource URI',
				name: 'resourceUri',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'The resource to read',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'getResources',
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
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.2 } }],
						operation: ['readResource'],
					},
				},
			},
			{
				displayName: 'Prompt Name',
				name: 'promptName',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'The prompt to get',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'getPrompts',
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
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.2 } }],
						operation: ['getPrompt'],
					},
				},
			},
			{
				displayName: 'Arguments',
				name: 'promptArguments',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Argument',
				options: [
					{
						name: 'arguments',
						displayName: 'Argument',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.2 } }],
						operation: ['getPrompt'],
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
						displayOptions: {
							show: {
								operation: ['executeTool', 'readResource', 'getPrompt'],
							},
						},
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 60000,
						description: 'Time in ms to wait for MCP requests to finish',
					},
				],
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
				},
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
		const client = await connectMcpClientForCredential(this, {
			authentication,
			serverTransport,
			endpointUrl,
			surface: 'MCP Client',
			signal: this.getExecutionCancelSignal(),
		});
		if (!client.ok) {
			throw mapToNodeOperationError(node, client.error);
		}

		try {
			const inputMode = this.getNodeParameter('inputMode', 0, 'manual') as 'manual' | 'json';
			const items = this.getInputData();
			const returnData: INodeExecutionData[] = [];
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					const operation =
						node.typeVersion >= 1.2
							? (this.getNodeParameter('operation', itemIndex) as string)
							: 'executeTool';
					const options = this.getNodeParameter('options', itemIndex) as IDataObject;
					const convertToBinary = Boolean(options.convertToBinary ?? true);
					const requestOptions: RequestOptions = {
						signal: this.getExecutionCancelSignal(),
						timeout: options.timeout ? Number(options.timeout) : undefined,
					};

					switch (operation) {
						case 'executeTool': {
							const tool = this.getNodeParameter('tool.value', itemIndex) as string;
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
									timeout: requestOptions.timeout,
								},
							)) as CallToolResult;

							if (node.typeVersion >= 1.1 && result.isError) {
								const textContent = result.content.find((item) => item.type === 'text');
								const errorMessage =
									textContent && 'text' in textContent
										? textContent.text
										: `Tool "${tool}" returned an error`;
								throw new NodeOperationError(node, errorMessage, { itemIndex });
							}

							let binaryIndex = 0;
							const binary: IBinaryKeyData = {};
							const content: IDataObject[] = [];
							for (const contentItem of result.content) {
								if (contentItem.type === 'text') {
									content.push({
										...contentItem,
										text: jsonParse(contentItem.text, { fallbackValue: contentItem.text }),
									});
									continue;
								}

								if (
									convertToBinary &&
									(contentItem.type === 'image' || contentItem.type === 'audio')
								) {
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

							const outputJson: IDataObject = {};
							if (isStructuredContent(result.structuredContent)) {
								outputJson.structuredContent = { ...result.structuredContent };
							}
							if (content.length > 0) {
								outputJson.content = content;
							}

							returnData.push({
								json: outputJson,
								binary: Object.keys(binary).length > 0 ? binary : undefined,
								pairedItem: {
									item: itemIndex,
								},
							});
							break;
						}
						case 'listResources': {
							const { items: resources, truncated } = await getAllResources(
								client.result,
								requestOptions,
							).catch((error: unknown) => {
								throw mapCapabilityError(node, itemIndex, 'resources', 'resources/list', error);
							});

							returnData.push({
								json: { resources, ...(truncated && { truncated: true }) },
								pairedItem: { item: itemIndex },
							});
							break;
						}
						case 'listResourceTemplates': {
							const { items: resourceTemplates, truncated } = await getAllResourceTemplates(
								client.result,
								requestOptions,
							).catch((error: unknown) => {
								throw mapCapabilityError(
									node,
									itemIndex,
									'resources',
									'resources/templates/list',
									error,
								);
							});

							returnData.push({
								json: { resourceTemplates, ...(truncated && { truncated: true }) },
								pairedItem: { item: itemIndex },
							});
							break;
						}
						case 'listPrompts': {
							const { items: prompts, truncated } = await getAllPrompts(
								client.result,
								requestOptions,
							).catch((error: unknown) => {
								throw mapCapabilityError(node, itemIndex, 'prompts', 'prompts/list', error);
							});

							returnData.push({
								json: { prompts, ...(truncated && { truncated: true }) },
								pairedItem: { item: itemIndex },
							});
							break;
						}
						case 'readResource': {
							const uri = this.getNodeParameter('resourceUri', itemIndex, '', {
								extractValue: true,
							}) as string;
							const result = await client.result
								.readResource({ uri }, requestOptions)
								.catch((error: unknown) => {
									throw mapCapabilityError(node, itemIndex, 'resources', 'resources/read', error);
								});
							const { contents, binary } = await convertResourceContents(
								this,
								result.contents,
								convertToBinary,
							);

							returnData.push({
								json: { uri, contents },
								binary: Object.keys(binary).length > 0 ? binary : undefined,
								pairedItem: { item: itemIndex },
							});
							break;
						}
						case 'getPrompt': {
							const name = this.getNodeParameter('promptName', itemIndex, '', {
								extractValue: true,
							}) as string;
							const args = buildPromptArguments(
								this.getNodeParameter('promptArguments', itemIndex, {}) as IDataObject,
								node,
								itemIndex,
							);
							const result = await client.result
								.getPrompt({ name, ...(args && { arguments: args }) }, requestOptions)
								.catch((error: unknown) => {
									throw mapCapabilityError(node, itemIndex, 'prompts', 'prompts/get', error);
								});
							const { messages, binary } = await convertPromptMessages(
								this,
								result.messages,
								convertToBinary,
							);

							const outputJson: IDataObject = {};
							if (result.description) {
								outputJson.description = result.description;
							}
							outputJson.messages = messages;

							returnData.push({
								json: outputJson,
								binary: Object.keys(binary).length > 0 ? binary : undefined,
								pairedItem: { item: itemIndex },
							});
							break;
						}
						default:
							throw new NodeOperationError(node, `Unsupported operation "${operation}"`, {
								itemIndex,
							});
					}
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

					// Keep the original error so a capability error keeps its description.
					if (e instanceof NodeOperationError) {
						throw e;
					}

					throw new NodeOperationError(node, errorMessage, {
						itemIndex,
					});
				}
			}

			return [returnData];
		} finally {
			await client.result.close();
		}
	}
}
