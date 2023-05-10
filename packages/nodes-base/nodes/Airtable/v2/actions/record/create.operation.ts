import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Add All Fields',
		name: 'addAllFields',
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
				addAllFields: [false],
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
		operation: ['create'],
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

	const body: IDataObject = {};
	const qs: IDataObject = {};

	const endpoint = `${base}/${table}`;

	let addAllFields: boolean;
	let fields: string[];
	let options: IDataObject;

	const rows: IDataObject[] = [];
	let bulkSize = 10;

	for (let i = 0; i < items.length; i++) {
		try {
			addAllFields = this.getNodeParameter('addAllFields', i) as boolean;
			options = this.getNodeParameter('options', i, {});
			bulkSize = (options.bulkSize as number) || bulkSize;

			const row: IDataObject = {};

			if (addAllFields) {
				// Add all the fields the item has
				row.fields = { ...items[i].json };
				delete (row.fields as any).id;
			} else {
				// Add only the specified fields
				const rowFields: IDataObject = {};

				fields = this.getNodeParameter('fields', i, []) as string[];

				for (const fieldName of fields) {
					rowFields[fieldName] = items[i].json[fieldName];
				}

				row.fields = rowFields;
			}

			rows.push(row);

			if (rows.length === bulkSize || i === items.length - 1) {
				if (options.typecast === true) {
					body.typecast = true;
				}

				body.records = rows;

				const responseData = await apiRequest.call(this, 'POST', endpoint, body, qs);
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
				returnData.push({ json: { error: error.message } });
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
