import type { INodeProperties } from 'n8n-workflow';

export const ExtractDateDescription: INodeProperties[] = [
	{
		displayName:
			'You can also do this using an expression, e.g. <code>{{ your_date.extract("month") }}}</code>. <a target="_blank" href="https://docs.n8n.io/code-examples/expressions/luxon/">More info</a>',
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['extractDate'],
			},
		},
	},
	{
		displayName: 'Date',
		name: 'date',
		type: 'string',
		description: 'The date that you want to round',
		default: '',
		displayOptions: {
			show: {
				operation: ['extractDate'],
			},
		},
	},
	{
		displayName: 'Part',
		name: 'part',
		type: 'options',
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
		default: 'month',
		displayOptions: {
			show: {
				operation: ['extractDate'],
			},
		},
	},
	{
		displayName: 'Output Field Name',
		name: 'outputFieldName',
		type: 'string',
		default: 'datePart',
		description: 'Name of the field to put the output in',
		displayOptions: {
			show: {
				operation: ['extractDate'],
			},
		},
	},
];
