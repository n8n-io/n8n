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
		displayName: 'Values',
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
