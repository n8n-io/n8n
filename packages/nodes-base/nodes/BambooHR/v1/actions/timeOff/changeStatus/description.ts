import {
	TimeOffProperties,
} from '../../Interfaces';

export const timeOffChangeStatusDescription: TimeOffProperties = [
	{
		displayName: 'Request ID',
		name: 'requestId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'changeStatus',
				],
				resource: [
					'timeOff',
				],
			},
		},
		default: '',
		description: 'Request ID',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Approved',
				value: 'approved',
			},
			{
				name: 'Denied',
				value: 'denied',
			},
			{
				name: 'Requested',
				value: 'requested',
			},
		],
		displayOptions: {
			show: {
				operation: [
					'changeStatus',
				],
				resource: [
					'timeOff',
				],
			},
		},
		default: 'approved',
		description: 'Request Status. Choose one of: approved, cancelled, denied',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'changeStatus',
				],
				resource: [
					'timeOff',
				],
			},
		},
		options: [
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
				description: 'A note to attach to the change in status',
			},
		],
	},
];
