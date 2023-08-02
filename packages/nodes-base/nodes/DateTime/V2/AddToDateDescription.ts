import type { INodeProperties } from 'n8n-workflow';

export const AddToDateDescription: INodeProperties[] = [
	{
		displayName:
			"You can also do this using an expression, e.g. <code>{{your_date.plus(5, 'minutes')}}</code>. <a target='_blank' href='https://docs.n8n.io/code-examples/expressions/luxon/'>More info</a>",
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['addToDate'],
			},
		},
	},
	{
		displayName: 'Date to Add To',
		name: 'magnitude',
		type: 'string',
		description: 'The date that you want to change',
		default: '',
		displayOptions: {
			show: {
				operation: ['addToDate'],
			},
		},
		required: true,
	},
	{
		displayName: 'Time Unit to Add',
		name: 'timeUnit',
		description: 'Time unit for Duration parameter below',
		displayOptions: {
			show: {
				operation: ['addToDate'],
			},
		},
		type: 'options',
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: 'Years',
				value: 'years',
			},
			{
				name: 'Quarters',
				value: 'quarters',
			},
			{
				name: 'Months',
				value: 'months',
			},
			{
				name: 'Weeks',
				value: 'weeks',
			},
			{
				name: 'Days',
				value: 'days',
			},
			{
				name: 'Hours',
				value: 'hours',
			},
			{
				name: 'Minutes',
				value: 'minutes',
			},
			{
				name: 'Seconds',
				value: 'seconds',
			},
			{
				name: 'Milliseconds',
				value: 'milliseconds',
			},
		],
		default: 'days',
		required: true,
	},
	{
		displayName: 'Duration',
		name: 'duration',
		type: 'number',
		description: 'The number of time units to add to the date',
		default: 0,
		displayOptions: {
			show: {
				operation: ['addToDate'],
			},
		},
	},
	{
		displayName: 'Output Field Name',
		name: 'outputFieldName',
		type: 'string',
		default: 'newDate',
		description: 'Name of the field to put the output in',
		displayOptions: {
			show: {
				operation: ['addToDate'],
			},
		},
	},
];
