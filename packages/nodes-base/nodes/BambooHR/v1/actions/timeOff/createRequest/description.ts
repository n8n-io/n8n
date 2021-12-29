import {
	TimeOffProperties,
} from '../../Interfaces';

export const timeOffCreateRequestDescription: TimeOffProperties = [
	{
		displayName: 'Employee ID',
		name: 'employeeId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'createRequest',
				],
				resource: [
					'timeOff',
				],
			},
		},
		default: '',
		description: 'Employee ID',
	},
	{
		displayName: 'Time Off Type ID',
		name: 'timeOffTypeId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTimeOffTypeID',
		},
		required: true,
		displayOptions: {
			show: {
				operation: [
					'createRequest',
				],
				resource: [
					'timeOff',
				],
			},
		},
		default: '',
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
					'createRequest',
				],
				resource: [
					'timeOff',
				],
			},
		},
		default: 'approved',
	},
	{
		displayName: 'Start Date',
		name: 'start',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'createRequest',
				],
				resource: [
					'timeOff',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'End Date',
		name: 'end',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'createRequest',
				],
				resource: [
					'timeOff',
				],
			},
		},
		default: '',
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
					'createRequest',
				],
				resource: [
					'timeOff',
				],
			},
		},
		options: [
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: '',
				description: 'Number of days/hours',
			},
		],
	},
];
