import { INodeProperties } from 'n8n-workflow';

export const deviceDefinitionsOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['devicedefinitions'],
		},
	},
	options: [
		{
			name: 'Decode VIN',
			value: 'decodeVin',
			action: 'Decode vin',
		},
		{
			name: 'Search',
			value: 'search',
			action: 'Search',
		},
	],
	default: 'decodeVin',
};

export const deviceDefinitionsProperties: INodeProperties[] = [
	{
		displayName: 'Country Code',
		name: 'countryCode',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['devicedefinitions'],
				operation: ['decodeVin'],
			},
		},
		default: '',
		description: '3-letter ISO 3166-1 alpha-3 country code, e.g. USA',
		required: true,
	},
	{
		displayName: 'VIN',
		name: 'vin',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['devicedefinitions'],
				operation: ['decodeVin'],
			},
		},
		default: '',
		description: 'The Vehicle Identifier Number',
		required: true,
	},
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['devicedefinitions'],
				operation: ['search'],
			},
		},
		default: '',
		description: 'Your search query filter, e.g. Lexus gx 2023',
	},
	{
		displayName: 'Vehicle Make',
		name: 'makeSlug',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['devicedefinitions'],
				operation: ['search'],
			},
		},
		default: '',
		description: 'The make of the vehicle you are searching, e.g. Audi, Lexus, etc',
	},
	{
		displayName: 'Vehicle Model',
		name: 'modelSlug',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['devicedefinitions'],
				operation: ['search'],
			},
		},
		default: '',
		description: 'The model of the vehicle you are searching, e.g. Tacoma, Accord, etc',
	},
	{
		displayName: 'Vehicle Year',
		name: 'year',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['devicedefinitions'],
				operation: ['search'],
			},
		},
		default: '',
		description: 'The year of the vehicle you are searching, e.g. 2024',
	},
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['devicedefinitions'],
				operation: ['search'],
			},
		},
		default: '',
		description: 'Page number (for pagniation, defaults to the first page)',
	},
	{
		displayName: 'Page Size',
		name: 'pageSize',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['devicedefinitions'],
				operation: ['search'],
			},
		},
		default: '',
		description: 'Page size, (to specify the number of items to show on one page)',
	},
];

export const deviceDefinitionsDescription = {
	operations: deviceDefinitionsOperations,
	properties: deviceDefinitionsProperties,
};
