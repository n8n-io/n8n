import { INodeProperties } from 'n8n-workflow';

export const translationFields = [
	// ----------------------------------
	//       Translation fields
	// ----------------------------------
	{
		displayName: 'Transformation',
		name: 'transform',
		type: 'fixedCollection',
		placeholder: 'Show Transformation Fields',
		default: 'transfom',
		typeOptions: {
			multipleValues: false,
		},
		description: 'Translation relative to origin',
		options: [
			{
				name: 'translation',
				displayName: 'Translation relative to origin',
				values: [
					{
						displayName: 'X',
						name: 'x',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'Y',
						name: 'y',
						type: 'number',
						default: 0,
					},
				],
			},
		],
	},
] as INodeProperties[];

export interface TranslationFields {
	translation: TranslationFields;
	x: number;
	y: number;
}
