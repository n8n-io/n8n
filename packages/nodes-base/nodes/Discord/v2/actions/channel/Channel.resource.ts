import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';
import * as deleteChannel from './deleteChannel.operation';

export { create, getAll, update, deleteChannel };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['channel'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'deleteChannel',
				description: 'Delete a channel',
				action: 'Delete a channel',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new channel',
				action: 'Create a new channel',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many the channels',
				action: 'Retrieve all the channels',
			},

			{
				name: 'Update',
				value: 'update',
				description: 'Update a channel',
				action: 'Update a channel',
			},
		],
		default: 'create',
	},
	...create.description,
	...deleteChannel.description,
	...getAll.description,
	...update.description,
];
