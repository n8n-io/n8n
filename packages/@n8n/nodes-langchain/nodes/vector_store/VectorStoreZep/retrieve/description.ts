import type { INodeProperties } from 'n8n-workflow';
import { metadataFilterField } from '../../../../utils/sharedFields';

export const retrieveOperationDescription: INodeProperties[] = [
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
			metadataFilterField,
		],
	},
];
