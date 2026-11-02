import type { INodeProperties } from 'n8n-workflow';

export const animationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['animation'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Render an animation from a template',
				action: 'Create an animation',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an animation',
				action: 'Get an animation',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many animations',
				action: 'Get many animations',
			},
		],
		default: 'create',
	},
];

export const animationFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                             animation:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Animation Template Name or ID',
		name: 'templateId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getAnimationTemplates',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['animation'],
				operation: ['create'],
			},
		},
		description:
			'The animation template to render. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Modifications',
		name: 'modificationsUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Modification',
		default: {},
		displayOptions: {
			show: {
				resource: ['animation'],
				operation: ['create'],
			},
		},
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
							loadOptionsMethod: 'getAnimationLayers',
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
						displayName: 'Color',
						name: 'color',
						type: 'color',
						default: '',
						description: 'Text color of the layer',
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
		displayName: 'Options',
		name: 'animationOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['animation'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Frame Rate',
				name: 'fps',
				type: 'options',
				options: [
					{
						name: '24 Fps',
						value: 24,
					},
					{
						name: '30 Fps',
						value: 30,
					},
					{
						name: '60 Fps',
						value: 60,
					},
				],
				default: 30,
				description: 'Override the frame rate of the template',
			},
			{
				displayName: 'Height',
				name: 'height',
				type: 'number',
				default: 1080,
				description: 'Override the height of the template, in pixels',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'string',
				default: '',
				description: 'Value stored with the animation, for example an order ID',
			},
			{
				displayName: 'Output Formats',
				name: 'formats',
				type: 'multiOptions',
				options: [
					{
						name: 'MOV',
						value: 'mov',
					},
					{
						name: 'MP4',
						value: 'mp4',
					},
				],
				default: [],
				description: 'Formats to render. Defaults to MP4, and is ignored when Transparent is on.',
			},
			{
				displayName: 'Transparent',
				name: 'transparent',
				type: 'boolean',
				default: false,
				description:
					'Whether to render on a transparent background. Forces a MOV output, since MP4 has no alpha channel.',
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				default: 1080,
				description: 'Override the width of the template, in pixels',
			},
		],
	},
	{
		displayName: 'Wait for Completion',
		name: 'waitForCompletion',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['animation'],
				operation: ['create'],
			},
		},
		description:
			'Whether to poll until the render finishes. Turn this off to return a queued animation immediately.',
	},
	{
		displayName: 'Max Tries',
		name: 'maxTries',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 300,
		},
		default: 30,
		displayOptions: {
			show: {
				resource: ['animation'],
				operation: ['create'],
				waitForCompletion: [true],
			},
		},
		description: 'How many times to check the render before giving up, at two seconds apart',
	},
	/* -------------------------------------------------------------------------- */
	/*                               animation:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Animation ID',
		name: 'animationId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['animation'],
				operation: ['get'],
			},
		},
		description: 'Unique identifier for the animation',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['animation'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		displayOptions: {
			show: {
				resource: ['animation'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
];

export const animationTemplateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['animationTemplate'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get an animation template',
				action: 'Get an animation template',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many animation templates',
				action: 'Get many animation templates',
			},
		],
		default: 'get',
	},
];

export const animationTemplateFields: INodeProperties[] = [
	{
		displayName: 'Animation Template ID',
		name: 'animationTemplateId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['animationTemplate'],
				operation: ['get'],
			},
		},
		description: 'Unique identifier for the animation template',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['animationTemplate'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		displayOptions: {
			show: {
				resource: ['animationTemplate'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
];
