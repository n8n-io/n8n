import type { INodeProperties } from 'n8n-workflow';

import * as clear from './clear.operation';
import * as create from './create.operation';
import * as deleteTable from './delete.operation';
import * as list from './list.operation';
import * as update from './update.operation';
import { DATA_TABLE_RESOURCE_LOCATOR_BASE } from '../../common/fields';

export { clear, create, deleteTable, list, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['table'],
			},
		},
		options: [
			{
				name: 'Clear',
				value: clear.FIELD,
				description: 'Clear all rows from a data table',
				action: 'Clear a data table',
			},
			{
				name: 'Create',
				value: create.FIELD,
				description: 'Create a new data table',
				action: 'Create a data table',
			},
			{
				name: 'Delete',
				value: deleteTable.FIELD,
				description: 'Delete a data table',
				action: 'Delete a data table',
			},
			{
				name: 'List',
				value: list.FIELD,
				description: 'List all data tables',
				action: 'List data tables',
			},
			{
				name: 'Rename',
				value: update.FIELD,
				description: 'Rename a data table',
				action: 'Rename a data table',
			},
		],
		default: 'list',
	},
	{
		...DATA_TABLE_RESOURCE_LOCATOR_BASE,
		displayOptions: {
			show: {
				resource: ['table'],
				operation: [clear.FIELD, deleteTable.FIELD, update.FIELD],
			},
		},
	},
	...clear.description,
	...create.description,
	...deleteTable.description,
	...list.description,
	...update.description,
];
