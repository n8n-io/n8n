import type { INodeProperties } from 'n8n-workflow';

export const SubtractFromDateDescription: INodeProperties[] = [
	{
		displayName:
			"You can also do this using an expression, e.g. <code>{{your_date.minus(5, 'minutes')}}</code>. <a target='_blank' href='https://docs.n8n.io/code-examples/expressions/luxon/'>More info</a>",
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['subtractFromDate'],
			},
		},
	},
	{
		displayName: 'Date to Subtract From',
		name: 'magnitude',
		type: 'string',
		description: 'The date that you want to change',
		default: '',
		displayOptions: {
			show: {
				operation: ['subtractFromDate'],
			},
		},
		required: true,
	},
	{
		displayName: 'Time Unit to Subtract',
		name: 'timeUnit',
		description: 'Time unit for Duration parameter below',
		displayOptions: {
			show: {
				operation: ['subtractFromDate'],
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
		description: 'The number of time units to subtract from the date',
		default: 0,
		displayOptions: {
			show: {
				operation: ['subtractFromDate'],
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
				operation: ['subtractFromDate'],
			},
		},
	},
];
