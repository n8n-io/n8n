import type { INodeProperties } from 'n8n-workflow';

import * as cancel from './cancel.operation';
import * as create from './create.operation';
import * as get from './get.operation';
import * as getMany from './getMany.operation';
import * as reschedule from './reschedule.operation';

export { cancel, create, get, getMany, reschedule };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['booking'],
			},
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				description: 'Cancel a booking',
				action: 'Cancel a booking',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a booking',
				action: 'Create a booking',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a booking',
				action: 'Get a booking',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Retrieve many bookings',
				action: 'Get many bookings',
			},
			{
				name: 'Reschedule',
				value: 'reschedule',
				description: 'Move a booking to a new time',
				action: 'Reschedule a booking',
			},
		],
		default: 'create',
	},
	...cancel.description,
	...create.description,
	...get.description,
	...getMany.description,
	...reschedule.description,
];
