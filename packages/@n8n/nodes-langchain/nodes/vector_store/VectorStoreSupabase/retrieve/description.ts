import type { INodeProperties } from 'n8n-workflow';
import { metadataFilterField } from '../../../../utils/sharedFields';

export const retrieveOperationDescription: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [metadataFilterField],
		displayOptions: {
			show: {
				operation: ['retrieve'],
			},
		},
	},
];
