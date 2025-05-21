import type { INodeProperties } from 'n8n-workflow';

export const tableRLC: INodeProperties = {
	displayName: 'Table',
	name: 'tableId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'tableSearch',
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
		},
	],
};

export const columnsRMC: INodeProperties = {
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
		loadOptionsDependsOn: ['tableId.value'],
		resourceMapper: {
			resourceMapperMethod: 'getColumns',
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
