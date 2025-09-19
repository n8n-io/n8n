import type { INodeProperties } from 'n8n-workflow';

import { includeInputFields } from './common.descriptions';

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
		// eslint-disable-next-line n8n-nodes-base/node-param-multi-options-type-unsorted-items
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
			{
				name: 'Millisecond',
				value: 'millisecond',
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
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		displayOptions: {
			show: {
				operation: ['getTimeBetweenDates'],
			},
		},
		default: {},
		options: [
			includeInputFields,
			{
				displayName: 'Output as ISO String',
				name: 'isoString',
				type: 'boolean',
				default: false,
				description: 'Whether to output the date as ISO string or not',
			},
		],
	},
];
