import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';
import { generatePairedItemData, updateDisplayOptions } from '../../../../../utils/utilities';
import { apiRequest, apiRequestAllItems, downloadRecordAttachments } from '../../transport';
import type { IRecord } from '../../helpers/interfaces';
import { flattenOutput } from '../../helpers/utils';
import { viewRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Filter By Formula',
		name: 'filterByFormula',
		type: 'string',
		default: '',
		placeholder: "e.g. NOT({Name} = 'Admin')",
		hint: 'If empty, all the records will be returned',
		description:
			'The formula will be evaluated for each record, and if the result is not 0, false, "", NaN, [], or #Error! the record will be included in the response. <a href="https://support.airtable.com/docs/formula-field-reference" target="_blank">More info</a>.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: true,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		description: 'Additional options which decide which records should be returned',
		placeholder: 'Add Option',
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Download Attachments',
				name: 'downloadFields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getAttachmentColumns',
					loadOptionsDependsOn: ['base.value', 'table.value'],
				},
				default: [],
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
				description: "The fields of type 'attachment' that should be downloaded",
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Output Fields',
				name: 'fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getColumns',
					loadOptionsDependsOn: ['base.value', 'table.value'],
				},
				default: [],
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
				description: 'The fields you want to include in the output',
			},
			viewRLC,
		],
	},
	{
		displayName: 'Sort',
		name: 'sort',
		placeholder: 'Add Sort Rule',
		description: 'Defines how the returned records should be ordered',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		options: [
			{
				name: 'property',
				displayName: 'Property',
				values: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
						displayName: 'Field',
						name: 'field',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getColumns',
							loadOptionsDependsOn: ['base.value', 'table.value'],
						},
						default: '',
						description:
							'Name of the field to sort on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Direction',
						name: 'direction',
						type: 'options',
						options: [
							{
								name: 'ASC',
								value: 'asc',
								description: 'Sort in ascending order (small -> large)',
							},
							{
								name: 'DESC',
								value: 'desc',
								description: 'Sort in descending order (large -> small)',
							},
						],
						default: 'asc',
						description: 'The sort direction',
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['record'],
		operation: ['search'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	base: string,
	table: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const nodeVersion = this.getNode().typeVersion;

	const endpoint = `${base}/${table}`;

	let itemsLength = items.length ? 1 : 0;
	let fallbackPairedItems;

	if (nodeVersion >= 2.1) {
		itemsLength = items.length;
	} else {
		fallbackPairedItems = generatePairedItemData(items.length);
	}

	for (let i = 0; i < itemsLength; i++) {
		try {
			const returnAll = this.getNodeParameter('returnAll', i);
			const options = this.getNodeParameter('options', i, {});
			const sort = this.getNodeParameter('sort', i, {}) as IDataObject;
			const filterByFormula = this.getNodeParameter('filterByFormula', i) as string;

			const body: IDataObject = {};
			const qs: IDataObject = {};

			if (filterByFormula) {
				qs.filterByFormula = filterByFormula;
			}

			if (options.fields) {
				if (typeof options.fields === 'string') {
					qs.fields = options.fields.split(',').map((field) => field.trim());
				} else {
					qs.fields = options.fields as string[];
				}
			}

			if (sort.property) {
				qs.sort = sort.property;
			}

			if (options.view) {
				qs.view = (options.view as IDataObject).value as string;
			}

			let responseData;

			if (returnAll) {
				responseData = await apiRequestAllItems.call(this, 'GET', endpoint, body, qs);
			} else {
				qs.maxRecords = this.getNodeParameter('limit', i);
				responseData = await apiRequest.call(this, 'GET', endpoint, body, qs);
			}

			if (options.downloadFields) {
				const itemWithAttachments = await downloadRecordAttachments.call(
					this,
					responseData.records as IRecord[],
					options.downloadFields as string[],
					fallbackPairedItems || [{ item: i }],
				);
				returnData.push(...itemWithAttachments);
				continue;
			}

			let records = responseData.records;

			records = (records as IDataObject[]).map((record) => ({
				json: flattenOutput(record),
			})) as INodeExecutionData[];

			const itemData = fallbackPairedItems || [{ item: i }];

			const executionData = this.helpers.constructExecutionMetaData(records, {
				itemData,
			});

			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { message: error.message, error }, pairedItem: { item: i } });
				continue;
			} else {
				throw error;
			}
		}
	}

	return returnData;
}
