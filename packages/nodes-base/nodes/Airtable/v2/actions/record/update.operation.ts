import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { apiRequest, apiRequestAllItems } from '../../transport';
import { findMatches, removeIgnored } from '../../helpers/utils';
import type { UpdateBody, UpdateRecord } from '../../helpers/interfaces';

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
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased-id
		displayName:
			'If posible id for update, as updating by other fields require table data prefetching and can be slow.',
		name: 'noticeNoIdUpdate',
		type: 'notice',
		default: '',
		displayOptions: {
			hide: {
				columnToMatchOn: ['id'],
			},
		},
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
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Typecast',
				name: 'typecast',
				type: 'boolean',
				default: false,
				description:
					'Whether the Airtable API should attempt mapping of string values for linked records & select options',
			},
			{
				displayName: 'Ignore Fields',
				name: 'ignoreFields',
				type: 'string',
				requiresDataPath: 'multiple',
				displayOptions: {
					show: {
						'/dataMode': ['autoMapInputData'],
					},
				},
				default: '',
				description: 'Comma-separated list of fields to ignore when updating',
			},
			{
				displayName: 'Update All Matches',
				name: 'updateAllMatches',
				type: 'boolean',
				default: false,
				description:
					'Whether to update all rows that match the "Column to Match On" or just the first one',
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
	base: string,
	table: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const endpoint = `${base}/${table}`;

	const dataMode = this.getNodeParameter('dataMode', 0) as string;
	const columnToMatchOn = this.getNodeParameter('columnToMatchOn', 0) as string;

	let tableData: UpdateRecord[] = [];
	if (columnToMatchOn !== 'id') {
		const response = await apiRequestAllItems.call(
			this,
			'GET',
			endpoint,
			{},
			{ fields: [columnToMatchOn] },
		);
		tableData = response.records as UpdateRecord[];
	}

	for (let i = 0; i < items.length; i++) {
		try {
			const records: UpdateRecord[] = [];
			const options = this.getNodeParameter('options', i, {});

			if (dataMode === 'autoMapInputData') {
				if (columnToMatchOn === 'id') {
					const { id, ...fields } = items[i].json;

					records.push({
						id: id as string,
						fields: removeIgnored(fields, options.ignoreFields as string),
					});
				} else {
					const columnToMatchOnValue = items[i].json[columnToMatchOn] as string;

					const matches = findMatches(
						tableData,
						columnToMatchOn,
						columnToMatchOnValue,
						options.updateAllMatches as boolean,
					);

					for (const match of matches) {
						const id = match.id as string;
						const fields = items[i].json;
						records.push({ id, fields: removeIgnored(fields, options.ignoreFields as string) });
					}
				}
			}

			if (dataMode === 'defineBelow') {
				const valueToMatchOn = this.getNodeParameter('valueToMatchOn', i) as string;
				const valuesToSend = (this.getNodeParameter('valuesToSend', i, []) as IDataObject)
					.values as IDataObject[];

				const fields = valuesToSend.reduce((acc, { column, value }) => {
					acc[column as string] = value;
					return acc;
				}, {} as IDataObject);

				let id: string;

				if (columnToMatchOn === 'id') {
					id = valueToMatchOn;
					records.push({ id, fields });
				} else {
					const matches = findMatches(
						tableData,
						columnToMatchOn,
						valueToMatchOn,
						options.updateAllMatches as boolean,
					);

					for (const match of matches) {
						id = match.id as string;
						records.push({ id, fields });
					}
				}
			}

			const body: UpdateBody = { records, typecast: options.typecast ? true : false };

			const responseData = await apiRequest.call(this, 'PATCH', endpoint, body);

			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(responseData.records as IDataObject[]),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
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
