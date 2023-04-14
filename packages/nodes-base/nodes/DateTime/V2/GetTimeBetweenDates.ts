import type { INodeProperties } from 'n8n-workflow';

export const GetTimeBetweenDatesDescription: INodeProperties[] = [
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['getTimeBetweenDates'],
			},
		},
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['getTimeBetweenDates'],
			},
		},
	},
	{
		displayName: 'Units',
		name: 'units',
		type: 'multiOptions',
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: 'Day',
				value: 'day',
			},
			{
				name: 'Hour',
				value: 'hour',
			},
			{
				name: 'Millisecond',
				value: 'millisecond',
			},
			{
				name: 'Minute',
				value: 'minute',
			},
			{
				name: 'Month',
				value: 'month',
			},
			{
				name: 'Second',
				value: 'second',
			},
			{
				name: 'Week',
				value: 'week',
			},
			{
				name: 'Year',
				value: 'year',
			},
		],
		displayOptions: {
			show: {
				operation: ['getTimeBetweenDates'],
			},
		},
		default: ['day'],
	},
	{
		displayName: 'Output Field Name',
		name: 'outputFieldName',
		type: 'string',
		default: 'timeDifference',
		description: 'Name of the field to put the output in',
		displayOptions: {
			show: {
				operation: ['getTimeBetweenDates'],
			},
		},
	},
];
