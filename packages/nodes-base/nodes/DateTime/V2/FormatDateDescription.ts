import type { INodeProperties } from 'n8n-workflow';

import { includeInputFields } from './common.descriptions';

export const FormatDateDescription: INodeProperties[] = [
	{
		displayName:
			"You can also do this using an expression, e.g. <code>{{your_date.format('yyyy-MM-dd')}}</code>. <a target='_blank' href='https://docs.n8n.io/code/cookbook/luxon/'>More info</a>",
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['formatDate'],
			},
		},
	},
	{
		displayName: 'Date',
		name: 'date',
		type: 'string',
		description: 'The date that you want to format',
		default: '',
		displayOptions: {
			show: {
				operation: ['formatDate'],
			},
		},
	},
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['formatDate'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: 'Custom Format',
				value: 'custom',
			},
			{
				name: 'MM/DD/YYYY',
				value: 'MM/dd/yyyy',
				description: 'Example: 09/04/1986',
			},
			{
				name: 'YYYY/MM/DD',
				value: 'yyyy/MM/dd',
				description: 'Example: 1986/04/09',
			},
			{
				name: 'MMMM DD YYYY',
				value: 'MMMM dd yyyy',
				description: 'Example: April 09 1986',
			},
			{
				name: 'MM-DD-YYYY',
				value: 'MM-dd-yyyy',
				description: 'Example: 09-04-1986',
			},
			{
				name: 'YYYY-MM-DD',
				value: 'yyyy-MM-dd',
				description: 'Example: 1986-04-09',
			},
			{
				name: 'Unix Timestamp',
				value: 'X',
				description: 'Example: 1672531200',
			},
			{
				name: 'Unix Ms Timestamp',
				value: 'x',
				description: 'Example: 1674691200000',
			},
		],
		default: 'MM/dd/yyyy',
		description: 'The format to convert the date to',
	},
	{
		displayName: 'Custom Format',
		name: 'customFormat',
		type: 'string',
		displayOptions: {
			show: {
				format: ['custom'],
				operation: ['formatDate'],
			},
		},
		hint: 'List of special tokens <a target="_blank" href="https://moment.github.io/luxon/#/formatting?id=table-of-tokens">More info</a>',
		default: '',
		placeholder: 'yyyy-MM-dd',
	},
	{
		displayName: 'Output Field Name',
		name: 'outputFieldName',
		type: 'string',
		default: 'formattedDate',
		description: 'Name of the field to put the output in',
		displayOptions: {
			show: {
				operation: ['formatDate'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		displayOptions: {
			show: {
				operation: ['formatDate'],
			},
		},
		default: {},
		options: [
			includeInputFields,
			{
				displayName: 'From Date Format',
				name: 'fromFormat',
				type: 'string',
				default: 'e.g yyyyMMdd',
				hint: 'Tokens are case sensitive',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
				description:
					'Format in which the input \'Date\' is, it\'s helpful when the format is not recognized automatically. Use those <a href="https://moment.github.io/luxon/#/formatting?id=table-of-tokens&id=table-of-tokens" target="_blank">tokens</a> to define the format.',
			},
			{
				displayName: 'Use Workflow Timezone',
				name: 'timezone',
				type: 'boolean',
				default: false,
				description: "Whether to use the timezone of the input or the workflow's timezone",
			},
		],
	},
];
