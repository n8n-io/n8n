import {
	INodeProperties,
} from 'n8n-workflow';

export const inviteOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'invite',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
		],
		default: 'delete',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const inviteFields = [
	{
		displayName: 'Invite Code',
		name: 'inviteCode',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'invite',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'Invite Code',
		name: 'inviteCode',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'invite',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'With_counts',
		name: 'withCounts',
		description: 'Whether the invite should contain an approximate member count.',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: [
					'invite',
				],
				operation: [
					'get',
				],
			},
		},
	},
] as INodeProperties[];