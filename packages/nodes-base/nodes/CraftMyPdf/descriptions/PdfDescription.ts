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

			// https://craftmypdf.com/docs/index.html#tag/PDF-Generation-API/operation/create-async
			{
				name: 'Create Async',
				value: 'createAsync',
				description:
					'Creates a PDF file asynchronously with JSON data and your template. The API returns immediately and once the PDF document is generated, it will make a HTTP/HTTPS GET to your URL (will retry for 3 times before giving up).',
				action: 'Create a PDF asynchronously',
			},

			// https://craftmypdf.com/docs/index.html#tag/PDF-Manipulation-API/operation/merge-pdfs
			{
				name: 'Merge',
				value: 'merge',
				description: 'Merges multiple PDF URLs',
				action: 'Merge PDFs',
			},

			// https://craftmypdf.com/docs/index.html#tag/PDF-Manipulation-API/operation/add-watermark
			{
				name: 'Add Watermark',
				value: 'addWatermark',
				description: 'Add watermark to a PDF',
				action: 'Add Watermark',
			},
		],
		default: 'create',
	},
];

export const pdfFields: INodeProperties[] = [
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['create', 'createAsync'],
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
				operation: ['create', 'createAsync'],
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
				operation: ['create', 'createAsync'],
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
		displayName: 'Webhook URL',
		name: 'webhook_url',
		type: 'string',
		default: '',
		description:
			'Callback URL to your server. It starts with http:// or https:// and has to be urlencoded.',
		placeholder: 'https://myserver.com/pdfhandler',
		required: true,
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['createAsync'],
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
				operation: ['create', 'createAsync', 'merge', 'addWatermark'],
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
				operation: ['create', 'merge', 'addWatermark'],
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
				operation: ['create', 'createAsync'],
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
				operation: ['create', 'createAsync'],
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
				operation: ['create', 'createAsync'],
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
				operation: ['create', 'createAsync'],
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
				operation: ['create', 'createAsync'],
				resize_images: [true],
			},
		},
	},

	{
		displayName: 'URL Array',
		name: 'urls',
		type: 'collection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add URL',
		},
		default: { url: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['merge'],
			},
		},
		options: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'URL of a PDF to be merged',
			},
		],
	},

	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		description: 'URL of the source PDF',
		required: true,
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['addWatermark'],
			},
		},
	},
	{
		displayName: 'Watermark Text',
		name: 'text',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['addWatermark'],
			},
		},
	},
	{
		displayName: 'Font Size',
		name: 'font_size',
		type: 'number',
		default: 40,
		description: 'Font size of the watermark',
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['addWatermark'],
			},
		},
	},
	{
		displayName: 'Opacity',
		name: 'opacity',
		type: 'number',
		default: 0.5,
		description: 'Opacity of the watermark',
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['addWatermark'],
			},
		},
	},
	{
		displayName: 'Rotation',
		name: 'rotation',
		type: 'number',
		default: 45,
		description: 'Rotation of the watermark',
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['addWatermark'],
			},
		},
	},
	{
		displayName: 'Hex Color',
		name: 'hex_color',
		type: 'color',
		default: '#c7c7c7',
		description: 'Color of the watermark',
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['addWatermark'],
			},
		},
	},
	{
		displayName: 'Font Family',
		name: 'font_family',
		type: 'options',
		default: 'Helvetica',
		description: 'Font family of the watermark',
		options: [
			{ name: 'Courier', value: 'Courier' },
			{ name: 'Courier-Bold', value: 'Courier-Bold' },
			{ name: 'Courier-BoldOblique', value: 'Courier-BoldOblique' },
			{ name: 'Courier-Oblique', value: 'Courier-Oblique' },
			{ name: 'Helvetica', value: 'Helvetica' },
			{ name: 'Helvetica-Bold', value: 'Helvetica-Bold' },
			{ name: 'Helvetica-BoldOblique', value: 'Helvetica-BoldOblique' },
			{ name: 'Helvetica-Oblique', value: 'Helvetica-Oblique' },
			{ name: 'Symbol', value: 'Symbol' },
			{ name: 'Times-Bold', value: 'Times-Bold' },
			{ name: 'Times-BoldItalic', value: 'Times-BoldItalic' },
			{ name: 'Times-Italic', value: 'Times-Italic' },
			{ name: 'Times-Roman', value: 'Times-Roman' },
			{ name: 'ZapfDingbats', value: 'ZapfDingbats' },
		],
		displayOptions: {
			show: {
				resource: ['pdf'],
				operation: ['addWatermark'],
			},
		},
	},
];
