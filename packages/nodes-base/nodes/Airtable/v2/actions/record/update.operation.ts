import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties, NodeApiError } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { apiRequest, apiRequestAllItems } from '../../transport';
import { findMatches, processAirtableError, removeIgnored } from '../../helpers/utils';
import type { UpdateBody, UpdateRecord } from '../../helpers/interfaces';
import { insertUpdateOptions } from '../common.descriptions';

const properties: INodeProperties[] = [
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

	const [columnToMatchOn, _rest] = this.getNodeParameter('columns.matchingColumns', 0) as string[];

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
				if (columnToMatchOn === 'id') {
					const { id, ...fields } = this.getNodeParameter('columns.value', i, []) as IDataObject;
					records.push({ id: id as string, fields });
				} else {
					const fields = this.getNodeParameter('columns.value', i, []) as IDataObject;

					const valueToMatchOn = fields[columnToMatchOn] as string;
					delete fields[columnToMatchOn];

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
