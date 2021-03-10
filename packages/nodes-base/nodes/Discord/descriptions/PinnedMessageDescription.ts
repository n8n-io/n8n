import {
	INodeProperties,
} from 'n8n-workflow';

export const pinnedMessageOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'pinnedMessage',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
		],
		default: 'getAll',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const pinnedMessageFields = [
	{
		displayName: 'channelId',
		name: 'channelId',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'pinnedMessage',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'channelId',
		name: 'channelId',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'pinnedMessage',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'messageId',
		name: 'messageId',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'pinnedMessage',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'channelId',
		name: 'channelId',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'pinnedMessage',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'messageId',
		name: 'messageId',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'pinnedMessage',
				],
				operation: [
					'delete',
				],
			},
		},
	},
] as INodeProperties[];