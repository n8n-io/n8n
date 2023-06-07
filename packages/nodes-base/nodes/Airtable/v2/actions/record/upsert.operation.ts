import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { apiRequest, apiRequestAllItems } from '../../transport';
import { removeIgnored } from '../../helpers/utils';
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

	const [columnToMatchOn, _rest] = this.getNodeParameter('columns.matchingColumns', 0) as string[];

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
					records.push({ fields: removeIgnored(items[i].json, options.ignoreFields as string) });
				}
			}

			if (dataMode === 'defineBelow') {
				const fields = this.getNodeParameter('columns.value', i, []) as IDataObject;

				if (columnToMatchOn === 'id') {
					const id = fields.id as string;
					delete fields.id;
					records.push({ id, fields });
				} else {
					records.push({ fields });
				}
			}

			const body: UpdateBody = {
				records,
				typecast: options.typecast ? true : false,
			};

			if (columnToMatchOn !== 'id') {
				body.performUpsert = { fieldsToMergeOn: [columnToMatchOn] };
			}

			let responseData;
			try {
				responseData = await apiRequest.call(this, 'PATCH', endpoint, body);
			} catch (error) {
				if (error.httpCode === '422' && columnToMatchOn === 'id') {
					const createBody = {
						...body,
						records: records.map(({ fields }) => ({ fields })),
					};
					responseData = await apiRequest.call(this, 'POST', endpoint, createBody);
				} else if (error?.description?.includes('Cannot update more than one record')) {
					const response = await apiRequestAllItems.call(
						this,
						'GET',
						endpoint,
						{},
						{
							fields: [columnToMatchOn],
							filterByFormula: `{${columnToMatchOn}} = '${records[0].fields[columnToMatchOn]}'`,
						},
					);
					const matches = response.records as UpdateRecord[];

					const updateRecords: UpdateRecord[] = [];

					if (options.updateAllMatches) {
						updateRecords.push(...matches.map(({ id }) => ({ id, fields: records[0].fields })));
					} else {
						updateRecords.push({ id: matches[0].id, fields: records[0].fields });
					}

					const batchSize = 10;
					const batches = Math.ceil(updateRecords.length / batchSize);
					const updatedRecords: IDataObject[] = [];

					for (let j = 0; j < batches; j++) {
						const batch = updateRecords.slice(j * batchSize, (j + 1) * batchSize);

						const updateBody = {
							...body,
							records: batch,
						};

						const updateResponse = await apiRequest.call(this, 'PATCH', endpoint, updateBody);
						updatedRecords.push(...((updateResponse.records as IDataObject[]) || []));
					}

					responseData = { records: updatedRecords };
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
			if (this.continueOnFail()) {
				returnData.push({ json: { message: error.message, error } });
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
