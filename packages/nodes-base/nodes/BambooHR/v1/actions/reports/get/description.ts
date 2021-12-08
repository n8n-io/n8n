import {
	ReportsProperties,
} from '../../Interfaces';

export const reportsGetDescription: ReportsProperties = [
	{
		displayName: 'Report ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'reports',
				],
			},
		},
		default: '',
		description: 'ID of the Report. You can get the report number by hovering over the report name on the reports page and grabbing the ID.',
	},
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
					'reports',
				],
			},
		},
		default: 'JSON',
		description: 'The output format for the report. Supported formats: CSV, PDF, XLS, XML, JSON',
	},
];
