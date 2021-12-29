import {
	TabularDataProperties,
} from '../../Interfaces';

export const tabularDataUpdateDescription: TabularDataProperties = [
	{
		displayName: 'Employee ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'tabularData',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Table Name',
		name: 'table',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'tabularData',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'tabularData',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Location',
		name: 'location',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'tabularData',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Update Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'tabularData',
				],
			},
		},
		options: [
			{
				displayName: 'Date',
				name: 'date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Division',
				name: 'division',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Department',
				name: 'department',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Job Title',
				name: 'jobTitle',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Reports To',
				name: 'reportsTo',
				type: 'string',
				default: '',
			},
		],
	},
];
