import {
	INodeProperties,
} from 'n8n-workflow';

export const channelOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'channel',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'get',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const channelFields = [
	// ----------------------------------
	//         channel: get
	// ----------------------------------
	{
		displayName: 'Channel ID',
		name: 'channelId',
		description: 'ID of the channel to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'channel',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------
	//         channel: update
	// ----------------------------------
	{
		displayName: 'Channel ID',
		name: 'channelId',
		description: '', // TODO
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'channel',
				],
				operation: [
					'update',
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
					'channel',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Bitrate',
				name: 'bitrate',
				description: 'Bitrate of the channel, in bits. Voice channels only.',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Name',
				name: 'name',
				description: 'Name of the channel.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'NSFW',
				name: 'nsfw',
				description: 'Whether the channel is labeled \'Not safe for work\'.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Position',
				name: 'position',
				description: 'Position of the channel in the left-hand listing.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Rate Limit Per User',
				name: 'rate_limit_per_user',
				description: 'Seconds that a user must wait before sending another message.',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Topic',
				name: 'topic',
				description: 'Topic of the channel.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'User Limit',
				name: 'user_limit',
				description: 'User limit of the channel. Voice channels only.',
				type: 'number',
				default: 0,
			},
		],
	},
] as INodeProperties[];
