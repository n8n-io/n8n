import {
	INodeProperties,
} from 'n8n-workflow';

import {
	auditLogEvents,
} from './auditLogEvents';

import {
	capitalCase
} from 'change-case';

export const auditLogOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'auditLog',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
			},
		],
		default: 'get',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const auditLogFields = [
	// ----------------------------------
	//         auditLog: get
	// ----------------------------------
	{
		displayName: 'Guild ID',
		name: 'guildId',
		description: 'ID of the guild for which to retrieve the audit log.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'auditLog',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'auditLog',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'Action Type',
				name: 'actionType',
				description: 'Action type to filter the audit log by.',
				type: 'options',
				default: 10,
				options: auditLogEvents,
			},
			{
				displayName: 'Before',
				name: 'before',
				description: 'ID of the log entry to set as the last for the filter.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				description: 'ID of the user to filter the audit log by.',
				type: 'string',
				default: '',
			},
		],
	},
] as INodeProperties[];
