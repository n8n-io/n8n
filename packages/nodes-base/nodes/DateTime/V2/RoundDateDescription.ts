import type { INodeProperties } from 'n8n-workflow';

import { includeInputFields } from './common.descriptions';

export const RoundDateDescription: INodeProperties[] = [
	{
		displayName:
			"You can also do this using an expression, e.g. <code>{{ your_date.beginningOf('month') }}</code> or <code>{{ your_date.endOfMonth() }}</code>. <a target='_blank' href='https://docs.n8n.io/code/cookbook/luxon/'>More info</a>",
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['roundDate'],
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
				operation: ['roundDate'],
			},
		},
	},
	{
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		options: [
			{
				name: 'Round Down',
				value: 'roundDown',
			},
			{
				name: 'Round Up',
				value: 'roundUp',
			},
		],
		default: 'roundDown',
		displayOptions: {
			show: {
				operation: ['roundDate'],
			},
		},
	},
	{
		displayName: 'To Nearest',
		name: 'toNearest',
		type: 'options',
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: 'Year',
				value: 'year',
			},
			{
				name: 'Month',
				value: 'month',
			},
			{
				name: 'Week',
				value: 'week',
			},
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
				name: 'Second',
				value: 'second',
			},
		],
		default: 'month',
		displayOptions: {
			show: {
				operation: ['roundDate'],
				mode: ['roundDown'],
			},
		},
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'options',
		options: [
			{
				name: 'End of Month',
				value: 'month',
			},
		],
		default: 'month',
		displayOptions: {
			show: {
				operation: ['roundDate'],
				mode: ['roundUp'],
			},
		},
	},
	{
		displayName: 'Output Field Name',
		name: 'outputFieldName',
		type: 'string',
		default: 'roundedDate',
		description: 'Name of the field to put the output in',
		displayOptions: {
			show: {
				operation: ['roundDate'],
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
				operation: ['roundDate'],
			},
		},
		default: {},
		options: [includeInputFields],
	},
];
