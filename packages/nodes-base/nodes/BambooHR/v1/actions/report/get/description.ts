import {
	ReportProperties,
} from '../../Interfaces';

export const reportGetDescription: ReportProperties = [
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		options: [
			{
				name: 'JSON',
				value: 'JSON',
			},
			{
				name: 'CSV',
				value: 'CSV',
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
					'report',
				],
			},
		},
		default: 'JSON',
		description: 'The output format for the report',
	},
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
					'report',
				],
			},
		},
		default: '',
		description: 'ID of the report. You can get the report number by hovering over the report name on the reports page and grabbing the ID.',
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
					'report',
				],
			},
			hide: {
				format: [
					'JSON',
				],
			},
		},
	},
];
