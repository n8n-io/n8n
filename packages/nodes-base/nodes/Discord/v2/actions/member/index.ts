import type { INodeProperties } from 'n8n-workflow';

import * as ban from './ban.operation';
import * as getAll from './getAll.operation';
import * as kick from './kick.operation';
import * as roleAdd from './roleAdd.operation';
import * as roleRemove from './roleRemove.operation';
import * as timeout from './timeout.operation';
import * as unban from './unban.operation';
import { guildRLC } from '../common.description';

export { ban, getAll, kick, roleAdd, roleRemove, timeout, unban };

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
				name: 'Ban',
				value: 'ban',
				description: 'Ban a member from a server, optionally deleting their recent messages',
				action: 'Ban a member',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve the members of a server',
				action: 'Get many members',
			},
			{
				name: 'Kick',
				value: 'kick',
				description: 'Remove a member from a server',
				action: 'Kick a member',
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
			{
				name: 'Timeout',
				value: 'timeout',
				description: 'Temporarily prevent a member from interacting',
				action: 'Timeout a member',
			},
			{
				name: 'Unban',
				value: 'unban',
				description: 'Remove a ban from a member',
				action: 'Unban a member',
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
	...ban.description,
	...getAll.description,
	...kick.description,
	...roleAdd.description,
	...roleRemove.description,
	...timeout.description,
	...unban.description,
];
