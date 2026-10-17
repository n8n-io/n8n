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
			{
				name: 'Create',
				value: 'create',
				description: 'Create an image',
				action: 'Create an image',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an image',
				action: 'Get an image',
			},
		],
		default: 'create',
	},
];

export const imageFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                image:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Template Name or ID',
		name: 'templateId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTemplates',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
		},
		description:
			'The template you want to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Modifications',
		name: 'modificationsUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Modification',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Modification',
				name: 'modificationsValues',
				values: [
					{
						displayName: 'Layer Name or ID',
						name: 'id',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getLayers',
							loadOptionsDependsOn: ['templateId'],
						},
						default: '',
						description:
							'The layer you want to change. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Background Color',
						name: 'backgroundColor',
						type: 'color',
						default: '',
						description: 'Fill color for a rectangle or circle layer',
					},
					{
						displayName: 'Barcode Data',
						name: 'barcodeData',
						type: 'string',
						default: '',
						description: 'Value encoded by a barcode layer',
					},
					{
						displayName: 'Color',
						name: 'color',
						type: 'color',
						default: '',
						description: 'Text color of the layer',
					},
					{
						displayName: 'Fill',
						name: 'fill',
						type: 'color',
						default: '',
						description: 'Fill color for an SVG shape layer',
					},
					{
						displayName: 'Font Family',
						name: 'fontFamily',
						type: 'string',
						default: '',
						description: 'Font family to render the text with',
					},
					{
						displayName: 'Hidden',
						name: 'hidden',
						type: 'options',
						options: [
							{
								name: 'Hide',
								value: 'true',
							},
							{
								name: 'Leave Unchanged',
								value: '',
							},
							{
								name: 'Show',
								value: 'false',
							},
						],
						default: '',
						description: 'Whether to show or hide this layer, or inherit from the template',
					},
					{
						displayName: 'Image URL',
						name: 'backgroundImage',
						type: 'string',
						default: '',
						description: 'Replacement image URL, which must be publicly reachable',
					},
					{
						displayName: 'Opacity',
						name: 'opacity',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 1,
							numberPrecision: 2,
						},
						default: 1,
						description: 'Layer opacity between 0 and 1. Left at 1, the template value is kept.',
					},
					{
						displayName: 'QR Target',
						name: 'qrTarget',
						type: 'string',
						default: '',
						description: 'URL a QR code layer points to',
					},
					{
						displayName: 'Rating Score',
						name: 'ratingScore',
						type: 'number',
						default: 0,
						description: 'Score shown by a rating layer. Left at 0, the template value is kept.',
					},
					{
						displayName: 'Stroke',
						name: 'stroke',
						type: 'color',
						default: '',
						description: 'Stroke color for an SVG shape layer',
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						default: '',
						description: 'Replacement text you want to use',
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'string',
				default: '',
				description: 'Value stored with the image, for example the ID of a record in your database',
			},
			{
				displayName: 'Output Formats',
				name: 'formats',
				type: 'multiOptions',
				options: [
					{
						name: 'AVIF',
						value: 'avif',
					},
					{
						name: 'JPG',
						value: 'jpg',
					},
					{
						name: 'PDF',
						value: 'pdf',
					},
					{
						name: 'PNG',
						value: 'png',
					},
					{
						name: 'WebP',
						value: 'webp',
					},
				],
				default: [],
				description: 'Formats to render. Defaults to JPG.',
			},
			{
				displayName: 'Quality',
				name: 'quality',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'Output quality between 1 and 100',
			},
			{
				displayName: 'Scale',
				name: 'scale',
				type: 'options',
				options: [
					{
						name: '1x',
						value: 1,
					},
					{
						name: '2x',
						value: 2,
					},
					{
						name: '3x',
						value: 3,
					},
					{
						name: '4x',
						value: 4,
					},
				],
				default: 1,
				description: 'Scale multiplier for a higher resolution render',
			},
			{
				displayName: 'Template Height',
				name: 'templateHeight',
				type: 'number',
				default: 0,
				description: 'Override the height, for responsive templates only',
			},
			{
				displayName: 'Template Width',
				name: 'templateWidth',
				type: 'number',
				default: 0,
				description: 'Override the width, for responsive templates only',
			},
		],
	},
	{
		displayName: 'Wait for Completion',
		name: 'waitForImage',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
		},
		default: true,
		description:
			'Whether to render synchronously and return the finished image. Turn this off to return a pending image immediately.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 image:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Image ID',
		name: 'imageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['get'],
			},
		},
		description: 'Unique identifier for the image',
	},
];
