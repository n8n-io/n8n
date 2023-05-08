import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'autoMapInputData',
				description: 'Use when node input properties names exactly match the table column names',
			},
			{
				name: 'Map Each Column Manually',
				value: 'defineBelow',
				description: 'Set the value for each destination column manually',
			},
		],
		default: 'autoMapInputData',
		description:
			'Whether to map node input properties and the table data automatically or manually',
	},
	{
		displayName: `
		In this mode, make sure incoming data fields are named the same as the columns in your table. If needed, use a 'Set' node before this node to change the field names.
		`,
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				dataMode: ['autoMapInputData'],
			},
		},
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased, n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Column to Match On',
		name: 'columnToMatchOn',
		type: 'options',
		required: true,
		description:
			'The column to compare when finding the rows to update. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getColumns',
			loadOptionsDependsOn: ['base.value', 'table.value'],
		},
		default: '',
		hint: 'The column that identifies the row(s) to modify',
	},
	{
		displayName: 'Value of Column to Match On',
		name: 'valueToMatchOn',
		type: 'string',
		default: '',
		description:
			'Rows with a value in the specified "Column to Match On" that corresponds to the value in this field will be updated',
		displayOptions: {
			show: {
				dataMode: ['defineBelow'],
			},
		},
	},
	{
		displayName: 'Values to Send',
		name: 'valuesToSend',
		placeholder: 'Add Value',
		type: 'fixedCollection',
		typeOptions: {
			multipleValueButtonText: 'Add Value',
			multipleValues: true,
		},
		displayOptions: {
			show: {
				dataMode: ['defineBelow'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
						displayName: 'Column',
						name: 'column',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getColumnsWithoutColumnToMatchOn',
							loadOptionsDependsOn: ['schema.value', 'table.value'],
						},
						default: [],
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
