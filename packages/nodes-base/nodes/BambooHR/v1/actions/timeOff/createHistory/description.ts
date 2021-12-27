import {
	TimeOffProperties,
} from '../../Interfaces';

export const timeOffCreateHistoryDescription: TimeOffProperties = [
	{
		displayName: 'Employee ID',
		name: 'employeeId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'createHistory',
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
		displayName: 'Time Off Request ID',
		name: 'timeOffRequestId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'createHistory',
				],
				resource: [
					'timeOff',
				],
			},
		},
		default: '',
		description: 'The ID of the time off request',
	},
	{
		displayName: 'Date',
		name: 'date',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'createHistory',
				],
				resource: [
					'timeOff',
				],
			},
		},
		default: '',
		description: 'The date the request should be added in history. This will usually be the first date of the request. Should be in ISO8601 date format (YYYY-MM-DD)',
	},
	{
		displayName: 'Note',
		name: 'note',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				operation: [
					'createHistory',
				],
				resource: [
					'timeOff',
				],
			},
		},
		default: '',
		description: 'This is an optional note to show in history',
	},
];
