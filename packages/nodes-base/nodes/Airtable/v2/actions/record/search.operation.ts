import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';

import { generatePairedItemData, updateDisplayOptions } from '../../../../../utils/utilities';
import type { IRecord } from '../../helpers/interfaces';
import { legacyFlattenOutput } from '../../helpers/utils';
import { apiRequest, apiRequestAllItems, downloadRecordAttachments } from '../../transport';
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
		placeholder: 'Add option',
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
				displayName: 'Offset',
				name: 'offset',
				type: 'string',
				default: '',
				placeholder: 'e.g. itrLXPvNkVIEDMLos/rec0KcTCi7apBl8IV',
				description:
					'The pagination token to continue from, as returned in the "offset" field of a previous run\'s output. Used to fetch the next page of records when "Return All" is disabled.',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 2.3 } }],
					},
				},
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
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'The number of records returned in each API request (page)',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 2.3 } }],
					},
				},
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
							'Name of the field to sort on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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

			if (options.pageSize) {
				qs.pageSize = options.pageSize;
			}

			if (options.offset) {
				qs.offset = options.offset;
			}

			let responseData;

			if (returnAll) {
				responseData = await apiRequestAllItems.call(this, 'GET', endpoint, body, qs);
			} else {
				const limit = this.getNodeParameter('limit', i) as number;
				if (nodeVersion >= 2.3) {
					// Airtable omits the next-page offset once maxRecords is reached,
					// so cap the request via pageSize instead to keep manual pagination working
					qs.pageSize = Math.min(limit, (qs.pageSize as number) ?? 100);
				} else {
					qs.maxRecords = limit;
				}
				responseData = await apiRequest.call(this, 'GET', endpoint, body, qs);
			}

			// so the next page can be requested via the 'offset' option
			const pagination =
				nodeVersion >= 2.3 && responseData.offset ? { offset: responseData.offset } : {};

			if (options.downloadFields) {
				const itemWithAttachments = await downloadRecordAttachments.call(
					this,
					responseData.records as IRecord[],
					options.downloadFields as string[],
					fallbackPairedItems || [{ item: i }],
				);
				returnData.push(
					...itemWithAttachments.map((item) => ({
						...item,
						json: { ...legacyFlattenOutput(item.json, nodeVersion), ...pagination },
					})),
				);
				continue;
			}

			let records = responseData.records;

			records = (records as IDataObject[]).map((record) => ({
				json: { ...legacyFlattenOutput(record, nodeVersion), ...pagination },
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
