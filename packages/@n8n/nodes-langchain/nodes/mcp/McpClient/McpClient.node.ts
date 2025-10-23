import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeExecutionWithMetadata,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as listSearch from './listSearch';
import * as resourceMapping from './resourceMapping';
import { authenticationProperties, credentials, transportSelect } from '../shared/descriptions';

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
				placeholder: 'e.g. https://some.server.com/mcp',
				required: true,
				description: 'The URL of the MCP server to connect to',
			},
			...authenticationProperties,
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
						mode: 'add',
						fieldWords: {
							singular: 'parameter',
							plural: 'parameters',
						},
						addAllFields: true,
						multiKeyMatch: true,
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
		return [];
	}
}
