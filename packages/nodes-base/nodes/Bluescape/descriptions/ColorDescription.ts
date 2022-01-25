import { INodePropertyCollection } from 'n8n-workflow';

export const colorFields = [
	// ----------------------------------
	//       Color fields
	// ----------------------------------
	{
		displayName: 'Stroke Color',
		name: 'color',
		values: [
			{
				displayName: 'Alpha',
				name: 'a',
				type: 'number',
				typeOptions: {
					maxValue: 1,
					minValue: 0,
					numberPrecision: 2,
					numberStepSize: 0.1,
				},
				default: 1,
			},
			{
				displayName: 'Red',
				name: 'r',
				type: 'number',
				typeOptions: {
					maxValue: 255,
					minValue: 0,
					numberStepSize: 1,
				},
				default: 0,
			},
			{
				displayName: 'Green',
				name: 'g',
				type: 'number',
				typeOptions: {
					maxValue: 255,
					minValue: 0,
					numberStepSize: 1,
				},
				default: 0,
			},
			{
				displayName: 'Blue',
				name: 'b',
				type: 'number',
				typeOptions: {
					maxValue: 255,
					minValue: 0,
					numberStepSize: 1,
				},
				default: 0,
			},
		],
	},
] as INodePropertyCollection[];

export interface ColorFields {
	color: ColorFields;
	a: number;
	r: number;
	g: number;
	b: number;
}
