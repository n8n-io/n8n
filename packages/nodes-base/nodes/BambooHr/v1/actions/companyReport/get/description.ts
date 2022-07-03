import { INodeProperties } from 'n8n-workflow';

export const companyReportGetDescription: INodeProperties[] = [
	{
		displayName: 'Report ID',
		name: 'reportId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'companyReport',
				],
			},
		},
		default: '',
		description: 'ID of the report. You can get the report number by hovering over the report name on the reports page and grabbing the ID.',
	},
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		options: [
			{
				name: 'CSV',
				value: 'CSV',
			},
			{
				name: 'JSON',
				value: 'JSON',
			},
			{
				name: 'PDF',
				value: 'PDF',
			},
			{
				name: 'XLS',
				value: 'XLS',
			},
			{
				name: 'XML',
				value: 'XML',
			},
		],
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'companyReport',
				],
			},
		},
		default: 'JSON',
		description: 'The output format for the report',
	},
	{
		displayName: 'Put Output In Field',
		name: 'output',
		type: 'string',
		default: 'data',
		required: true,
		description: 'The name of the output field to put the binary file data in',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'companyReport',
				],
			},
			hide: {
				format: [
					'JSON',
				],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'companyReport',
				],
			},
		},
		options: [
			{
				displayName: 'Duplicate Field Filtering',
				name: 'fd',
				type: 'boolean',
				default: true,
				description: 'Whether to apply the standard duplicate field filtering or not',
			},
		],
	},
];
