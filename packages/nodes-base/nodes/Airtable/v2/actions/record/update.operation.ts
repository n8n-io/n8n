import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties, NodeApiError } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { apiRequest, apiRequestAllItems } from '../../transport';
import { findMatches, processAirtableError, removeIgnored } from '../../helpers/utils';
import type { UpdateBody, UpdateRecord } from '../../helpers/interfaces';
import { insertUpdateOptions } from '../common.descriptions';

const properties: INodeProperties[] = [
	// {
	// 	displayName: 'Data Mode',
	// 	name: 'dataMode',
	// 	type: 'options',
	// 	options: [
	// 		{
	// 			name: 'Auto-Map Input Data to Columns',
	// 			value: 'autoMapInputData',
	// 			description: 'Use when node input properties names exactly match the table column names',
	// 		},
	// 		{
	// 			name: 'Map Each Column Manually',
	// 			value: 'defineBelow',
	// 			description: 'Set the value for each destination column manually',
	// 		},
	// 	],
	// 	default: 'autoMapInputData',
	// 	description:
	// 		'Whether to map node input properties and the table data automatically or manually',
	// },
	// {
	// 	displayName: `
	// 	In this mode, make sure incoming data fields are named the same as the columns in your table. If needed, use a 'Set' node before this node to change the field names.
	// 	`,
	// 	name: 'notice',
	// 	type: 'notice',
	// 	default: '',
	// 	displayOptions: {
	// 		show: {
	// 			dataMode: ['autoMapInputData'],
	// 		},
	// 	},
	// },
	// {
	// 	// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased, n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
	// 	displayName: 'Column to Match On',
	// 	name: 'columnToMatchOn',
	// 	type: 'options',
	// 	required: true,
	// 	description:
	// 		'The column to compare when finding the rows to update. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	// 	typeOptions: {
	// 		loadOptionsMethod: 'getColumnsWithRecordId',
	// 		loadOptionsDependsOn: ['base.value', 'table.value'],
	// 	},
	// 	default: '',
	// 	hint: 'The column that identifies the row(s) to modify',
	// },
	// {
	// 	// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased-id
	// 	displayName:
	// 		'If posible use id for update, as updating by other fields require table data prefetching and can be slow.',
	// 	name: 'noticeNoIdUpdate',
	// 	type: 'notice',
	// 	default: '',
	// 	displayOptions: {
	// 		hide: {
	// 			columnToMatchOn: ['id'],
	// 		},
	// 	},
	// },
	// {
	// 	displayName: 'Value of Column to Match On',
	// 	name: 'valueToMatchOn',
	// 	type: 'string',
	// 	default: '',
	// 	description:
	// 		'Rows with a value in the specified "Column to Match On" that corresponds to the value in this field will be updated',
	// 	displayOptions: {
	// 		show: {
	// 			dataMode: ['defineBelow'],
	// 		},
	// 	},
	// },
	// {
	// 	displayName: 'Values to Send',
	// 	name: 'valuesToSend',
	// 	placeholder: 'Add Value',
	// 	type: 'fixedCollection',
	// 	typeOptions: {
	// 		multipleValueButtonText: 'Add Value',
	// 		multipleValues: true,
	// 	},
	// 	displayOptions: {
	// 		show: {
	// 			dataMode: ['defineBelow'],
	// 		},
	// 	},
	// 	default: {},
	// 	options: [
	// 		{
	// 			displayName: 'Values',
	// 			name: 'values',
	// 			values: [
	// 				{
	// 					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
	// 					displayName: 'Column',
	// 					name: 'column',
	// 					type: 'options',
	// 					description:
	// 						'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
	// 					typeOptions: {
	// 						loadOptionsMethod: 'getColumnsWithoutColumnToMatchOn',
	// 						loadOptionsDependsOn: ['base.value', 'table.value'],
	// 					},
	// 					default: [],
	// 				},
	// 				{
	// 					displayName: 'Value',
	// 					name: 'value',
	// 					type: 'string',
	// 					default: '',
	// 				},
	// 			],
	// 		},
	// 	],
	// },
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'resourceMapper',
		noDataExpression: true,
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		required: true,
		typeOptions: {
			loadOptionsDependsOn: ['table.value', 'base.value'],
			resourceMapper: {
				resourceMapperMethod: 'getColumnsWithRecordId',
				mode: 'update',
				fieldWords: {
					singular: 'column',
					plural: 'columns',
				},
				addAllFields: true,
				multiKeyMatch: false,
			},
		},
	},
	...insertUpdateOptions,
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

	const dataMode = this.getNodeParameter('columns.mappingMode', 0) as string;

	const columnToMatchOn = this.getNodeParameter('columns.matchingColumns', 0) as string[][0];

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
		let recordId = '';
		try {
			const records: UpdateRecord[] = [];
			const options = this.getNodeParameter('options', i, {});

			if (dataMode === 'autoMapInputData') {
				if (columnToMatchOn === 'id') {
					const { id, ...fields } = items[i].json;
					recordId = id as string;

					records.push({
						id: recordId,
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
				const valuesToSend =
					((this.getNodeParameter('valuesToSend', i, []) as IDataObject).values as IDataObject[]) ||
					[];

				const fields = valuesToSend.reduce((acc, { column, value }) => {
					acc[column as string] = value;
					return acc;
				}, {} as IDataObject);

				if (columnToMatchOn === 'id') {
					recordId = valueToMatchOn;
					records.push({ id: recordId, fields });
				} else {
					const matches = findMatches(
						tableData,
						columnToMatchOn,
						valueToMatchOn,
						options.updateAllMatches as boolean,
					);

					for (const match of matches) {
						const id = match.id as string;
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
			error = processAirtableError(error as NodeApiError, recordId);
			if (this.continueOnFail()) {
				returnData.push({ json: { message: error.message, error } });
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
