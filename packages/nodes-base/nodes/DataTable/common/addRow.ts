import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { DATA_TABLE_ID_FIELD } from './fields';
import { dataObjectToApiInput } from './utils';

export const ADD_ROW = {
	displayName: 'Columns',
	name: 'columns',
	type: 'resourceMapper',
	default: {
		mappingMode: 'defineBelow',
		value: null,
	},
	noDataExpression: true,
	required: true,
	typeOptions: {
		loadOptionsDependsOn: [`${DATA_TABLE_ID_FIELD}.value`],
		resourceMapper: {
			valuesLabel: 'Columns to Update',
			resourceMapperMethod: 'getDataTables',
			mode: 'add',
			fieldWords: {
				singular: 'column',
				plural: 'columns',
			},
			addAllFields: true,
			multiKeyMatch: true,
		},
	},
} satisfies INodeProperties;

export function getAddRow(ctx: IExecuteFunctions, index: number) {
	const items = ctx.getInputData();
	const dataMode = ctx.getNodeParameter('columns.mappingMode', index) as string;

	let data: IDataObject;

	if (dataMode === 'autoMapInputData') {
		data = items[index].json;
	} else {
		const fields = ctx.getNodeParameter('columns.value', index, {}) as IDataObject;

		data = fields;
	}

	return dataObjectToApiInput(data, ctx.getNode(), index);
}
