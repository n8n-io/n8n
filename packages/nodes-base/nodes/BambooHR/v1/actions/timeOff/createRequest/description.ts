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
		description: 'The time off type IDs in a given company can be looked up using the Metadata API',
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
		description: 'The possible status values are: "approved", "denied" (or "declined"), "requested"',
	},
	{
		displayName: 'Start Date',
		name: 'start',
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
		description: 'The date of the history item should be in the form YYYY-MM-DD',
	},
	{
		displayName: 'End Date',
		name: 'end',
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
		description: 'The date of the history item should be in the form YYYY-MM-DD',
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
