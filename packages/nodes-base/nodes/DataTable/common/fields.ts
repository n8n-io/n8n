import type { INodeProperties } from 'n8n-workflow';

export const DATA_STORE_ID_FIELD = 'dataStoreId';

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
		loadOptionsDependsOn: [`${DATA_STORE_ID_FIELD}.value`],
		resourceMapper: {
			resourceMapperMethod: 'getDataStores',
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
