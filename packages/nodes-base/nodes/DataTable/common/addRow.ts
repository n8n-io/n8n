import {
	DATA_TABLE_SYSTEM_COLUMNS,
	type IDataObject,
	type IDisplayOptions,
	type IExecuteFunctions,
	type INodeProperties,
} from 'n8n-workflow';

import { DATA_TABLE_ID_FIELD } from './fields';
import { dataObjectToApiInput } from './utils';

export function makeAddRow(operation: string, displayOptions: IDisplayOptions) {
	return {
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
				valuesLabel: `Values to ${operation}`,
				resourceMapperMethod: 'getDataTables',
				mode: 'add',
				fieldWords: {
					singular: 'column',
					plural: 'columns',
				},
				addAllFields: true,
				multiKeyMatch: true,
				hideNoDataError: true,
			},
		},
		builderHint: {
			message:
				'columns must be a resourceMapper object with mappingMode and value, not a string or expression. Use mappingMode: "defineBelow" with value as a plain object of column-name to expression pairs. Do NOT use self-referential expressions (referencing this same node output in its input) — instead, read existing data in a prior node, compute new values, then write.',
		},
		displayOptions,
	} satisfies INodeProperties;
}

export function getAddRow(ctx: IExecuteFunctions, index: number) {
	const items = ctx.getInputData();
	const dataMode = ctx.getNodeParameter('columns.mappingMode', index) as string;

	let data: IDataObject;

	if (dataMode === 'autoMapInputData') {
		data = { ...items[index].json };
		// We automatically remove our system columns for better UX when feeding data table outputs
		// into another data table node
		for (const systemColumn of DATA_TABLE_SYSTEM_COLUMNS) {
			delete data[systemColumn];
		}
	} else {
		const fields = ctx.getNodeParameter('columns.value', index, {}) as IDataObject;

		data = fields;
	}

	return dataObjectToApiInput(data, ctx.getNode(), index);
}
