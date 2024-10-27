import type { INodeProperties } from 'n8n-workflow';

export const pdfOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['pdf'],
			},
		},
		options: [
			// https://craftmypdf.com/docs/index.html#tag/PDF-Generation-API/operation/create
			{
				name: 'Create',
				value: 'create',
				description: 'Creates a PDF file with JSON data and your template',
				action: 'Create a PDF',
			},
		],
		default: 'create',
	},
];

export const pdfFields: INodeProperties[] = [
	// ----------------------------------
	// pdf:create
	// https://craftmypdf.com/docs/index.html#tag/PDF-Generation-API/operation/create
	// ----------------------------------
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['pdf'],
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
				resource: ['pdf'],
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
				resource: ['pdf'],
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
			'To generate a PDF using a specific version of the template. We use the latest template version unless you specify otherwise.',
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Export Type',
		name: 'export_type',
		type: 'options',
		default: 'json',
		description: 'Export type of the PDF',
		required: true,
		options: [
			{
				name: 'JSON',
				value: 'json',
				description:
					'Returns a JSON object, and the output PDF is stored on a CDN (until expiration)',
			},
			{
				name: 'File',
				value: 'file',
				description:
					'Returns binary data of the generated PDF (More secure and completely private) and the response HTTP header Content-Disposition is set to attachment',
			},
		],
		displayOptions: {
			show: {
				resource: ['pdf'],
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
		description: 'Expiration of the generated PDF in minutes',
		required: true,
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Output File',
		name: 'output_file',
		type: 'string',
		default: 'output.pdf',
		required: true,
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Password Protected',
		name: 'password_protected',
		type: 'boolean',
		default: false,
		description:
			'Whether to enable password protection (Available on professional subscription and above only)',
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		description:
			'Set a password to protect your PDF file (Available on professional subscription and above only)',
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['create'],
				password_protected: [true],
			},
		},
	},
	{
		displayName: 'Image Resample Resolution',
		name: 'image_resample_res',
		type: 'number',
		default: 600,
		description:
			'Optimize/downsample images of current PDF to a resolution(in DPI). This helps to reduce the PDF file size. Suggested values are 1200, 600, 300, 150 or 72.',
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Resize Images',
		name: 'resize_images',
		type: 'boolean',
		default: false,
		description:
			'Whether to resize all the images in the PDF to help reduce its size, especially if the template contains multiple or large images',
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Resize Max Width',
		name: 'resize_max_width',
		type: 'number',
		default: 1000,
		description: 'Specify the maximum width in pixels for the images',
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['create'],
				resize_images: [true],
			},
		},
	},
	{
		displayName: 'Resize Max Height',
		name: 'resize_max_height',
		type: 'number',
		default: 1000,
		description: 'Specify the maximum height in pixels for the images',
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['create'],
				resize_images: [true],
			},
		},
	},
	{
		displayName: 'Resize Format',
		name: 'resize_format',
		type: 'options',
		default: 'jpeg',
		description: 'Specify the format of the image',
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
				resource: ['pdf'],
				operation: ['create'],
				resize_images: [true],
			},
		},
	},
];
