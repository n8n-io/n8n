import { RmmProperties } from '../../Interfaces';

export const rmmMuteDescription: RmmProperties = [
	{
		displayName: 'RMM Alert ID',
		name: 'alertId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rmm'],
				operation: ['mute'],
			},
		},
		default: '',
		description: 'Mute the RMM alert by ID',
	},
	{
		displayName: 'Mute Period',
		name: 'muteFor',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['rmm'],
				operation: ['mute'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: '1 Hour',
				value: '1-hour',
			},
			{
				name: '1 Day',
				value: '1-day',
			},
			{
				name: '2 Days',
				value: '2-days',
			},
			{
				name: '1 Week',
				value: '1-week',
			},
			{
				name: '2 Weeks',
				value: '2-weeks',
			},
			{
				name: '1 Month',
				value: '1-month',
			},
			{
				name: 'Forever',
				value: 'forever',
			},
		],
		default: '',
		description: 'Length of time to mute alert for',
	},
];
