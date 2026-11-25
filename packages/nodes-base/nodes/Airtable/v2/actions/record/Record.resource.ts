import type { INodeProperties } from 'n8n-workflow';
import { READ_ONLY_ANNOTATIONS } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteRecord from './deleteRecord.operation';
import * as get from './get.operation';
import * as search from './search.operation';
import * as update from './update.operation';
import * as upsert from './upsert.operation';
import { baseRLC, tableRLC } from '../common.descriptions';

export { create, deleteRecord, get, search, update, upsert };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Create',
				value: 'create',
				annotations: { effect: 'write', destructive: false, idempotent: false },
				description: 'Create a new record in a table',
				action: 'Create a record',
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				// A missing record ID falls back to creation on each run.
				annotations: { effect: 'write', destructive: true, idempotent: false },
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Create or update a record',
			},
			{
				name: 'Delete',
				value: 'deleteRecord',
				annotations: { effect: 'write', destructive: true, idempotent: false },
				description: 'Delete a record from a table',
				action: 'Delete a record',
			},
			{
				name: 'Get',
				value: 'get',
				annotations: READ_ONLY_ANNOTATIONS,
				description: 'Retrieve a record from a table',
				action: 'Get a record',
			},
			{
				name: 'Search',
				value: 'search',
				annotations: READ_ONLY_ANNOTATIONS,
				description: 'Search for specific records or list all',
				action: 'Search records',
			},
			{
				name: 'Update',
				value: 'update',
				// Updates can upload attachments from URLs again.
				annotations: { effect: 'write', destructive: true, idempotent: false },
				description: 'Update a record in a table',
				action: 'Update record',
			},
		],
		default: 'get',
		displayOptions: {
			show: {
				resource: ['record'],
			},
		},
	},
	{
		...baseRLC,
		displayOptions: {
			show: {
				resource: ['record'],
			},
		},
	},
	{
		...tableRLC,
		displayOptions: {
			show: {
				resource: ['record'],
			},
		},
	},
	...create.description,
	...deleteRecord.description,
	...get.description,
	...search.description,
	...update.description,
	...upsert.description,
];
