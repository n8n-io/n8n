import { INodeProperties } from 'n8n-workflow';

export const canvasFields = [
	// ----------------------------------
	//       Canvas fields
	// ----------------------------------
	{
		displayName: 'Canvas Fields',
		name: 'canvasFields',
		type: 'collection',
		placeholder: 'Add fields',
		default: {},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Canvas Name',
			},
			{
				displayName: 'Style(json)',
				name: 'style',
				type: 'json',
				default: '',
				description: 'The style for canvas.',
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
				elementType: ['canvas'],
			},
		},
	},
] as INodeProperties[];

export interface CanvasCreateUpdateFields {
	name: string;
	style: Object;
	traits: Object;
	transform: Object;
}
