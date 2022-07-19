import {
	INodeProperties,
} from 'n8n-workflow';

export const imageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'image',
				],
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
				resource: [
					'image',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The template ID you want to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'image',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'string',
				default: '',
				description: 'Metadata that you need to store e.g. ID of a record in your DB',
			},
			{
				displayName: 'Wait for Image',
				name: 'waitForImage',
				type: 'boolean',
				default: false,
				description: 'Whether to wait for the image to be proccesed before returning. If after three tries the images is not ready, an error will be thrown. Number of tries can be increased by setting "Wait Max Tries".',
			},
			{
				displayName: 'Wait Max Tries',
				name: 'waitForImageMaxTries',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 10,
				},
				displayOptions: {
					show: {
						waitForImage: [
							true,
						],
					},
				},
				default: 3,
				description: 'How often it should check if the image is available before it fails',
			},
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'string',
				default: '',
				description: 'A URL to POST the Image object to upon rendering completed',
			},
		],
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
				resource: [
					'image',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Modification',
				name: 'modificationsValues',
				values: [
					{
						displayName: 'Name or ID',
						name: 'name',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getModificationNames',
							loadOptionsDependsOn: [
								'templateId',
							],
						},
						default: '',
						description: 'The name of the item you want to change. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						default: '',
						description: 'Replacement text you want to use',
					},
					{
						displayName: 'Color',
						name: 'color',
						type: 'color',
						default: '',
						description: 'Color hex of object',
					},
					{
						displayName: 'Background',
						name: 'background',
						type: 'color',
						default: '',
						description: 'Color hex of text background',
					},
					{
						displayName: 'Image URL',
						name: 'imageUrl',
						type: 'string',
						default: '',
						description: 'Replacement image URL you want to use (must be publicly viewable)',
					},
				],
			},
		],
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
				resource: [
					'image',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Unique identifier for the image',
	},
];
