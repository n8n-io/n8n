import {
	INodeProperties,
} from 'n8n-workflow';

export const emojiOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'emoji',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'create',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const emojiFields = [
	{
		displayName: 'guildId',
		name: 'guildId',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'emoji',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'guildId',
		name: 'guildId',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'emoji',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'guildId',
		name: 'guildId',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'emoji',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'emojiId',
		name: 'emojiId',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'emoji',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'guildId',
		name: 'guildId',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'emoji',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'guildId',
		name: 'guildId',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'emoji',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'emojiId',
		name: 'emojiId',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'emoji',
				],
				operation: [
					'update',
				],
			},
		},
	},
] as INodeProperties[];