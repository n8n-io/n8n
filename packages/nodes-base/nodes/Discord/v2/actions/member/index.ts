import type { INodeProperties } from 'n8n-workflow';

import * as getAll from './getAll.operation';
import * as roleAdd from './roleAdd.operation';
import * as roleRemove from './roleRemove.operation';
import { guildRLC } from '../common.description';

export { getAll, roleAdd, roleRemove };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['member'],
				authentication: ['botToken', 'oAuth2'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve the members of a server',
				action: 'Get many members',
			},
			{
				name: 'Role Add',
				value: 'roleAdd',
				description: 'Add a role to a member',
				action: 'Add a role to a member',
			},
			{
				name: 'Role Remove',
				value: 'roleRemove',
				description: 'Remove a role from a member',
				action: 'Remove a role from a member',
			},
		],
		default: 'getAll',
	},
	{
		...guildRLC,
		displayOptions: {
			show: {
				resource: ['member'],
				authentication: ['botToken', 'oAuth2'],
			},
		},
	},
	...getAll.description,
	...roleAdd.description,
	...roleRemove.description,
];
