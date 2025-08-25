import type { INodeProperties } from 'n8n-workflow';

export const DATA_TABLE_ID_FIELD = 'dataTableId';

export const COLUMNS: INodeProperties = {
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
};
