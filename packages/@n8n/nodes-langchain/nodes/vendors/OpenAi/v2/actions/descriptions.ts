import type { INodeProperties, INodePropertyCollection } from 'n8n-workflow';

export const modelRLC = (searchListMethod: string = 'modelSearch'): INodeProperties => ({
	displayName: 'Model',
	name: 'modelId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod,
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. gpt-4',
		},
	],
});

export const metadataProperty: INodeProperties = {
	displayName: 'Metadata',
	name: 'metadata',
	type: 'json',
	description:
		'Set of 16 key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format, and querying for objects via API or the dashboard. Keys are strings with a maximum length of 64 characters. Values are strings with a maximum length of 512 characters.',
	default: '{}',
};

const imageMessageProperties: INodeProperties[] = [
	{
		displayName: 'Image Type',
		name: 'imageType',
		type: 'options',
		default: 'url',
		options: [
			{ name: 'Image URL', value: 'url' },
			{ name: 'File ID', value: 'fileId' },
			{ name: 'File Data', value: 'base64' },
		],
		displayOptions: {
			show: {
				type: ['image'],
			},
		},
	},
	{
		displayName: 'Image URL',
		name: 'imageUrl',
		type: 'string',
		default: '',
		placeholder: 'e.g. https://example.com/image.jpeg',
		description: 'URL of the image to be sent',
		displayOptions: {
			show: {
				type: ['image'],
				imageType: ['url'],
			},
		},
	},
	{
		displayName: 'Image Data',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		placeholder: 'e.g. data',
		hint: 'The name of the input field containing the binary file data to be processed',
		description: 'Name of the binary property which contains the image(s)',
		displayOptions: {
			show: {
				type: ['image'],
				imageType: ['base64'],
			},
		},
	},
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		default: '',
		description: 'ID of the file to be sent',
		displayOptions: {
			show: {
				type: ['image'],
				imageType: ['fileId'],
			},
		},
	},
	{
		displayName: 'Detail',
		name: 'imageDetail',
		type: 'options',
		default: 'auto',
		description: 'The detail level of the image to be sent to the model',
		options: [
			{ name: 'Auto', value: 'auto' },
			{ name: 'Low', value: 'low' },
			{ name: 'High', value: 'high' },
		],
		displayOptions: {
			show: {
				type: ['image'],
			},
		},
	},
];

export const textMessageProperties: INodeProperties[] = [
	{
		displayName: 'Prompt',
		name: 'content',
		type: 'string',
		description: 'The content of the message to be send',
		default: '',
		placeholder: 'e.g. Hello, how can you help me?',
		typeOptions: {
			rows: 2,
		},
		displayOptions: {
			show: {
				type: ['text'],
			},
		},
	},
];

const fileMessageProperties: INodeProperties[] = [
	{
		displayName: 'File Type',
		name: 'fileType',
		type: 'options',
		default: 'url',
		options: [
			{ name: 'File URL', value: 'url' },
			{ name: 'File ID', value: 'fileId' },
			{ name: 'File Data', value: 'base64' },
		],
		displayOptions: {
			show: {
				type: ['file'],
			},
		},
	},
	{
		displayName: 'File URL',
		name: 'fileUrl',
		type: 'string',
		default: '',
		placeholder: 'e.g. https://example.com/file.pdf',
		description: 'URL of the file to be sent. Accepts base64 encoded files as well.',
		displayOptions: {
			show: {
				type: ['file'],
				fileType: ['url'],
			},
		},
	},
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		default: '',
		description: 'ID of the file to be sent',
		displayOptions: {
			show: {
				type: ['file'],
				fileType: ['fileId'],
			},
		},
	},
	{
		displayName: 'File Data',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		placeholder: 'e.g. data',
		hint: 'The name of the input field containing the binary file data to be processed',
		description: 'Name of the binary property which contains the file',
		displayOptions: {
			show: {
				type: ['file'],
				fileType: ['base64'],
			},
		},
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				type: ['file'],
				fileType: ['base64'],
			},
		},
	},
];

