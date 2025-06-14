import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
	NodeApiError,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import type { UpdateRecord } from '../../helpers/interfaces';
import { processAirtableError, removeIgnored, mapFieldNamesToIds } from '../../helpers/utils';
import { apiRequest, apiRequestAllItems, batchUpdate, getFieldNamesAndIds } from '../../transport';
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
		operation: ['upsert'],
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

	for (let i = 0; i < items.length; i++) {
		try {
			const records: UpdateRecord[] = [];
			const options = this.getNodeParameter('options', i, {});

			if (dataMode === 'autoMapInputData') {
				if (columnsToMatchOn.includes('id')) {
					const { id, ...fields } = items[i].json;
					let fieldsToUpsert = removeIgnored(fields, options.ignoreFields as string);
					if (useFieldIds && fieldMapping) {
						fieldsToUpsert = mapFieldNamesToIds(fieldsToUpsert, fieldMapping);
					}

					records.push({
						id: id as string,
						fields: fieldsToUpsert,
					});
				} else {
					let fieldsToUpsert = removeIgnored(items[i].json, options.ignoreFields as string);
					if (useFieldIds && fieldMapping) {
						fieldsToUpsert = mapFieldNamesToIds(fieldsToUpsert, fieldMapping);
					}
					records.push({ fields: fieldsToUpsert });
				}
			}

			if (dataMode === 'defineBelow') {
				const fieldsInput = this.getNodeParameter('columns.value', i, []) as IDataObject;
				let fields = { ...fieldsInput };

				if (columnsToMatchOn.includes('id')) {
					const id = fields.id as string;
					delete fields.id;
					if (useFieldIds && fieldMapping) {
						fields = mapFieldNamesToIds(fields, fieldMapping);
					}
					records.push({ id, fields });
				} else {
					if (useFieldIds && fieldMapping) {
						fields = mapFieldNamesToIds(fields, fieldMapping);
					}
					records.push({ fields });
				}
			}

			const body: IDataObject = {
				typecast: options.typecast ? true : false,
			};

			if (!columnsToMatchOn.includes('id')) {
				body.performUpsert = { fieldsToMergeOn: columnsToMatchOn };
			}

			let responseData;
			try {
				responseData = await batchUpdate.call(this, endpoint, body, records);
			} catch (error) {
				if (error.httpCode === '422' && columnsToMatchOn.includes('id')) {
					const createBody = {
						...body,
						records: records.map(({ fields }) => ({ fields })),
					};
					responseData = await apiRequest.call(this, 'POST', endpoint, createBody);
				} else if (error?.description?.includes('Cannot update more than one record')) {
					const conditions = columnsToMatchOn
						.map((column) => `{${column}} = '${records[0].fields[column]}'`)
						.join(',');
					const response = await apiRequestAllItems.call(
						this,
						'GET',
						endpoint,
						{},
						{
							fields: columnsToMatchOn,
							filterByFormula: `AND(${conditions})`,
						},
					);
					const matches = response.records as UpdateRecord[];

					const updateRecords: UpdateRecord[] = [];

					if (options.updateAllMatches) {
						updateRecords.push(...matches.map(({ id }) => ({ id, fields: records[0].fields })));
					} else {
						updateRecords.push({ id: matches[0].id, fields: records[0].fields });
					}

					responseData = await batchUpdate.call(this, endpoint, body, updateRecords);
				} else {
					throw error;
				}
			}

			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(responseData.records as IDataObject[]),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		} catch (error) {
			error = processAirtableError(error as NodeApiError, undefined, i);
			if (this.continueOnFail()) {
				returnData.push({ json: { message: error.message, error } });
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
