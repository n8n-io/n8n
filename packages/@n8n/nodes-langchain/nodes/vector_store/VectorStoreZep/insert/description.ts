import type { INodeProperties } from 'n8n-workflow';

export const insertOperationDescription: INodeProperties[] = [
	{
		displayName: 'Specify the document to load in the document loader sub-node',
		name: 'notice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Embedding Dimensions',
				name: 'embeddingDimensions',
				type: 'number',
				default: 1536,
				description: 'Whether to allow using characters from the Unicode surrogate blocks',
			},
			{
				displayName: 'Is Auto Embedded',
				name: 'isAutoEmbedded',
				type: 'boolean',
				default: true,
				description: 'Whether to automatically embed documents when they are added',
			},
		],
	},
];
