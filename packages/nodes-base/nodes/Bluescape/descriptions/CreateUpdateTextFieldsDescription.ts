import { INodeProperties } from 'n8n-workflow';

export const textFields = [
	// ----------------------------------
	//       Text fields
	// ----------------------------------
	{
		displayName: 'Text Fields',
		name: 'textFields',
		type: 'collection',
		placeholder: 'Add fields',
		default: {},
		options: [
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				description: 'Text',
			},
			{
				displayName: 'Blocks(json)',
				name: 'blocks',
				type: 'json',
				default: '',
				description: 'Input union of block text content input.',
			},
			{
				displayName: 'Style(json)',
				name: 'style',
				type: 'json',
				default: '',
				description: 'The style for canvas.',
			},
			{
				displayName: 'Surface',
				name: 'surface',
				type: 'string',
				default: '',
				description: 'Surface',
			},
			{
				displayName: 'Traits(json)',
				name: 'traits',
				type: 'json',
				default: '',
				description: 'The style for canvas.',
			},
			{
				displayName: 'Transform(json)',
				name: 'transform',
				type: 'json',
				default: '',
				description: 'Update translation relative to origin.',
			},
		],
		displayOptions: {
			show: {
				content: ['elements'],
				operation: ['update', 'create'],
				elementType: ['text'],
			},
		},
	},
] as INodeProperties[];

export interface TextCreateUpdateFields {
	text: string;
	blocks: Object;
	surface: string;
	style: Object;
	traits: Object;
	transform: Object;
}
