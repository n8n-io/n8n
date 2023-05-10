import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { apiRequest, apiRequestAllItems, downloadRecordAttachments } from '../../transport';
import type { IRecord } from '../../helpers/interfaces';

const properties: INodeProperties[] = [
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
		displayName: 'Download Attachments',
		name: 'downloadAttachments',
		type: 'boolean',
		default: false,
		description: "Whether the attachment fields define in 'Download Fields' will be downloaded",
	},
	{
		displayName: 'Download Fields',
		name: 'downloadFieldNames',
		type: 'string',
		required: true,
		requiresDataPath: 'multiple',
		displayOptions: {
			show: {
				downloadAttachments: [true],
			},
		},
		default: '',
		description:
			"Name of the fields of type 'attachment' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive and cannot include spaces after a comma.",
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
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				requiresDataPath: 'single',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Field',
				},
				default: [],
				placeholder: 'Name',
				description:
					'Only data for fields whose names are in this list will be included in the records',
			},
			{
				displayName: 'Filter By Formula',
				name: 'filterByFormula',
				type: 'string',
				default: '',
				placeholder: "NOT({Name} = '')",
				description:
					'A formula used to filter records. The formula will be evaluated for each record, and if the result is not 0, false, "", NaN, [], or #Error! the record will be included in the response.',
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
								displayName: 'Field',
								name: 'field',
								type: 'string',
								default: '',
								description: 'Name of the field to sort on',
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
			{
				displayName: 'View',
				name: 'view',
				type: 'string',
				default: '',
				placeholder: 'All Stories',
				description:
					'The name or ID of a view in the Stories table. If set, only the records in that view will be returned. The records will be sorted according to the order of the view.',
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
	let returnData: INodeExecutionData[] = [];

	const body: IDataObject = {};
	const qs: IDataObject = {};

	const endpoint = `${base}/${table}`;

	try {
		const returnAll = this.getNodeParameter('returnAll', 0);
		const downloadAttachments = this.getNodeParameter('downloadAttachments', 0);
		const options = this.getNodeParameter('options', 0, {});

		for (const key of Object.keys(options)) {
			if (key === 'sort' && (options.sort as IDataObject).property !== undefined) {
				qs[key] = (options[key] as IDataObject).property;
			} else {
				qs[key] = options[key];
			}
		}

		let responseData;
		if (returnAll) {
			responseData = await apiRequestAllItems.call(this, 'GET', endpoint, body, qs);
		} else {
			qs.maxRecords = this.getNodeParameter('limit', 0);
			responseData = await apiRequest.call(this, 'GET', endpoint, body, qs);
		}

		returnData = responseData.records as INodeExecutionData[];

		if (downloadAttachments === true) {
			const downloadFieldNames = (this.getNodeParameter('downloadFieldNames', 0) as string).split(
				',',
			);
			const data = await downloadRecordAttachments.call(
				this,
				responseData.records as IRecord[],
				downloadFieldNames,
			);
			return data;
		}

		returnData = returnData.map((record) => {
			const { fields, ...rest } = record;
			return {
				json: {
					...rest,
					...(fields as IDataObject),
				},
			};
		});

		returnData = this.helpers.constructExecutionMetaData(returnData, {
			itemData: { item: 0 },
		});
	} catch (error) {
		if (this.continueOnFail()) {
			returnData.push({ json: { message: error.message, error } });
		} else {
			throw error;
		}
	}

	return returnData;
}
