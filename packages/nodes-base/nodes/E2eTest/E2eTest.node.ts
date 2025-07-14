import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeListSearchResult,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	type ResourceMapperFields,
} from 'n8n-workflow';

import { remoteOptions, resourceMapperFields, returnData, searchOptions } from './mock';

export class E2eTest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'E2E Test',
		name: 'e2eTest',
		icon: 'fa:play',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Dummy node used for e2e testing',
		defaults: {
			name: 'E2E Test',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Remote Options',
						value: 'remoteOptions',
					},
					{
						name: 'Resource Locator',
						value: 'resourceLocator',
					},
					{
						name: 'Resource Mapping Component',
						value: 'resourceMapper',
					},
				],
				default: 'remoteOptions',
			},
			{
				displayName: 'Field ID',
				name: 'fieldId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Remote Options Name or ID',
				name: 'remoteOptions',
				description:
					'Remote options to load. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['fieldId'],
					loadOptionsMethod: 'getOptions',
				},
				required: true,
				default: [],
				displayOptions: {
					show: {
						operation: ['remoteOptions'],
					},
				},
			},
			{
				displayName: 'Resource Locator',
				name: 'rlc',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				displayOptions: {
					show: {
						operation: ['resourceLocator'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'optionsSearch',
							searchable: true,
						},
					},
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						placeholder: 'https://example.com/user/a4071e98-7d40-41fb-8911-ce3e7bf94fb2',
						validation: [
							{
								type: 'regex',
								properties: {
									regex:
										'https://example.com/user/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
									errorMessage: 'Not a valid example URL',
								},
							},
						],
						extractValue: {
							type: 'regex',
							regex:
								'https://example.com/user/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})',
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
									errorMessage: 'Not a valid UUI',
								},
							},
						],
						placeholder: 'a4071e98-7d40-41fb-8911-ce3e7bf94fb2',
					},
				],
			},
			{
				displayName: 'Resource Mapping Component',
				name: 'resourceMapper',
				type: 'resourceMapper',
				noDataExpression: true,
				default: {
					mappingMode: 'defineBelow',
					value: null,
				},
				required: true,
				typeOptions: {
					loadOptionsDependsOn: ['fieldId'],
					resourceMapper: {
						resourceMapperMethod: 'getMappingColumns',
						mode: 'upsert',
						fieldWords: {
							singular: 'column',
							plural: 'columns',
						},
						addAllFields: true,
						multiKeyMatch: false,
					},
				},
				displayOptions: {
					show: {
						operation: ['resourceMapper'],
					},
				},
			},
			{
				displayName: 'Other Non Important Field',
				name: 'otherField',
				type: 'string',
				default: '',
			},
		],
	};

	methods = {
		loadOptions: {
			async getOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return remoteOptions;
			},
		},
		listSearch: {
			async optionsSearch(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const pageSize = 5;
				let results = searchOptions;
				if (filter) {
					results = results.filter((option) => option.name.includes(filter));
				}

				const offset = paginationToken ? parseInt(paginationToken, 10) : 0;
				results = results.slice(offset, offset + pageSize);

				return {
					results,
					paginationToken: offset + pageSize,
				};
			},
		},
		resourceMapping: {
			async getMappingColumns(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
				return resourceMapperFields;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const operation = this.getNodeParameter('operation', 0);
		// For resource mapper testing, return actual node values
		if (operation === 'resourceMapper') {
			const rmValue = this.getNodeParameter('resourceMapper.value', 0);
			if (rmValue) {
				return [[{ json: rmValue as INodeExecutionData }]];
			}
		}
		return [returnData];
	}
}
