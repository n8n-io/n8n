import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		description: 'ID of the record to update',
	},
	{
		displayName: 'Update All Fields',
		name: 'updateAllFields',
		type: 'boolean',
		default: true,
		description: 'Whether all fields should be sent to Airtable or only specific ones',
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Field',
		},
		requiresDataPath: 'single',
		displayOptions: {
			show: {
				updateAllFields: [false],
			},
		},
		default: [],
		placeholder: 'Name',
		required: true,
		description: 'The name of fields for which data should be sent to Airtable',
	},
];

const displayOptions = {
	show: {
		resource: ['record'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const base = this.getNodeParameter('base', 0, undefined, {
		extractValue: true,
	}) as string;

	const table = encodeURI(
		this.getNodeParameter('table', 0, undefined, {
			extractValue: true,
		}) as string,
	);

	const qs: IDataObject = {};

	const endpoint = `${base}/${table}`;

	let updateAllFields: boolean;
	let fields: string[];
	let options: IDataObject;

	const rows: IDataObject[] = [];
	let bulkSize = 10;

	for (let i = 0; i < items.length; i++) {
		try {
			updateAllFields = this.getNodeParameter('updateAllFields', i) as boolean;
			options = this.getNodeParameter('options', i, {});
			bulkSize = (options.bulkSize as number) || bulkSize;

			const row: IDataObject = {};
			row.fields = {} as IDataObject;

			if (updateAllFields) {
				// Update all the fields the item has
				row.fields = { ...items[i].json };
				// remove id field
				delete (row.fields as any).id;

				if (options.ignoreFields && options.ignoreFields !== '') {
					const ignoreFields = (options.ignoreFields as string)
						.split(',')
						.map((field) => field.trim())
						.filter((field) => !!field);
					if (ignoreFields.length) {
						// From: https://stackoverflow.com/questions/17781472/how-to-get-a-subset-of-a-javascript-objects-properties
						row.fields = Object.entries(items[i].json)
							.filter(([key]) => !ignoreFields.includes(key))
							.reduce((obj, [key, val]) => Object.assign(obj, { [key]: val }), {});
					}
				}
			} else {
				fields = this.getNodeParameter('fields', i, []) as string[];

				const rowFields: IDataObject = {};
				for (const fieldName of fields) {
					rowFields[fieldName] = items[i].json[fieldName];
				}

				row.fields = rowFields;
			}

			row.id = this.getNodeParameter('id', i) as string;

			rows.push(row);

			if (rows.length === bulkSize || i === items.length - 1) {
				// Make one request after another. This is slower but makes
				// sure that we do not run into the rate limit they have in
				// place and so block for 30 seconds. Later some global
				// functionality in core should make it easy to make requests
				// according to specific rules like not more than 5 requests
				// per seconds.

				const data = { records: rows, typecast: options.typecast ? true : false };

				const responseData = await apiRequest.call(this, 'PATCH', endpoint, data, qs);

				const executionData = this.helpers.constructExecutionMetaData(
					wrapData(responseData.records as IDataObject[]),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);

				// empty rows
				rows.length = 0;
			}
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { message: error.message, error } });
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
