import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
	IExecuteFunctions,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import type { UpdateRecord } from '../../helpers/interfaces';
import {
	findMatches,
	processAirtableError,
	removeIgnored,
	mapFieldNamesToIds,
} from '../../helpers/utils';
import { apiRequestAllItems, batchUpdate, getFieldNamesAndIds } from '../../transport';
import { insertUpdateOptions, useFieldIdsOption } from '../common.descriptions';

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
	useFieldIdsOption,
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

	// Get field mapping once if useFieldIds is enabled
	let fieldMapping: Map<string, string> | undefined;
	const useFieldIds = this.getNodeParameter('useFieldIds', 0, false) as boolean;
	if (useFieldIds) {
		fieldMapping = await getFieldNamesAndIds.call(this, base, table);
	}

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

					let fieldsToUpdate = removeIgnored(fields, options.ignoreFields as string);
					if (useFieldIds && fieldMapping) {
						fieldsToUpdate = mapFieldNamesToIds(fieldsToUpdate, fieldMapping);
					}

					records.push({
						id: recordId,
						fields: fieldsToUpdate,
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
						let fields = removeIgnored(items[i].json, options.ignoreFields as string);
						if (useFieldIds && fieldMapping) {
							fields = mapFieldNamesToIds(fields, fieldMapping);
						}
						records.push({ id, fields });
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

					let fieldsToUpdate = fields;
					if (useFieldIds && fieldMapping) {
						fieldsToUpdate = mapFieldNamesToIds(fieldsToUpdate, fieldMapping);
					}

					records.push({ id: id as string, fields: fieldsToUpdate });
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
						let fieldsToUpdate = removeIgnored(fields, columnsToMatchOn);
						if (useFieldIds && fieldMapping) {
							fieldsToUpdate = mapFieldNamesToIds(fieldsToUpdate, fieldMapping);
						}
						records.push({ id, fields: fieldsToUpdate });
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