export const messageOptions: INodePropertyCollection[] = [
	{
		displayName: 'Message',
		name: 'values',
		values: [
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: 'text',
				options: [
					{ name: 'Text', value: 'text' },
					{ name: 'Image', value: 'image' },
					{ name: 'File', value: 'file' },
				],
			},
			{
				displayName: 'Role',
				name: 'role',
				type: 'options',
				description:
					"Role in shaping the model's response, it tells the model how it should behave and interact with the user",
				options: [
					{
						name: 'User',
						value: 'user',
						description: 'Send a message as a user and get a response from the model',
					},
					{
						name: 'Assistant',
						value: 'assistant',
						description: 'Tell the model to adopt a specific tone or personality',
					},
					{
						name: 'System',
						value: 'system',
						description:
							"Usually used to set the model's behavior or context for the next user message",
					},
				],
				default: 'user',
			},
			...textMessageProperties,
			...imageMessageProperties,
			...fileMessageProperties,
		],
	},
];

export const imageGenerateOptions: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	placeholder: 'Add Option',
	type: 'collection',
	default: {},
	displayOptions: {
		show: {
			'@version': [{ _cnd: { lt: 2.2 } }],
		},
	},
	options: [
		{
			displayName: 'Number of Images',
			name: 'n',
			default: 1,
			description: 'Number of images to generate',
			type: 'number',
			typeOptions: {
				minValue: 1,
				maxValue: 10,
			},
			displayOptions: {
				show: {
					'/model': ['dall-e-2'],
				},
			},
		},
		{
			displayName: 'Quality',
			name: 'dalleQuality',
			type: 'options',
			description:
				'The quality of the image that will be generated, HD creates images with finer details and greater consistency across the image',
			options: [
				{
					name: 'HD',
					value: 'hd',
				},
				{
					name: 'Standard',
					value: 'standard',
				},
			],
			displayOptions: {
				show: {
					'/model': ['dall-e-3'],
				},
			},
			default: 'standard',
		},
		{
			displayName: 'Quality',
			name: 'quality',
			type: 'options',
			description:
				'The quality of the image that will be generated, High creates images with finer details and greater consistency across the image',
			options: [
				{
					name: 'High',
					value: 'high',
				},
				{
					name: 'Medium',
					value: 'medium',
				},
				{
					name: 'Low',
					value: 'low',
				},
			],
			displayOptions: {
				show: {
					'/model': [{ _cnd: { includes: 'gpt-image' } }],
				},
			},
			default: 'medium',
		},

		{
			displayName: 'Resolution',
			name: 'size',
			type: 'options',
			options: [
				{
					name: '256x256',
					value: '256x256',
				},
				{
					name: '512x512',
					value: '512x512',
				},
				{
					name: '1024x1024',
					value: '1024x1024',
				},
			],
			displayOptions: {
				show: {
					'/model': ['dall-e-2'],
				},
			},
			default: '1024x1024',
		},
		{
			displayName: 'Resolution',
			name: 'size',
			type: 'options',
			options: [
				{
					name: '1024x1024',
					value: '1024x1024',
				},
				{
					name: '1792x1024',
					value: '1792x1024',
				},
				{
					name: '1024x1792',
					value: '1024x1792',
				},
			],
			displayOptions: {
				show: {
					'/model': ['dall-e-3'],
				},
			},
			default: '1024x1024',
		},
		{
			displayName: 'Resolution',
			name: 'size',
			type: 'options',
			options: [
				{
					name: '1024x1024',
					value: '1024x1024',
				},
				{
					name: '1024x1536',
					value: '1024x1536',
				},
				{
					name: '1536x1024',
					value: '1536x1024',
				},
			],
			displayOptions: {
				show: {
					'/model': [{ _cnd: { includes: 'gpt-image' } }],
				},
			},
			default: '1024x1024',
		},

		{
			displayName: 'Style',
			name: 'style',
			type: 'options',
			options: [
				{
					name: 'Natural',
					value: 'natural',
					description: 'Produce more natural looking images',
				},
				{
					name: 'Vivid',
					value: 'vivid',
					description: 'Lean towards generating hyper-real and dramatic images',
				},
			],
			displayOptions: {
				show: {
					'/model': ['dall-e-3'],
				},
			},
			default: 'vivid',
		},
		{
			displayName: 'Respond with Image URL(s)',
			name: 'returnImageUrls',
			type: 'boolean',
			default: false,
			description: 'Whether to return image URL(s) instead of binary file(s)',
			displayOptions: {
				hide: {
					'/model': [{ _cnd: { includes: 'gpt-image' } }],
				},
			},
		},
		{
			displayName: 'Put Output in Field',
			name: 'binaryPropertyOutput',
			type: 'string',
			default: 'data',
			hint: 'The name of the output field to put the binary file data in',
			displayOptions: {
				show: {
					returnImageUrls: [false],
				},
			},
		},
	],
};

