import { INodeProperties } from 'n8n-workflow';

import { colorFields, ColorFields } from './ColorDescription';

export const stickyShapeStyleFields = [
	// ----------------------------------
	//       Sticky Shape Style fields
	// ----------------------------------
	{
		displayName: 'Style',
		name: 'style',
		placeholder: 'Show Style Fields',
		type: 'fixedCollection',
		default: '',
		typeOptions: {
			multipleValues: false,
		},
		description: 'Shape Style',
		options: [
			{
				name: 'stickyShape',
				displayName: 'Style Fields',
				values: [
					{
						displayName: 'Kind',
						name: 'kind',
						type: 'options',
						default: 'sticky-rectangle',
						description: 'Shape kind',
						options: [
							{
								name: 'Sticky Rectangle',
								value: 'sticky-rectangle',
							},
						],
					},
					{
						displayName: 'Width',
						name: 'width',
						type: 'number',
						typeOptions: {
							maxValue: 10000,
							minValue: 0,
						},
						default: 600,
					},
					{
						displayName: 'Fill Color',
						name: 'fillColor',
						placeholder: 'FillColor',
						type: 'fixedCollection',
						default: '',
						typeOptions: {
							multipleValues: false,
						},
						description: 'Fill Color',
						options: colorFields,
					},
				],
			},
		],
	},
] as INodeProperties[];

export interface StickyShapeStyleFields {
	kind: string;
	width: number;
	fillColor: ColorFields;
}
