import type { INodeProperties } from 'n8n-workflow';

export const imageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['image'],
			},
		},
		options: [
			// https://craftmypdf.com/docs/index.html#tag/Image-Generation-API/operation/create-image
			{
				name: 'Create',
				value: 'create',
				description: 'Creates an image file with JSON data and your template',
				action: 'Create an image',
			},
		],
		default: 'create',
	},
];

export const imageFields: INodeProperties[] = [
	// ----------------------------------
	// image:create
	// https://craftmypdf.com/docs/index.html#tag/Image-Generation-API/operation/create-image
	// ----------------------------------
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'json',
		default: '{}',
		description: 'JSON data, it supports stringified JSON string or an JSON object',
		required: true,
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Load Data From',
		name: 'load_data_from',
		type: 'string',
		default: '',
		description:
			'Load data from an external URL. If this is specified, it will overwrite the `data` property.',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Version',
		name: 'version',
		type: 'string',
		default: '',
		description:
			'To generate an image using a specific version of the template. We use the latest template version unless you specify otherwise.',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Export Type',
		name: 'export_type',
		type: 'options',
		default: 'json',
		description: 'Export type of the image',
		required: true,
		options: [
			{
				name: 'JSON',
				value: 'json',
				description:
					'Returns a JSON object, and the output image is stored on a CDN (until expiration)',
			},
			{
				name: 'File',
				value: 'file',
				description:
					'Returns binary data of the generated image (More secure and completely private) and the response HTTP header Content-Disposition is set to attachment',
			},
		],
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Expiration',
		name: 'expiration',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 10080,
		},
		default: 5,
		description: 'Expiration of the generated image in minutes',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Output File',
		name: 'output_file',
		type: 'string',
		default: 'output.jpg',
		required: true,
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Output Type',
		name: 'output_type',
		type: 'options',
		default: 'jpeg',
		description: 'Image output file type',
		required: true,
		options: [
			{
				name: 'JPEG',
				value: 'jpeg',
			},
			{
				name: 'PNG',
				value: 'png',
			},
		],
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
		},
	},
];
