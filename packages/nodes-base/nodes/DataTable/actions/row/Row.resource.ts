import type { INodeProperties } from 'n8n-workflow';

import * as deleteRows from './delete.operation';
import * as get from './get.operation';
import * as insert from './insert.operation';
import * as update from './update.operation';
import * as upsert from './upsert.operation';
import { DATA_TABLE_ID_FIELD } from '../../common/fields';

export { insert, get, deleteRows, update, upsert };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['row'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: deleteRows.FIELD,
				description: 'Delete row(s)',
				action: 'Delete row(s)',
			},
			{
				name: 'Get',
				value: get.FIELD,
				description: 'Get row(s)',
				action: 'Get row(s)',
			},
			{
				name: 'Insert',
				value: insert.FIELD,
				description: 'Insert a new row',
				action: 'Insert row',
			},
			{
				name: 'Update',
				value: update.FIELD,
				description: 'Update row(s) matching certain fields',
				action: 'Update row(s)',
			},
			{
				name: 'Upsert',
				value: upsert.FIELD,
				description: 'Update row(s), or insert if there is no match',
				action: 'Upsert row(s)',
			},
		],
		default: 'insert',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
		displayName: 'Data table',
		name: DATA_TABLE_ID_FIELD,
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
		displayOptions: { show: { resource: ['row'] } },
	},
	...deleteRows.description,
	...insert.description,
	...get.description,
	...update.description,
	...upsert.description,
];
