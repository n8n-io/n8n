import { INodeProperties } from 'n8n-workflow';

import { colorFields, ColorFields } from './ColorDescription';

export const regularShapeStyleFields = [
	// ----------------------------------
	//       Regular Shape Style fields
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
				name: 'regularShape',
				displayName: 'Regular Style Fields',
				values: [
					{
						displayName: 'Kind',
						name: 'kind',
						type: 'options',
						default: '',
						description: 'Shape kind',
						options: [
							{
								name: 'Rectangle',
								value: 'rectangle',
							},
							{
								name: 'Ellipse',
								value: 'ellipse',
							},
							{
								name: 'Triangle-up',
								value: 'triangle-up',
							},
							{
								name: 'Triangle-right',
								value: 'triangle-right',
							},
							{
								name: 'Diamond',
								value: 'diamond',
							},
							{
								name: 'Cylinder',
								value: 'cylinder',
							},
							{
								name: 'Arrow-up',
								value: 'arrow-up',
							},
							{
								name: 'Arrow-right',
								value: 'arrow-right',
							},
							{
								name: 'Arrow-up-dows',
								value: 'arrow-up-down',
							},
							{
								name: 'Arrow-left-right',
								value: 'arrow-left-right',
							},
							{
								name: 'Arrow-all',
								value: 'arrow-all',
							},
							{
								name: 'Star-5',
								value: 'star-5',
							},
							{
								name: 'Hexxgon',
								value: 'hexagon',
							},
							{
								name: 'Octagon',
								value: 'octagon',
							},
						],
					},
					{
						displayName: 'Height',
						name: 'height',
						type: 'number',
						typeOptions: {
							maxValue: 10000,
							minValue: 0,
						},
						default: 600,
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
						displayName: 'Fill',
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
					{
						displayName: 'Stroke',
						name: 'strokeColor',
						placeholder: 'StrokeColor',
						type: 'fixedCollection',
						default: '',
						typeOptions: {
							multipleValues: false,
						},
						description: 'Stroke Color',
						options: colorFields,
					},
					{
						displayName: 'Stroke Width',
						name: 'strokeWidth',
						type: 'number',
						typeOptions: {
							maxValue: 100,
							minValue: 1,
						},
						default: 8,
					},
				],
			},
		],
	},
] as INodeProperties[];

export interface RegularShapeStyleFields {
	kind: string;
	height: number;
	width: number;
	fillColor: ColorFields;
	strokeColor: ColorFields;
	strokeWidth: number;
}
