import { INodeProperties } from 'n8n-workflow';

import { TranslationFields, translationFields } from './TranslationInputDescription';

import { regularShapeStyleFields, RegularShapeStyleFields } from './RegularShapeStyleDescription';
import { stickyShapeStyleFields, StickyShapeStyleFields } from './StickyShapeStyleDescription';

export const shapeFields = [
	// ----------------------------------
	//       Shape fields
	// ----------------------------------

	{
		displayName: 'Sticky',
		name: 'sticky',
		type: 'boolean',
		default: false,
		description: 'Is shape style sticky.',
		displayOptions: {
			show: {
				content: ['elements'],
				operation: ['update', 'create'],
				elementType: ['shape'],
			},
		},
	},
	// {
	// 	displayName: 'Shape Fields',
	// 	name: 'regularShapeFields',
	// 	type: 'collection',
	// 	placeholder: 'Add fields',
	// 	default: {},
	// 	options: [
	// 		{
	// 			displayName: 'Mirror Vretical',
	// 			name: 'mirrorX',
	// 			type: 'boolean',
	// 			default: '',
	// 			description: 'Text on the shape.',
	// 		},
	// 		{
	// 			displayName: 'Mirror Horizontal',
	// 			name: 'mirrorY',
	// 			type: 'boolean',
	// 			default: '',
	// 			description: 'Text on the shape.',
	// 		},
	// 		{
	// 			displayName: 'Text',
	// 			name: 'text',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'Text on the shape.',
	// 		},
	// 		{
	// 			displayName: 'Surface',
	// 			name: 'surface',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'Surface',
	// 		},
	// 		{
	// 			displayName: 'Traits(json)',
	// 			name: 'traits',
	// 			type: 'json',
	// 			default: '',
	// 			description: 'The style for canvas.',
	// 		},
	// 		...shapeStyleFields,
	// 		...translationFields,
	// 	],
	// },
	{
		displayName: 'Shape Fields',
		name: 'shapeFields',
		type: 'collection',
		placeholder: 'Add fields',
		default: {},
		options: [
			{
				displayName: 'Mirror Vertical',
				name: 'mirrorX',
				type: 'boolean',
				default: '',
				description: 'Text on the shape.',
			},
			{
				displayName: 'Mirror Horizontal',
				name: 'mirrorY',
				type: 'boolean',
				default: '',
				description: 'Text on the shape.',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				description: 'Text on the shape.',
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
			...regularShapeStyleFields,
			...translationFields,
		],
		displayOptions: {
			show: {
				sticky: [false],
			},
		},
	},
	{
		displayName: 'Sticky Shape Fields',
		name: 'shapeFields',
		type: 'collection',
		placeholder: 'Add fields',
		default: {},
		options: [
			{
				displayName: 'Mirror Vretical',
				name: 'mirrorX',
				type: 'boolean',
				default: '',
				description: 'Text on the shape.',
			},
			{
				displayName: 'Mirror Horizontal',
				name: 'mirrorY',
				type: 'boolean',
				default: '',
				description: 'Text on the shape.',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				description: 'Text on the shape.',
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
			...stickyShapeStyleFields,
			...translationFields,
		],
		displayOptions: {
			show: {
				sticky: [true],
			},
		},
	},
] as INodeProperties[];

export interface ShapeCreateUpdateFields {
	text: string;
	mirrorX: boolean;
	mirrorY: boolean;
	surface: string;
	style: ShapeStyleFields;
	traits: Object;
	transform: TranslationFields;
}

export interface ShapeStyleFields {
	regularShape: RegularShapeStyleFields;
	stickyShape: StickyShapeStyleFields;
}
