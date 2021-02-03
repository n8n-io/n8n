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
				name: 'Get Channel',
				value: 'getChannel',
				description: 'Get a channel by ID',
			},
		],
		default: 'getChannel',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const channelFields = [

	/* -------------------------------------------------------------------------- */
	/*                                channel:getChannel                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel ID',
		name: 'channelId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'channel',
				],
				operation: [
					'getChannel',
				],
			},
		},
	},
] as INodeProperties[];
