import {
	TabularDataProperties,
} from '../../Interfaces';

export const tabularDataCreateDescription: TabularDataProperties = [
	{
		displayName: 'Employee ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'tabularData',
				],
			},
		},
		default: '',
		description: 'Employee ID',
	},
	{
		displayName: 'Table Name',
		name: 'table',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'tabularData',
				],
			},
		},
		default: '',
		description: 'Name of the table',
	},
	{
		displayName: 'Location',
		name: 'location',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'tabularData',
				],
			},
		},
		default: '',
		description: 'Location',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'create',
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
				description: 'Date in format YYYY-MM-DD',
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