export const imageGenerateOptionsRLC: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	placeholder: 'Add Option',
	type: 'collection',
	default: {},
	displayOptions: {
		show: {
			'@version': [{ _cnd: { gte: 2.2 } }],
		},
	},
	options: [
		{
			displayName: 'Number of Images',
			name: 'n',
			default: 1,
			description: 'Number of images to generate',
			type: 'number',
			typeOptions: {
				minValue: 1,
				maxValue: 10,
			},
			displayOptions: {
				show: {
					'/modelId': ['dall-e-2'],
				},
			},
		},
		{
			displayName: 'Quality',
			name: 'dalleQuality',
			type: 'options',
			description:
				'The quality of the image that will be generated, HD creates images with finer details and greater consistency across the image',
			options: [
				{
					name: 'HD',
					value: 'hd',
				},
				{
					name: 'Standard',
					value: 'standard',
				},
			],
			displayOptions: {
				show: {
					'/modelId': ['dall-e-3'],
				},
			},
			default: 'standard',
		},
		{
			displayName: 'Quality',
			name: 'quality',
			type: 'options',
			description:
				'The quality of the image that will be generated, High creates images with finer details and greater consistency across the image',
			options: [
				{
					name: 'High',
					value: 'high',
				},
				{
					name: 'Medium',
					value: 'medium',
				},
				{
					name: 'Low',
					value: 'low',
				},
			],
			displayOptions: {
				show: {
					'/modelId': [{ _cnd: { includes: 'gpt-image' } }],
				},
			},
			default: 'medium',
		},

		{
			displayName: 'Resolution',
			name: 'size',
			type: 'options',
			options: [
				{
					name: '256x256',
					value: '256x256',
				},
				{
					name: '512x512',
					value: '512x512',
				},
				{
					name: '1024x1024',
					value: '1024x1024',
				},
			],
			displayOptions: {
				show: {
					'/modelId': ['dall-e-2'],
				},
			},
			default: '1024x1024',
		},
		{
			displayName: 'Resolution',
			name: 'size',
			type: 'options',
			options: [
				{
					name: '1024x1024',
					value: '1024x1024',
				},
				{
					name: '1792x1024',
					value: '1792x1024',
				},
				{
					name: '1024x1792',
					value: '1024x1792',
				},
			],
			displayOptions: {
				show: {
					'/modelId': ['dall-e-3'],
				},
			},
			default: '1024x1024',
		},
		{
			displayName: 'Resolution',
			name: 'size',
			type: 'options',
			options: [
				{
					name: '1024x1024',
					value: '1024x1024',
				},
				{
					name: '1024x1536',
					value: '1024x1536',
				},
				{
					name: '1536x1024',
					value: '1536x1024',
				},
			],
			displayOptions: {
				show: {
					'/modelId': [{ _cnd: { includes: 'gpt-image' } }],
				},
			},
			default: '1024x1024',
		},
		{
			displayName: 'Style',
			name: 'style',
			type: 'options',
			options: [
				{
					name: 'Natural',
					value: 'natural',
					description: 'Produce more natural looking images',
				},
				{
					name: 'Vivid',
					value: 'vivid',
					description: 'Lean towards generating hyper-real and dramatic images',
				},
			],
			displayOptions: {
				show: {
					'/modelId': ['dall-e-3'],
				},
			},
			default: 'vivid',
		},
		{
			displayName: 'Respond with Image URL(s)',
			name: 'returnImageUrls',
			type: 'boolean',
			default: false,
			description: 'Whether to return image URL(s) instead of binary file(s)',
			displayOptions: {
				hide: {
					'/modelId': [{ _cnd: { includes: 'gpt-image' } }],
				},
			},
		},
		{
			displayName: 'Put Output in Field',
			name: 'binaryPropertyOutput',
			type: 'string',
			default: 'data',
			hint: 'The name of the output field to put the binary file data in',
			displayOptions: {
				show: {
					returnImageUrls: [false],
				},
			},
		},
	],
};
