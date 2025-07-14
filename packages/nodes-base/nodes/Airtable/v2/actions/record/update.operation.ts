import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
	IExecuteFunctions,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import type { UpdateRecord } from '../../helpers/interfaces';
import { findMatches, processAirtableError, removeIgnored } from '../../helpers/utils';
import { apiRequestAllItems, batchUpdate } from '../../transport';
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
				multiKeyMatch: true,
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

	const columnsToMatchOn = this.getNodeParameter('columns.matchingColumns', 0) as string[];

	let tableData: UpdateRecord[] = [];
	if (!columnsToMatchOn.includes('id')) {
		const response = await apiRequestAllItems.call(
			this,
			'GET',
			endpoint,
			{},
			{ fields: columnsToMatchOn },
		);
		tableData = response.records as UpdateRecord[];
	}

	for (let i = 0; i < items.length; i++) {
		let recordId = '';
		try {
			const records: UpdateRecord[] = [];
			const options = this.getNodeParameter('options', i, {});
			const typecast = options.typecast ? true : false;

			if (dataMode === 'autoMapInputData') {
				if (columnsToMatchOn.includes('id')) {
					const { id, ...fields } = items[i].json;
					recordId = id as string;

					records.push({
						id: recordId,
						fields: removeIgnored(fields, options.ignoreFields as string),
					});
				} else {
					const matches = findMatches(
						tableData,
						columnsToMatchOn,
						items[i].json,
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
				const getNodeParameterOptions = typecast ? { skipValidation: true } : undefined;
				if (columnsToMatchOn.includes('id')) {
					const { id, ...fields } = this.getNodeParameter(
						'columns.value',
						i,
						[],
						getNodeParameterOptions,
					) as IDataObject;
					records.push({ id: id as string, fields });
				} else {
					const fields = this.getNodeParameter(
						'columns.value',
						i,
						[],
						getNodeParameterOptions,
					) as IDataObject;

					const matches = findMatches(
						tableData,
						columnsToMatchOn,
						fields,
						options.updateAllMatches as boolean,
					);

					for (const match of matches) {
						const id = match.id as string;
						records.push({ id, fields: removeIgnored(fields, columnsToMatchOn) });
					}
				}
			}

			const body: IDataObject = { typecast };

			const responseData = await batchUpdate.call(this, endpoint, body, records);

			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(responseData.records as IDataObject[]),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		} catch (error) {
			error = processAirtableError(error as NodeApiError, recordId, i);
			if (this.continueOnFail()) {
				returnData.push({ json: { message: error.message, error } });
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
