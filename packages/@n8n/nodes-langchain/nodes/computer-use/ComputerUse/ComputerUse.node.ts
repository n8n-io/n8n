import type {
	IBinaryKeyData,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { jsonParse, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import * as listSearch from './listSearch';
import * as resourceMapping from './resourceMapping';

export class ComputerUse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Computer Use',
		name: 'computerUse',
		icon: 'fa:desktop',
		group: ['transform'],
		version: 1,
		description:
			'Execute a specific tool on a connected device — browse the web, read and write files, and more. Requires the n8n CLI running on the target machine.',
		defaults: {
			name: 'Computer Use',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Recommended Tools'],
			},
			alias: ['Browser Use', 'Device Control', 'Computer Use', 'File System'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.computeruse/',
					},
				],
			},
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'deviceConnectionApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Tool',
				name: 'tool',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'The tool to execute on the connected device',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'getTools',
							searchable: true,
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
				description: 'Additional options',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Convert to Binary',
						name: 'convertToBinary',
						type: 'boolean',
						default: true,
						description:
							'Whether to convert images and audio to binary data. If false, they are returned as base64 strings.',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						typeOptions: { minValue: 1 },
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		if (!this.getGatewayTools || !this.callGatewayTool) {
			throw new NodeOperationError(this.getNode(), 'Computer Use requires gateway support');
		}
		const getGatewayTools = this.getGatewayTools.bind(this);
		const callGatewayTool = this.callGatewayTool.bind(this);

		const node = this.getNode();
		const credentials = await this.getCredentials('deviceConnectionApi');
		const deviceOwnerId = (credentials.deviceOwnerId as string) || undefined;
		const inputMode = this.getNodeParameter('inputMode', 0, 'manual') as 'manual' | 'json';
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const { tools } = await getGatewayTools(deviceOwnerId);

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const toolName = this.getNodeParameter('tool.value', itemIndex) as string;
				const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

				let parameters: IDataObject = {};
				if (inputMode === 'manual') {
					parameters = this.getNodeParameter('parameters.value', itemIndex, {}) as IDataObject;
				} else {
					parameters = this.getNodeParameter('jsonInput', itemIndex, {}) as IDataObject;
				}

				const tool = tools.find((t) => t.name === toolName);
				if (!tool) {
					throw new NodeOperationError(
						node,
						`Tool "${toolName}" not found on the connected device`,
						{ itemIndex },
					);
				}

				const result = await callGatewayTool(
					toolName,
					parameters as Record<string, unknown>,
					deviceOwnerId,
				);

				if (result.isError) {
					const errorText = result.content
						.filter((c) => c.type === 'text' && c.text)
						.map((c) => c.text)
						.join('\n');
					throw new NodeOperationError(node, errorText || 'Tool execution failed', {
						itemIndex,
					});
				}

				let binaryIndex = 0;
				const binary: IBinaryKeyData = {};
				const content: IDataObject[] = [];
				const convertToBinary = (options.convertToBinary as boolean) ?? true;

				for (const contentItem of result.content) {
					if (contentItem.type === 'text') {
						content.push({
							...contentItem,
							text: jsonParse(contentItem.text ?? '', { fallbackValue: contentItem.text }),
						});
						continue;
					}

					if (
						convertToBinary &&
						(contentItem.type === 'image' || contentItem.type === 'audio') &&
						contentItem.data
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
				if (result.structuredContent) {
					outputJson.structuredContent = { ...result.structuredContent };
				}
				if (content.length > 0) {
					outputJson.content = content;
				}

				returnData.push({
					json: outputJson,
					binary: Object.keys(binary).length > 0 ? binary : undefined,
					pairedItem: { item: itemIndex },
				});
			} catch (e) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: {
								message: e instanceof Error ? e.message : String(e),
							},
						},
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw e;
			}
		}

		return [returnData];
	}
}
