import {
	TimeOffProperties,
} from '../../Interfaces';

export const timeOffAdjustTimeDescription: TimeOffProperties = [
	{
		displayName: 'Employee ID',
		name: 'employeeId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'adjustTime',
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
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'adjustTime',
				],
				resource: [
					'timeOff',
				],
			},
		},
		default: '',
		description: 'The ID of the time off type to add a balance adjustment for',
	},
	{
		displayName: 'Date',
		name: 'date',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'adjustTime',
				],
				resource: [
					'timeOff',
				],
			},
		},
		default: '',
		description: 'The date the adjustment should be added in history. Should be in ISO8601 date format (YYYY-MM-DD)',
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'adjustTime',
				],
				resource: [
					'timeOff',
				],
			},
		},
		default: '',
		description: 'The number of hours/days to adjust the balance by.',
	},
	{
		displayName: 'Note',
		name: 'note',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				operation: [
					'adjustTime',
				],
				resource: [
					'timeOff',
				],
			},
		},
		default: '',
		description: 'This is an optional note to show in history.',
	},
];
